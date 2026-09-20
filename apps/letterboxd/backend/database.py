"""
Module de gestion de la base de données SQLite.
Fournit : connexion, context manager, CRUD générique, backup et init.
"""
import sqlite3
import json
import os
import logging
from contextlib import contextmanager
from datetime import datetime
from typing import Any, Optional

logger = logging.getLogger(__name__)

DB_DIR = os.getenv("DATA_DIR", os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(DB_DIR, "app.db")
BACKUP_DIR = os.path.join(DB_DIR, "backups")


def get_db() -> sqlite3.Connection:
    """Ouvre une connexion SQLite brute (à utiliser via get_db_ctx)."""
    conn = sqlite3.connect(DB_PATH, timeout=30.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA busy_timeout = 30000")
    return conn


@contextmanager
def get_db_ctx():
    """
    Context manager SQLite.
    Garantit la fermeture de la connexion même en cas d'exception.

    Usage :
        with get_db_ctx() as conn:
            conn.execute(...)
    """
    conn = get_db()
    try:
        yield conn
    finally:
        conn.close()


# ─── CRUD générique ─────────────────────────────────────────────────────────

def crud_get_all(table: str, sort_key: Optional[str] = None, sort_reverse: bool = True) -> list:
    """Récupère tous les items d'une table JSON (colonnes: id, data, updated_at)."""
    with get_db_ctx() as conn:
        rows = conn.execute(f"SELECT data FROM {table}").fetchall()
    items = []
    for r in rows:
        try:
            items.append(json.loads(r["data"]))
        except Exception:
            pass
    if sort_key:
        items.sort(key=lambda x: x.get(sort_key, ""), reverse=sort_reverse)
    return items


def crud_upsert(table: str, item_id: str, payload: Any) -> dict:
    """Insère ou met à jour un item dans une table JSON."""
    data_str = json.dumps(payload)
    with get_db_ctx() as conn:
        conn.execute(
            f"""
            INSERT INTO {table} (id, data, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(id) DO UPDATE SET data=excluded.data, updated_at=CURRENT_TIMESTAMP
            """,
            (item_id, data_str),
        )
        conn.commit()
    return {"success": True, "id": item_id}


def crud_delete(table: str, item_id: str) -> dict:
    """Supprime un item d'une table JSON."""
    with get_db_ctx() as conn:
        conn.execute(f"DELETE FROM {table} WHERE id = ?", (item_id,))
        conn.commit()
    return {"success": True, "id": item_id}


# ─── Backup ──────────────────────────────────────────────────────────────────

def create_db_backup(tag: str = "auto") -> Optional[str]:
    """Effectue un snapshot à chaud (hot backup) transactionnel de la base SQLite."""
    try:
        if not os.path.exists(DB_PATH):
            return None
        os.makedirs(BACKUP_DIR, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_filename = f"app_{tag}_{timestamp}.db"
        backup_filepath = os.path.join(BACKUP_DIR, backup_filename)

        source_conn = sqlite3.connect(DB_PATH, timeout=30.0)
        dest_conn = sqlite3.connect(backup_filepath)
        with dest_conn:
            source_conn.backup(dest_conn)
        dest_conn.close()
        source_conn.close()

        # Rotation automatique : garder les 10 dernières sauvegardes
        backups = sorted(
            [os.path.join(BACKUP_DIR, f) for f in os.listdir(BACKUP_DIR) if f.endswith(".db")],
            key=os.path.getmtime,
        )
        while len(backups) > 10:
            oldest = backups.pop(0)
            try:
                os.remove(oldest)
                logger.info(f"Ancienne sauvegarde supprimée : {oldest}")
            except Exception as e:
                logger.warning(f"Impossible de supprimer {oldest}: {e}")

        logger.info(f"Sauvegarde SQLite créée : {backup_filename}")
        return backup_filename
    except Exception as e:
        logger.error(f"Échec de la sauvegarde SQLite : {e}")
        return None


# ─── Init ────────────────────────────────────────────────────────────────────

def init_db():
    """Initialise le schéma SQLite et les données par défaut."""
    os.makedirs(DB_DIR, exist_ok=True)
    with get_db_ctx() as conn:
        cursor = conn.cursor()
        cursor.execute("PRAGMA journal_mode=WAL;")
        cursor.execute("PRAGMA synchronous=NORMAL;")
        cursor.execute("PRAGMA busy_timeout=30000;")

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS medias (
                id TEXT PRIMARY KEY,
                data TEXT NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS notes (
                id TEXT PRIMARY KEY,
                data TEXT NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS genealogy (
                id TEXT PRIMARY KEY,
                data TEXT NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS library_items (
                id TEXT PRIMARY KEY,
                data TEXT NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS electricity_settings (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                pdl TEXT DEFAULT '',
                token TEXT DEFAULT '',
                kwh_price REAL DEFAULT 0.2516,
                subscription_price REAL DEFAULT 12.50,
                target_monthly_budget REAL DEFAULT 60.00,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS electricity_daily_cache (
                pdl TEXT NOT NULL,
                date TEXT NOT NULL,
                value_wh REAL NOT NULL,
                max_power_va REAL DEFAULT 0,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (pdl, date)
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS weather_settings (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                gemini_api_key TEXT DEFAULT '',
                default_city TEXT DEFAULT 'Paris',
                default_lat REAL DEFAULT 48.8566,
                default_lon REAL DEFAULT 2.3522,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS access_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                device_cn TEXT,
                ip TEXT,
                method TEXT,
                path TEXT,
                status_code INTEGER,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS managed_proxies (
                id TEXT PRIMARY KEY,
                domain TEXT NOT NULL,
                label TEXT NOT NULL,
                is_protected INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS ai_model_settings (
                service_id TEXT PRIMARY KEY,
                model_name TEXT NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cursor.execute("DROP TABLE IF EXISTS plug_settings")

        # Données par défaut
        cursor.execute("""
            INSERT OR IGNORE INTO managed_proxies (id, domain, label, is_protected)
            VALUES
            ('vw', 'vw.vicopetit.dedyn.io', 'VicozWorld', 1),
            ('dozzle', 'dozzle.vicopetit.dedyn.io', 'Logs Docker', 0),
            ('casa', 'casa.vicopetit.dedyn.io', 'CasaOS', 0),
            ('ng', 'ng.vicopetit.dedyn.io', 'Proxy Manager', 0)
        """)
        cursor.execute("""
            INSERT OR IGNORE INTO electricity_settings (id, pdl, token, kwh_price, subscription_price, target_monthly_budget)
            VALUES (1, '', '', 0.2516, 12.50, 60.00)
        """)
        cursor.execute("""
            INSERT OR IGNORE INTO weather_settings (id, gemini_api_key, default_city, default_lat, default_lon)
            VALUES (1, '', 'Paris', 48.8566, 2.3522)
        """)

        # Nettoyage des colonnes secrètes gérées via variables d'env
        cursor.execute("UPDATE electricity_settings SET pdl = '', token = '' WHERE id = 1")
        cursor.execute("UPDATE weather_settings SET gemini_api_key = '' WHERE id = 1")
        conn.commit()

    try:
        create_db_backup("startup")
    except Exception as e:
        logger.warning(f"Sauvegarde démarrage ignorée: {e}")
