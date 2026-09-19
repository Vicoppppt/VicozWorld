from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import subprocess
import shutil
import secrets
import logging
import sqlite3
import json
import os
import urllib.request
import calendar
import re
import time
import ssl
import threading
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime
from datetime import datetime, timedelta, date
from typing import Any, Optional, List, Dict
from cryptography.fernet import Fernet, InvalidToken

try:
    from woob.core import Woob
    from woob.capabilities.bank import CapBank
except ImportError:
    Woob = None

# Configuration du logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Letterboxd Local API", description="Micro-service local avec SQLite & Woob Bank.")

# Config DB SQLite
DB_DIR = os.getenv("DATA_DIR", os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(DB_DIR, "app.db")
BACKUP_DIR = os.path.join(DB_DIR, "backups")
CERTS_DIR = os.getenv("CERTS_DIR", os.path.join(DB_DIR, "certs"))

# Initialisation du chiffrement
ENCRYPTION_KEY = os.getenv("DB_ENCRYPTION_KEY", "").strip()
cipher = Fernet(ENCRYPTION_KEY) if ENCRYPTION_KEY else None

def encrypt_value(value: str) -> str:
    """Chiffre une valeur si la clé maître est configurée."""
    if not cipher or not value:
        return value
    if value.startswith("gAAAAA"):  # Déjà chiffré
        return value
    return cipher.encrypt(value.encode()).decode()

def decrypt_value(value: str) -> str:
    """Déchiffre une valeur si la clé maître est configurée."""
    if not cipher or not value or not value.startswith("gAAAAA"):
        return value
    try:
        return cipher.decrypt(value.encode()).decode()
    except InvalidToken:
        logger.error("Impossible de déchiffrer la valeur : clé maître invalide ou token corrompu.")
        return ""

def get_db():
    conn = sqlite3.connect(DB_PATH, timeout=30.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA busy_timeout = 30000")
    return conn


def secure_woob_permissions():
    """Sécurise les permissions des fichiers Woob pour protéger les identifiants bancaires."""
    possible_paths = [
        os.path.expanduser("~/.config/woob"),
        os.path.join(DB_DIR, "woob-config")
    ]
    for p in possible_paths:
        if os.path.exists(p):
            try:
                os.chmod(p, 0o700)
                backends_file = os.path.join(p, "backends")
                if os.path.exists(backends_file):
                    os.chmod(backends_file, 0o600)
            except Exception as e:
                logger.debug(f"Permissions non modifiables sur {p}: {e}")

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
            key=os.path.getmtime
        )
        while len(backups) > 10:
            oldest = backups.pop(0)
            try:
                os.remove(oldest)
                logger.info(f"Ancienne sauvegarde supprimée : {oldest}")
            except Exception as e:
                logger.warning(f"Impossible de supprimer {oldest}: {e}")
                
        logger.info(f"Sauvegarde SQLite créée avec succès : {backup_filename}")
        return backup_filename
    except Exception as e:
        logger.error(f"Échec de la sauvegarde SQLite : {e}")
        return None

def init_db():
    os.makedirs(DB_DIR, exist_ok=True)
    conn = get_db()
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
        INSERT OR IGNORE INTO managed_proxies (id, domain, label, is_protected)
        VALUES 
        ('vw', 'vw.vicopetit.dedyn.io', 'VicozWorld', 1),
        ('dozzle', 'dozzle.vicopetit.dedyn.io', 'Logs Docker', 0),
        ('casa', 'casa.vicopetit.dedyn.io', 'CasaOS', 0),
        ('ng', 'ng.vicopetit.dedyn.io', 'Proxy Manager', 0)
    """)
    default_enedis_pdl = encrypt_value(os.getenv("ENEDIS_PDL", ""))
    default_enedis_token = encrypt_value(os.getenv("ENEDIS_TOKEN", ""))
    cursor.execute("""
        INSERT OR IGNORE INTO electricity_settings (id, pdl, token, kwh_price, subscription_price, target_monthly_budget)
        VALUES (1, ?, ?, 0.2516, 12.50, 60.00)
    """, (default_enedis_pdl, default_enedis_token))
    
    default_gemini = encrypt_value(os.getenv("GEMINI_API_KEY", ""))
    cursor.execute("""
        INSERT OR IGNORE INTO weather_settings (id, gemini_api_key, default_city, default_lat, default_lon)
        VALUES (1, ?, 'Paris', 48.8566, 2.3522)
    """, (default_gemini,))
    
    # Auto-migration : chiffrer les clés existantes en clair si la clé maître est dispo
    if cipher:
        cursor.execute("SELECT pdl, token FROM electricity_settings WHERE id = 1")
        elec_row = cursor.fetchone()
        if elec_row:
            pdl = elec_row["pdl"]
            token = elec_row["token"]
            updated = False
            if pdl and not pdl.startswith("gAAAAA"):
                pdl = encrypt_value(pdl)
                updated = True
            if token and not token.startswith("gAAAAA"):
                token = encrypt_value(token)
                updated = True
            if updated:
                cursor.execute("UPDATE electricity_settings SET pdl = ?, token = ? WHERE id = 1", (pdl, token))
                
        cursor.execute("SELECT gemini_api_key FROM weather_settings WHERE id = 1")
        weather_row = cursor.fetchone()
        if weather_row:
            gemini_key = weather_row["gemini_api_key"]
            if gemini_key and not gemini_key.startswith("gAAAAA"):
                gemini_key = encrypt_value(gemini_key)
                cursor.execute("UPDATE weather_settings SET gemini_api_key = ? WHERE id = 1", (gemini_key,))
                
    conn.commit()
    conn.close()

    secure_woob_permissions()
    try:
        create_db_backup("startup")
    except Exception as e:
        logger.warning(f"Sauvegarde démarrage ignorée: {e}")

init_db()

# Middleware CORS : origines autorisées configurées via env var
# Par défaut : domaine de production uniquement.
# Exemple .env : ALLOWED_ORIGINS=https://vw.vicopetit.dedyn.io,http://localhost:3000
_raw_origins = os.getenv("ALLOWED_ORIGINS", "https://vw.vicopetit.dedyn.io")
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

def extract_cn(raw_dn: str) -> Optional[str]:
    """Extrait proprement le Common Name (CN) d'un Subject DN X.509."""
    if not raw_dn:
        return None
    # Gère formats: /C=FR/O=VicozWorld/CN=Victor-PC ou CN=Victor-PC,O=VicozWorld
    match = re.search(r"CN=([^/,]+)", raw_dn)
    if match:
        return match.group(1).strip()
    return raw_dn.strip() if raw_dn else None

# Système OTP Invité Dynamique (rotation 2 minutes)
current_guest_otp = {
    "code": None,
    "expires_at": 0
}

def verify_victor_admin(request: Request):
    """Vérifie que la requête provient bien d'un appareil officiel de Victor avec un certificat valide."""
    device_cn = getattr(request.state, "device_cn", "")
    is_guest = getattr(request.state, "is_guest", True)
    
    if is_guest or not device_cn or "victor" not in device_cn.lower():
        raise HTTPException(
            status_code=403, 
            detail="Accès interdit : Cette fonction d'administration est strictement réservée à Victor."
        )

# Middleware mTLS & Audit Log
@app.middleware("http")
async def mtls_and_audit_middleware(request: Request, call_next):
    client_cn = request.headers.get("x-client-cert-cn")
    if not client_cn:
        raw_dn = request.headers.get("x-client-cert-dn", "")
        client_cn = extract_cn(raw_dn)
        
    # 1. Vérification prioritaire du certificat matériel client mTLS
    cert_status = request.headers.get("x-client-cert-status", "").upper()
    # SÉCURITÉ FIX: Exiger strictement SUCCESS. Un statut vide "" signifie pas de certificat vérifié par le reverse proxy.
    has_hardware_cert = bool(client_cn and client_cn not in ["Anonyme / Non vérifié", "Invité Démo"] and cert_status == "SUCCESS")

    now = time.time()
    guest_param = request.query_params.get("guest")
    guest_cookie = request.cookies.get("vicoz_guest_session")
    
    is_guest = False
    if has_hardware_cert and client_cn:
        cn_lower = client_cn.lower()
        if "invité" in cn_lower or "guest" in cn_lower:
            is_guest = True
        else:
            is_guest = False
    elif guest_param and current_guest_otp.get("code") and guest_param == current_guest_otp.get("code"):
        if now < current_guest_otp.get("expires_at", 0):
            client_cn = "Invité Démo (Code OTP)"
            is_guest = True
        else:
            client_cn = "Anonyme / Non vérifié"
            is_guest = True
    elif guest_cookie == "allowed":
        client_cn = "Invité Démo"
        is_guest = True
    else:
        client_cn = "Anonyme / Non vérifié"
        is_guest = True
            
    request.state.device_cn = client_cn or "Anonyme / Non vérifié"
    request.state.is_guest = is_guest
    
    # Pare-feu strict Invité : Blocage absolu des outils et données privées
    if is_guest:
        path = request.url.path
        forbidden_prefixes = [
            "/api/balances",
            "/api/notes",
            "/api/genealogy",
            "/api/electricity",
            "/api/admin",
            "/api/hub/permissions",
            "/api/hub/urls",
            "/api/hub/battery",
        ]
        if any(path.startswith(prefix) for prefix in forbidden_prefixes):
            return JSONResponse(
                status_code=403,
                content={"detail": "Accès refusé : les données personnelles et outils sont inaccessibles en mode invité."}
            )
        # Interdire modification de la cinémathèque et bibliothèque en mode invité
        if (path.startswith("/api/medias") or path.startswith("/api/library")) and request.method in ["POST", "PUT", "DELETE"]:
            return JSONResponse(
                status_code=403,
                content={"detail": "Accès refusé : la collection est en lecture seule pour les invités."}
            )
    
    response = await call_next(request)
    
    if is_guest and guest_param:
        response.set_cookie(
            key="vicoz_guest_session",
            value="allowed",
            max_age=1800, # 30 minutes de session démo
            httponly=True,
            secure=True,
            samesite="lax"
        )
    elif not is_guest and (guest_cookie or guest_param):
        response.delete_cookie("vicoz_guest_session")
        response.delete_cookie("vw_guest")
    
    # Enregistrer dans l'audit log pour les routes API significatives
    path = request.url.path
    if path.startswith("/api") and path not in [
        "/api/health", "/api/hub/battery", "/api/audit/page-view", 
        "/api/admin/guest-code/status", "/api/auth/device-info"
    ]:
        try:
            forwarded = request.headers.get("x-forwarded-for")
            client_ip = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else "unknown")
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO access_logs (device_cn, ip, method, path, status_code)
                VALUES (?, ?, ?, ?, ?)
            """, (request.state.device_cn, client_ip, request.method, path, response.status_code))
            conn.commit()
            conn.close()
        except Exception as e:
            logger.debug(f"Audit log error: {e}")
            
    return response

@app.post("/api/admin/guest-code/generate")
def generate_guest_code(request: Request):
    """Génère un code d'accès invité aléatoire à 6 chiffres valable exactement 2 minutes."""
    verify_victor_admin(request)
    code = f"{secrets.randbelow(900000) + 100000}"
    current_guest_otp["code"] = code
    current_guest_otp["expires_at"] = time.time() + 120 # 120 secondes
    return {
        "code": code,
        "expires_in_seconds": 120,
        "guest_url": f"https://vw.vicopetit.dedyn.io/?guest={code}"
    }

@app.get("/api/admin/guest-code/status")
def get_guest_code_status(request: Request):
    """Vérifie le code invité actif et le temps restant (réservé à Victor)."""
    verify_victor_admin(request)
    now = time.time()
    remaining = max(0, int(current_guest_otp["expires_at"] - now))
    if remaining <= 0:
        current_guest_otp["code"] = None
    return {
        "active": current_guest_otp["code"] is not None and remaining > 0,
        "code": current_guest_otp["code"] if remaining > 0 else None,
        "remaining_seconds": remaining,
        "guest_url": f"https://vw.vicopetit.dedyn.io/?guest={current_guest_otp['code']}" if remaining > 0 else None
    }

@app.post("/api/admin/guest-code/revoke")
def revoke_guest_code(request: Request):
    """Révoque instantanément le code invité actif."""
    verify_victor_admin(request)
    current_guest_otp["code"] = None
    current_guest_otp["expires_at"] = 0
    return {"success": True, "message": "Code invité révoqué avec succès."}

class PageViewRequest(BaseModel):
    page: str
    path: str

@app.post("/api/audit/page-view")
def log_page_view(payload: PageViewRequest, request: Request):
    """Enregistre la visite d'une page dans le journal d'audit."""
    device_cn = getattr(request.state, "device_cn", "Anonyme / Non vérifié")
    try:
        forwarded = request.headers.get("x-forwarded-for")
        client_ip = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else "unknown")
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO access_logs (device_cn, ip, method, path, status_code)
            VALUES (?, ?, 'PAGE', ?, 200)
        """, (device_cn, client_ip, f"Visite : {payload.page} ({payload.path})"))
        conn.commit()
        conn.close()
        return {"success": True}
    except Exception as e:
        logger.debug(f"Page view log error: {e}")
        return {"success": False}

# --- ENDPOINTS HEALTH & MAINTENANCE ---
@app.get("/api/health")
def health_check():
    """Vérification de santé de l'API et de la base de données SQLite."""
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        cursor.fetchone()
        conn.close()
        return {
            "status": "healthy",
            "database": "connected",
            "wal_mode": True,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Health check échoué: {e}")
        raise HTTPException(status_code=503, detail=f"Base de données inaccessible: {str(e)}")

@app.get("/api/auth/device-info")
def get_device_info(request: Request):
    """Retourne les informations de l'équipement connecté via certificat client mTLS."""
    device_cn = getattr(request.state, "device_cn", "Inconnu")
    status = request.headers.get("x-client-cert-status", "")
    is_guest = getattr(request.state, "is_guest", False) or ("invité" in device_cn.lower()) or ("guest" in device_cn.lower())
    
    if is_guest:
        return {
            "authenticated": False,
            "device_cn": device_cn,
            "verified": False,
            "is_guest": True,
            "profile_hint": "invite",
            "serial": None
        }
        
    verified = (status == "SUCCESS") or (device_cn and device_cn != "Anonyme / Non vérifié")
    profile_hint = "victor"
    cn_lower = device_cn.lower()
    if "claire" in cn_lower or "maman" in cn_lower:
        profile_hint = "claire"
        
    return {
        "authenticated": verified,
        "device_cn": device_cn,
        "verified": verified,
        "is_guest": False,
        "profile_hint": profile_hint,
        "serial": request.headers.get("x-client-cert-serial", None)
    }

@app.get("/api/admin/access-logs")
def get_access_logs(request: Request, limit: int = 50):
    """Historique des connexions et appareils ayant accédé à l'API (réservé à Victor)."""
    verify_victor_admin(request)
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, device_cn, ip, method, path, status_code, timestamp
            FROM access_logs
            ORDER BY id DESC
            LIMIT ?
        """, (limit,))
        rows = cursor.fetchall()
        conn.close()
        return {"logs": [dict(r) for r in rows]}
    except Exception as e:
        logger.error(f"Erreur lecture access_logs: {e}")
        return {"logs": []}

@app.post("/api/admin/backup")
def trigger_backup(request: Request):
    """Déclenche un snapshot de sauvegarde à chaud de la base de données (réservé à Victor)."""
    verify_victor_admin(request)
    filename = create_db_backup("manual")
    if not filename:
        raise HTTPException(status_code=500, detail="Échec de la sauvegarde.")
    return {"status": "ok", "backup_file": filename, "message": "Sauvegarde créée avec succès."}

@app.get("/api/admin/backups")
def list_backups(request: Request):
    """Liste les sauvegardes existantes."""
    verify_victor_admin(request)

    if not os.path.exists(BACKUP_DIR):
        return {"backups": []}
    files = []
    for f in os.listdir(BACKUP_DIR):
        if f.endswith(".db"):
            fp = os.path.join(BACKUP_DIR, f)
            files.append({
                "filename": f,
                "size_bytes": os.path.getsize(fp),
                "modified": datetime.fromtimestamp(os.path.getmtime(fp)).isoformat()
            })
    files.sort(key=lambda x: x["modified"], reverse=True)
    return {"backups": files}

# --- ENDPOINTS GESTION DES CERTIFICATS MTLS ---
class CertCreateRequest(BaseModel):
    device_name: str
    password: str
    email: Optional[str] = None

@app.get("/api/admin/certs")
def list_certificates(request: Request):
    """Liste les appareils certifiés et l'état de la CA racine (Réservé à Victor)."""
    verify_victor_admin(request)
    ca_crt = os.path.join(CERTS_DIR, "ca.crt")
    ca_exists = os.path.exists(ca_crt)
    certs = []
    
    if os.path.exists(CERTS_DIR):
        for entry in os.listdir(CERTS_DIR):
            dev_path = os.path.join(CERTS_DIR, entry)
            if os.path.isdir(dev_path):
                crt_file = os.path.join(dev_path, f"{entry}.crt")
                p12_file = os.path.join(dev_path, f"{entry}.p12")
                if os.path.exists(crt_file):
                    expires_at = "Valide (5 ans)"
                    try:
                        res = subprocess.run(
                            ["openssl", "x509", "-enddate", "-noout", "-in", crt_file],
                            capture_output=True, text=True, timeout=5
                        )
                        if res.returncode == 0 and "notAfter=" in res.stdout:
                            expires_at = res.stdout.split("notAfter=")[1].strip()
                    except Exception:
                        pass
                        
                    certs.append({
                        "name": entry,
                        "has_p12": os.path.exists(p12_file),
                        "expires_at": expires_at,
                        "created_at": datetime.fromtimestamp(os.path.getmtime(crt_file)).strftime("%Y-%m-%d %H:%M"),
                        "download_url": f"/api/admin/certs/download/{entry}"
                    })
    certs.sort(key=lambda x: x["created_at"], reverse=True)
    return {
        "ca_exists": ca_exists,
        "certs": certs
    }

@app.post("/api/admin/certs/generate")
def generate_certificate(payload: CertCreateRequest, request: Request):
    """Génère un nouveau certificat client mTLS (.p12) avec mot de passe et envoi email optionnel."""
    verify_victor_admin(request)
    device = payload.device_name.strip().replace(" ", "-")
    # Sécurité : n'autoriser que les caractères alphanumériques, tirets et underscores
    device = re.sub(r'[^a-zA-Z0-9\-_]', '', device)
    if not device or len(device) > 64:
        raise HTTPException(status_code=400, detail="Veuillez spécifier un nom d'appareil valide (lettres, chiffres, tirets uniquement).")
        
    password = payload.password or "VicozWorld2026!"
    email = payload.email.strip() if payload.email else None
    
    os.makedirs(CERTS_DIR, exist_ok=True)
    ca_crt = os.path.join(CERTS_DIR, "ca.crt")
    ca_key = os.path.join(CERTS_DIR, "ca.key")
    
    # 1. Créer la CA si inexistante
    if not os.path.exists(ca_crt) or not os.path.exists(ca_key):
        try:
            subprocess.run(["openssl", "genrsa", "-out", ca_key, "4096"], check=True, timeout=15)
            os.chmod(ca_key, 0o600)
            subprocess.run([
                "openssl", "req", "-x509", "-new", "-nodes", "-key", ca_key, "-sha256", "-days", "3650",
                "-out", ca_crt, "-subj", "/C=FR/ST=IDF/O=VicozWorld/OU=Security/CN=VicozWorld-Root-CA"
            ], check=True, timeout=15)
        except Exception as e:
            logger.error(f"Erreur création CA: {e}")
            raise HTTPException(status_code=500, detail=f"Échec initialisation CA: {e}")

    # 2. Créer le certificat de l'appareil
    device_dir = os.path.join(CERTS_DIR, device)
    os.makedirs(device_dir, exist_ok=True)
    
    dev_key = os.path.join(device_dir, f"{device}.key")
    dev_csr = os.path.join(device_dir, f"{device}.csr")
    dev_crt = os.path.join(device_dir, f"{device}.crt")
    dev_ext = os.path.join(device_dir, f"{device}.ext")
    dev_p12 = os.path.join(device_dir, f"{device}.p12")
    
    try:
        subprocess.run(["openssl", "genrsa", "-out", dev_key, "2048"], check=True, timeout=10)
        os.chmod(dev_key, 0o600)
        
        subprocess.run([
            "openssl", "req", "-new", "-key", dev_key, "-out", dev_csr,
            "-subj", f"/C=FR/O=VicozWorld/CN={device}"
        ], check=True, timeout=10)
        
        with open(dev_ext, "w") as f:
            f.write("basicConstraints = CA:FALSE\nnsCertType = client\nkeyUsage = digitalSignature, keyEncipherment\nextendedKeyUsage = clientAuth\n")
            
        subprocess.run([
            "openssl", "x509", "-req", "-in", dev_csr, "-CA", ca_crt, "-CAkey", ca_key,
            "-CAcreateserial", "-out", dev_crt, "-days", "1825", "-sha256", "-extfile", dev_ext
        ], check=True, timeout=15)
        
        subprocess.run([
            "openssl", "pkcs12", "-export", "-out", dev_p12,
            "-inkey", dev_key, "-in", dev_crt, "-certfile", ca_crt,
            "-name", device, "-passout", f"pass:{password}"
        ], check=True, timeout=15)
        
        if os.path.exists(dev_csr): os.remove(dev_csr)
        if os.path.exists(dev_ext): os.remove(dev_ext)
        
    except Exception as e:
        logger.error(f"Erreur création certificat client {device}: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur création certificat: {e}")

    # 3. Envoi par email optionnel
    email_sent = False
    email_error = None
    if email:
        sender = os.getenv("GMAIL_EMAIL") or os.getenv("GMAIL_USER")
        sender_password = os.getenv("GMAIL_PASSWORD") or os.getenv("GMAIL_APP_PASSWORD")
        if sender and sender_password:
            sender = sender.strip()
            # Nettoyer les espaces si copié depuis Google (format abcd efgh ijkl mnop)
            sender_password = sender_password.replace(" ", "").strip()
            try:
                import smtplib
                from email.message import EmailMessage
                msg = EmailMessage()
                msg['Subject'] = f"🔒 Votre Badge de Sécurité VicozWorld ({device})"
                msg['From'] = sender
                msg['To'] = email
                msg.set_content(f"""Bonjour,\n\nVoici votre certificat de sécurité personnel pour vous connecter à VicozWorld.\n\n📱 Appareil : {device}\n🔑 Mot de passe de déverrouillage : {password}\n\nPour l'installer :\n1. Téléchargez le fichier joint ({device}.p12).\n2. Cliquez dessus pour lancer l'installation sur votre appareil.\n3. Entrez le mot de passe indiqué ci-dessus.\n\nUne fois installé, vous pourrez accéder en toute sécurité à https://vw.vicopetit.dedyn.io/ !\n""")
                with open(dev_p12, 'rb') as f:
                    msg.add_attachment(f.read(), maintype='application', subtype='x-pkcs12', filename=f"{device}.p12")
                with smtplib.SMTP_SSL('smtp.gmail.com', 465, timeout=15) as server:
                    server.login(sender, sender_password)
                    server.send_message(msg)
                email_sent = True
                logger.info(f"Email avec certificat {device}.p12 envoyé avec succès à {email}")
            except Exception as e:
                email_error = str(e)
                logger.error(f"Erreur envoi email certificat: {e}")
        else:
            email_error = "Identifiants GMAIL_EMAIL / GMAIL_PASSWORD non trouvés dans l'environnement."
            logger.warning(email_error)

    return {
        "success": True,
        "name": device,
        "download_url": f"/api/admin/certs/download/{device}",
        "email_sent": email_sent,
        "email_error": email_error,
        "message": f"Certificat client pour {device} généré avec succès !"
    }

@app.get("/api/admin/certs/download/{device_name}")
def download_certificate(device_name: str, request: Request):
    """Télécharge le fichier .p12 d'un appareil (réservé à Victor)."""
    verify_victor_admin(request)
    # Sécurité : whitelist de caractères + vérification realpath
    device = re.sub(r'[^a-zA-Z0-9\-_]', '', device_name.strip().replace(" ", "-"))
    if not device or len(device) > 64:
        raise HTTPException(status_code=400, detail="Nom d'appareil invalide.")
    p12_path = os.path.realpath(os.path.join(CERTS_DIR, device, f"{device}.p12"))
    certs_realpath = os.path.realpath(CERTS_DIR)
    if not p12_path.startswith(certs_realpath + os.sep):
        raise HTTPException(status_code=400, detail="Nom d'appareil invalide — chemin non autorisé.")
    if not os.path.exists(p12_path):
        raise HTTPException(status_code=404, detail="Certificat .p12 introuvable pour cet appareil.")
    return FileResponse(
        p12_path,
        media_type="application/x-pkcs12",
        filename=f"{device}.p12"
    )

@app.delete("/api/admin/certs/{device_name}")
def delete_certificate(device_name: str, request: Request):
    """Supprime un certificat client (réservé à Victor)."""
    verify_victor_admin(request)
    # Sécurité : whitelist de caractères + vérification realpath
    device = re.sub(r'[^a-zA-Z0-9\-_]', '', device_name.strip().replace(" ", "-"))
    if not device or len(device) > 64:
        raise HTTPException(status_code=400, detail="Nom d'appareil invalide.")
    device_dir = os.path.realpath(os.path.join(CERTS_DIR, device))
    certs_realpath = os.path.realpath(CERTS_DIR)
    if not device_dir.startswith(certs_realpath + os.sep):
        raise HTTPException(status_code=400, detail="Nom d'appareil invalide — chemin non autorisé.")
    if os.path.exists(device_dir):
        shutil.rmtree(device_dir, ignore_errors=True)
        return {"success": True, "message": f"Certificat {device} supprimé."}
    raise HTTPException(status_code=404, detail="Appareil introuvable.")

# --- ENDPOINTS GESTION DES PROXYS & SÉCURITÉ MULTI-SERVICES ---
class ProxyCreateRequest(BaseModel):
    domain: str
    label: str

@app.get("/api/admin/proxies")
def list_proxies(request: Request):
    """Liste tous les sous-domaines et proxys gérés (réservé à Victor)."""
    verify_victor_admin(request)
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, domain, label, is_protected, created_at FROM managed_proxies ORDER BY created_at ASC")
    rows = cursor.fetchall()
    conn.close()
    return {"proxies": [dict(r) for r in rows]}

@app.post("/api/admin/proxies")
def add_proxy(payload: ProxyCreateRequest, request: Request):
    """Ajoute un nouveau sous-domaine/proxy à la liste de surveillance."""
    verify_victor_admin(request)
    domain = payload.domain.strip().lower().replace("https://", "").replace("http://", "").rstrip("/")
    label = payload.label.strip() or domain
    if not domain:
        raise HTTPException(status_code=400, detail="Nom de domaine requis.")
    proxy_id = domain.replace(".", "-")
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO managed_proxies (id, domain, label, is_protected)
        VALUES (?, ?, ?, 0)
        ON CONFLICT(id) DO UPDATE SET domain=excluded.domain, label=excluded.label
    """, (proxy_id, domain, label))
    conn.commit()
    conn.close()
    return {"success": True, "id": proxy_id, "domain": domain, "label": label}

@app.put("/api/admin/proxies/{proxy_id}/toggle")
def toggle_proxy(proxy_id: str, request: Request):
    """Bascule l'état protégé / non protégé d'un proxy."""
    verify_victor_admin(request)
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE managed_proxies SET is_protected = CASE WHEN is_protected = 1 THEN 0 ELSE 1 END WHERE id = ?", (proxy_id,))
    conn.commit()
    conn.close()
    return {"success": True}

@app.delete("/api/admin/proxies/{proxy_id}")
def delete_proxy(proxy_id: str, request: Request):
    """Supprime un proxy de la liste de surveillance."""
    verify_victor_admin(request)
    if proxy_id == "vw":
        raise HTTPException(status_code=400, detail="Impossible de supprimer VicozWorld.")
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM managed_proxies WHERE id = ?", (proxy_id,))
    conn.commit()
    conn.close()
    return {"success": True}

# --- ENDPOINTS BANQUE (WOOB) ---
class AccountBalance(BaseModel):
    id: str
    label: str
    balance: float
    currency: str
    bank_name: str

class BalancesResponse(BaseModel):
    accounts: list[AccountBalance]
    total: float

@app.get("/api/balances", response_model=BalancesResponse)
def get_balances():
    if Woob is None:
        raise HTTPException(status_code=500, detail="La librairie Woob n'est pas installée ou accessible.")

    try:
        woob = Woob()
        woob.load_backends(caps=CapBank)
        
        accounts_data = []
        total_balance = 0.0

        BANK_NAMES = {
            "cragr": "Crédit Agricole",
            "boursorama": "BoursoBank",
            "caisseepargne": "Caisse d'Épargne",
            "societegenerale": "Société Générale",
            "creditmutuel": "Crédit Mutuel",
            "banquepopulaire": "Banque Populaire",
            "bnporc": "BNP Paribas",
            "lcl": "LCL",
            "fortuneo": "Fortuneo"
        }

        for account in woob.iter_accounts():
            label = str(account.label or "")
            label_lower = label.lower()

            # Exclure uniquement les prêts / emprunts
            is_loan = False
            if hasattr(account, 'type') and getattr(account.type, 'name', '') == 'LOAN':
                is_loan = True
            if "prêt" in label_lower or "pret" in label_lower or "emprunt" in label_lower or "credit conso" in label_lower or "credit immo" in label_lower:
                is_loan = True

            if is_loan:
                logger.info(f"Compte de prêt ignoré : {label} ({getattr(account, 'balance', 0)})")
                continue

            if isinstance(account.backend, str):
                backend_name = account.backend
            else:
                backend_name = getattr(account.backend, 'name', "Banque inconnue") if account.backend else "Banque inconnue"
            
            display_name = BANK_NAMES.get(backend_name.lower(), backend_name.capitalize())

            try:
                balance = float(account.balance)
            except (ValueError, TypeError):
                balance = 0.0
                
            total_balance += balance

            accounts_data.append(AccountBalance(
                id=account.id,
                label=account.label,
                balance=balance,
                currency=account.currency or "EUR",
                bank_name=display_name
            ))

        return BalancesResponse(accounts=accounts_data, total=total_balance)

    except Exception as e:
        logger.error(f"Erreur lors de la récupération des soldes: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/medias")
def get_medias():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT data FROM medias")
    rows = cursor.fetchall()
    conn.close()
    
    medias = [json.loads(row["data"]) for row in rows]
    medias.sort(key=lambda x: x.get("loggedAt", ""), reverse=True)
    return medias


@app.put("/api/medias/{media_id}")
def save_media(media_id: str, payload: dict[str, Any]):
    conn = get_db()
    cursor = conn.cursor()
    data_str = json.dumps(payload)
    cursor.execute("""
        INSERT INTO medias (id, data, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET data=excluded.data, updated_at=CURRENT_TIMESTAMP
    """, (media_id, data_str))
    conn.commit()
    conn.close()
    return {"success": True, "id": media_id}

@app.delete("/api/medias/{media_id}")
def delete_media(media_id: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM medias WHERE id = ?", (media_id,))
    conn.commit()
    conn.close()
    return {"success": True, "id": media_id}


# --- ENDPOINTS BIBLIOTHÈQUE MULTI-MÉDIAS (Livres, Mangas, CDs, Vinyles, Bluray/4K, Magazines) ---
@app.get("/api/library")
def get_library_items():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT data FROM library_items ORDER BY updated_at DESC")
    rows = cursor.fetchall()
    conn.close()
    items = []
    for r in rows:
        try:
            items.append(json.loads(r["data"]))
        except Exception:
            pass
    items.sort(key=lambda x: x.get("addedAt", x.get("updatedAt", "")), reverse=True)
    return items

@app.put("/api/library/{item_id}")
def save_library_item(item_id: str, payload: dict[str, Any]):
    conn = get_db()
    cursor = conn.cursor()
    data_str = json.dumps(payload)
    cursor.execute("""
        INSERT INTO library_items (id, data, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET data=excluded.data, updated_at=CURRENT_TIMESTAMP
    """, (item_id, data_str))
    conn.commit()
    conn.close()
    return {"success": True, "id": item_id}

@app.delete("/api/library/{item_id}")
def delete_library_item(item_id: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM library_items WHERE id = ?", (item_id,))
    conn.commit()
    conn.close()
    return {"success": True, "id": item_id}


@app.get("/api/library/search/deezer")
def search_deezer_proxy(q: str):
    """Proxy de recherche d'albums Deezer avec pochettes 1000x1000px et dates de sortie."""
    if not q or not q.strip():
        return {"data": []}
    try:
        import urllib.request
        import urllib.parse
        from concurrent.futures import ThreadPoolExecutor

        encoded_q = urllib.parse.quote(q.strip())
        url = f"https://api.deezer.com/search/album?q={encoded_q}&limit=12"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
        with urllib.request.urlopen(req, timeout=5) as response:
            if response.status != 200:
                return {"data": []}
            raw = response.read().decode("utf-8")
            data = json.loads(raw)
            albums = data.get("data", [])

        # Récupération parallèle rapide des dates de parution précises pour chaque album
        def fetch_album_date(alb):
            alb_id = alb.get("id")
            if not alb_id:
                return alb
            try:
                d_url = f"https://api.deezer.com/album/{alb_id}"
                d_req = urllib.request.Request(d_url, headers={"User-Agent": "Mozilla/5.0"})
                with urllib.request.urlopen(d_req, timeout=3) as d_res:
                    if d_res.status == 200:
                        d_info = json.loads(d_res.read().decode("utf-8"))
                        alb["release_date"] = d_info.get("release_date", "")
            except Exception:
                pass
            return alb

        with ThreadPoolExecutor(max_workers=6) as executor:
            enriched_albums = list(executor.map(fetch_album_date, albums))

        return {"data": enriched_albums}
    except Exception as e:
        logger.warning(f"Erreur proxy Deezer: {e}")
    return {"data": []}




# --- ENDPOINTS NOTES ---
@app.get("/api/notes")
def get_notes():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT data FROM notes")
    rows = cursor.fetchall()
    conn.close()
    
    notes = [json.loads(row["data"]) for row in rows]
    notes.sort(key=lambda x: x.get("updatedAt", ""), reverse=True)
    return notes


@app.put("/api/notes/{note_id}")
def save_note(note_id: str, payload: dict[str, Any]):
    conn = get_db()
    cursor = conn.cursor()
    data_str = json.dumps(payload)
    cursor.execute("""
        INSERT INTO notes (id, data, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET data=excluded.data, updated_at=CURRENT_TIMESTAMP
    """, (note_id, data_str))
    conn.commit()
    conn.close()
    return {"success": True, "id": note_id}

@app.delete("/api/notes/{note_id}")
def delete_note(note_id: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM notes WHERE id = ?", (note_id,))
    conn.commit()
    conn.close()
    return {"success": True, "id": note_id}


@app.get("/api/genealogy")
def get_genealogy_members():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT data FROM genealogy")
    rows = cursor.fetchall()
    conn.close()
    
    members = [json.loads(row["data"]) for row in rows]
    return members


@app.put("/api/genealogy/{member_id}")
def save_genealogy_member(member_id: str, payload: dict[str, Any]):
    conn = get_db()
    cursor = conn.cursor()
    data_str = json.dumps(payload)
    cursor.execute("""
        INSERT INTO genealogy (id, data, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET data=excluded.data, updated_at=CURRENT_TIMESTAMP
    """, (member_id, data_str))
    conn.commit()
    conn.close()
    return {"success": True, "id": member_id}

@app.delete("/api/genealogy/{member_id}")
def delete_genealogy_member(member_id: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM genealogy WHERE id = ?", (member_id,))
    conn.commit()
    conn.close()
    return {"success": True, "id": member_id}

@app.post("/api/genealogy/bulk")
def bulk_save_genealogy(payload: dict[str, Any]):
    # payload is expected to have "members": list[dict] and optional "replace": bool
    members = payload.get("members", [])
    replace = payload.get("replace", False)
    
    conn = get_db()
    cursor = conn.cursor()
    if replace:
        cursor.execute("DELETE FROM genealogy")
        
    for m in members:
        m_id = str(m.get("id"))
        if not m_id:
            continue
        data_str = json.dumps(m)
        cursor.execute("""
            INSERT INTO genealogy (id, data, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(id) DO UPDATE SET data=excluded.data, updated_at=CURRENT_TIMESTAMP
        """, (m_id, data_str))
        
    conn.commit()
    conn.close()
    return {"success": True, "count": len(members)}

@app.delete("/api/genealogy")
def clear_genealogy():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM genealogy")
    conn.commit()
    conn.close()
    return {"success": True, "message": "Généalogie réinitialisée"}





# --- ENDPOINTS ÉLECTRICITÉ (ENEDIS / MYELECTRICALDATA) ---

class ElectricityConfig(BaseModel):
    pdl: str
    token: str
    kwh_price: float = 0.2516
    subscription_price: float = 12.50
    target_monthly_budget: float = 60.00

def get_electricity_config_db():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT pdl, token, kwh_price, subscription_price, target_monthly_budget FROM electricity_settings WHERE id = 1")
    row = cursor.fetchone()
    conn.close()
    if row:
        d = dict(row)
        d["pdl"] = decrypt_value(d["pdl"])
        d["token"] = decrypt_value(d["token"])
        return d
    return {
        "pdl": os.getenv("ENEDIS_PDL", ""),
        "token": os.getenv("ENEDIS_TOKEN", ""),
        "kwh_price": 0.2516,
        "subscription_price": 12.50,
        "target_monthly_budget": 60.00
    }

def sync_electricity_from_api(pdl: str, token: str, days: int = 90):
    if not pdl or not token:
        return {"success": False, "error": "PDL ou Token non renseigné."}
    
    end_dt = datetime.now()
    start_dt = end_dt - timedelta(days=days)
    end_str = end_dt.strftime("%Y-%m-%d")
    start_str = start_dt.strftime("%Y-%m-%d")
    
    conn = get_db()
    cursor = conn.cursor()
    synced_count = 0

    # 1. Conso journalière en Wh
    url_conso = f"https://www.myelectricaldata.fr/daily_consumption/{pdl}/start/{start_str}/end/{end_str}/"
    try:
        req = urllib.request.Request(url_conso, headers={"Authorization": token, "User-Agent": "VicozWorld/1.0"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            readings = data.get("meter_reading", {}).get("interval_reading", [])
            for r in readings:
                r_date = r.get("date")
                r_val = float(r.get("value", 0))
                cursor.execute("""
                    INSERT INTO electricity_daily_cache (pdl, date, value_wh, updated_at)
                    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
                    ON CONFLICT(pdl, date) DO UPDATE SET value_wh = excluded.value_wh, updated_at = CURRENT_TIMESTAMP
                """, (pdl, r_date, r_val))
                synced_count += 1
    except Exception as e:
        logger.error(f"Erreur sync conso MyElectricalData: {e}")

    # 2. Puissance max journalière en VA
    url_max = f"https://www.myelectricaldata.fr/daily_consumption_max_power/{pdl}/start/{start_str}/end/{end_str}/"
    try:
        req = urllib.request.Request(url_max, headers={"Authorization": token, "User-Agent": "VicozWorld/1.0"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            max_readings = data.get("meter_reading", {}).get("interval_reading", [])
            for r in max_readings:
                r_date = r.get("date")
                r_max = float(r.get("value", 0))
                cursor.execute("""
                    UPDATE electricity_daily_cache
                    SET max_power_va = ?
                    WHERE pdl = ? AND date = ?
                """, (r_max, pdl, r_date))
    except Exception as e:
        logger.warning(f"Erreur sync max power MyElectricalData: {e}")

    conn.commit()
    conn.close()
    return {"success": True, "synced_count": synced_count}


@app.get("/api/electricity/config")
def get_electricity_config():
    config = get_electricity_config_db()
    return config

@app.post("/api/electricity/config")
def save_electricity_config(config: ElectricityConfig):
    conn = get_db()
    cursor = conn.cursor()
    enc_pdl = encrypt_value(config.pdl)
    enc_token = encrypt_value(config.token)
    
    cursor.execute("""
        INSERT INTO electricity_settings (id, pdl, token, kwh_price, subscription_price, target_monthly_budget, updated_at)
        VALUES (1, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET
            pdl = excluded.pdl,
            token = excluded.token,
            kwh_price = excluded.kwh_price,
            subscription_price = excluded.subscription_price,
            target_monthly_budget = excluded.target_monthly_budget,
            updated_at = CURRENT_TIMESTAMP
    """, (enc_pdl, enc_token, config.kwh_price, config.subscription_price, config.target_monthly_budget))
    conn.commit()
    conn.close()

    # Synchroniser les données avec les nouveaux identifiants
    sync_res = sync_electricity_from_api(config.pdl, config.token, days=90)
    return {"success": True, "sync": sync_res}

@app.post("/api/electricity/sync")
def trigger_electricity_sync():
    config = get_electricity_config_db()
    sync_res = sync_electricity_from_api(config["pdl"], config["token"], days=90)
    return sync_res

@app.get("/api/electricity/stats")
def get_electricity_stats():
    config = get_electricity_config_db()
    pdl = config["pdl"]
    token = config["token"]
    kwh_price = config["kwh_price"]
    sub_price = config["subscription_price"]
    target_budget = config["target_monthly_budget"]

    conn = get_db()
    cursor = conn.cursor()

    # Vérifier si on a des données récentes en cache
    cursor.execute("SELECT COUNT(*), MAX(date) FROM electricity_daily_cache WHERE pdl = ?", (pdl,))
    count, max_date = cursor.fetchone()

    # Si pas de données ou dernière date plus vieille que 2 jours, tenter un refresh
    if count == 0:
        conn.close()
        sync_electricity_from_api(pdl, token, days=90)
        conn = get_db()
        cursor = conn.cursor()

    cursor.execute("""
        SELECT date, value_wh, max_power_va
        FROM electricity_daily_cache
        WHERE pdl = ?
        ORDER BY date ASC
    """, (pdl,))
    rows = cursor.fetchall()
    conn.close()

    daily_data = [dict(r) for r in rows]

    # Structuration par mois et jour
    # Calculer pour le mois en cours
    now = datetime.now()
    current_month_str = now.strftime("%Y-%m")
    current_day = now.day
    _, days_in_current_month = calendar.monthrange(now.year, now.month)

    # Mois précédent
    first_of_month = now.replace(day=1)
    prev_month_last_day = first_of_month - timedelta(days=1)
    prev_month_str = prev_month_last_day.strftime("%Y-%m")

    this_month_kwh = 0.0
    this_month_days_count = 0
    prev_month_kwh = 0.0
    yesterday_info = None

    history_chart = []
    monthly_agg = {}

    FRENCH_MONTHS = ["Janv.", "Févr.", "Mars", "Avr.", "Mai", "Juin", "Juil.", "Août", "Sept.", "Oct.", "Nov.", "Déc."]
    FRENCH_DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]

    for item in daily_data:
        d_str = item["date"]
        wh = item["value_wh"]
        kwh = round(wh / 1000.0, 2)
        cost = round(kwh * kwh_price, 2)
        max_va = item["max_power_va"]

        dt = datetime.strptime(d_str, "%Y-%m-%d")
        m_str = dt.strftime("%Y-%m")

        # Agrégation mensuelle
        if m_str not in monthly_agg:
            monthly_agg[m_str] = {"kwh": 0.0, "cost": 0.0, "month": m_str, "label": f"{FRENCH_MONTHS[dt.month - 1]} {dt.year}"}
        monthly_agg[m_str]["kwh"] = round(monthly_agg[m_str]["kwh"] + kwh, 2)
        monthly_agg[m_str]["cost"] = round(monthly_agg[m_str]["kwh"] * kwh_price + sub_price, 2)

        if m_str == current_month_str:
            this_month_kwh += kwh
            this_month_days_count += 1
        elif m_str == prev_month_str:
            prev_month_kwh += kwh

        # Graphique des 45 derniers jours
        day_name = FRENCH_DAYS[dt.weekday()]
        label = f"{dt.day:02d}/{dt.month:02d}"
        history_chart.append({
            "date": d_str,
            "label": label,
            "day_name": day_name,
            "kwh": kwh,
            "cost": cost,
            "max_power_va": int(max_va) if max_va else 0
        })

    # Trier l'historique et ne garder que les 35 derniers jours pour la lisibilité
    recent_history = history_chart[-35:] if len(history_chart) > 35 else history_chart

    if daily_data:
        last_entry = daily_data[-1]
        last_dt = datetime.strptime(last_entry["date"], "%Y-%m-%d")
        yesterday_info = {
            "date": last_entry["date"],
            "formatted_date": f"{FRENCH_DAYS[last_dt.weekday()]} {last_dt.day} {FRENCH_MONTHS[last_dt.month - 1]}",
            "kwh": round(last_entry["value_wh"] / 1000.0, 2),
            "cost": round((last_entry["value_wh"] / 1000.0) * kwh_price, 2),
            "max_power_va": int(last_entry["max_power_va"] or 0)
        }

    # Calculs du mois en cours
    this_month_kwh = round(this_month_kwh, 2)
    this_month_energy_cost = round(this_month_kwh * kwh_price, 2)
    this_month_current_cost = round(this_month_energy_cost + sub_price, 2)

    # Moyenne journalière et projection fin de mois
    daily_avg_kwh = round(this_month_kwh / max(this_month_days_count, 1), 2)
    projected_kwh = round(daily_avg_kwh * days_in_current_month, 1)
    projected_energy_cost = round(projected_kwh * kwh_price, 2)
    projected_total_cost = round(projected_energy_cost + sub_price, 2)

    # Dérapage par rapport à la mensualité cible
    budget_delta = round(projected_total_cost - target_budget, 2)
    is_over_budget = budget_delta > 0
    budget_used_pct = round((this_month_current_cost / max(target_budget, 1)) * 100, 1)

    # Comparaison avec le mois dernier
    prev_month_cost = round(prev_month_kwh * kwh_price + sub_price, 2)
    comparison_kwh_pct = 0.0
    if prev_month_kwh > 0:
        comparison_kwh_pct = round(((projected_kwh - prev_month_kwh) / prev_month_kwh) * 100, 1)

    monthly_history_list = list(monthly_agg.values())[-6:]

    return {
        "configured": bool(pdl and token),
        "settings": {
            "pdl": pdl,
            "kwh_price": kwh_price,
            "subscription_price": sub_price,
            "target_monthly_budget": target_budget
        },
        "yesterday": yesterday_info,
        "this_month": {
            "month_name": f"{FRENCH_MONTHS[now.month - 1]} {now.year}",
            "days_elapsed": this_month_days_count,
            "days_total": days_in_current_month,
            "total_kwh": this_month_kwh,
            "daily_avg_kwh": daily_avg_kwh,
            "current_cost": this_month_current_cost,
            "energy_cost": this_month_energy_cost,
            "projected_kwh": projected_kwh,
            "projected_cost": projected_total_cost,
            "target_budget": target_budget,
            "budget_delta": budget_delta,
            "is_over_budget": is_over_budget,
            "budget_used_pct": budget_used_pct
        },
        "last_month": {
            "month_name": f"{FRENCH_MONTHS[prev_month_last_day.month - 1]} {prev_month_last_day.year}",
            "total_kwh": round(prev_month_kwh, 2),
            "total_cost": prev_month_cost
        },
        "comparison_kwh_pct": comparison_kwh_pct,
        "daily_history": recent_history,
        "monthly_history": monthly_history_list
    }


# --- ENDPOINTS ACTUALITÉS (FLUX RSS : LE MONDE, LIBÉRATION, FRANCE INFO, COURRIER INTERNATIONAL, MEDIAPART) ---

NEWS_SOURCES = [
    {
        "id": "lemonde",
        "name": "Le Monde",
        "url": "https://www.lemonde.fr/rss/une.xml",
        "color": "from-sky-900/40 to-indigo-950/40",
        "border": "border-sky-500/30",
        "badgeColor": "bg-sky-500/20 text-sky-300 border-sky-500/30"
    },
    {
        "id": "liberation",
        "name": "Libération",
        "url": "https://www.liberation.fr/arc/outboundfeeds/rss-all/",
        "color": "from-red-950/40 to-rose-950/40",
        "border": "border-red-500/30",
        "badgeColor": "bg-red-500/20 text-red-300 border-red-500/30"
    },
    {
        "id": "franceinfo",
        "name": "France Info",
        "url": "https://www.francetvinfo.fr/titres.rss",
        "color": "from-amber-950/40 to-yellow-950/40",
        "border": "border-amber-500/30",
        "badgeColor": "bg-amber-500/20 text-amber-300 border-amber-500/30"
    },
    {
        "id": "courrier",
        "name": "Courrier International",
        "url": "https://www.courrierinternational.com/feed/all/rss.xml",
        "color": "from-pink-950/40 to-fuchsia-950/40",
        "border": "border-pink-500/30",
        "badgeColor": "bg-pink-500/20 text-pink-300 border-pink-500/30"
    },
    {
        "id": "mediapart",
        "name": "Mediapart",
        "url": "https://www.mediapart.fr/articles/feed",
        "color": "from-rose-950/40 to-red-950/40",
        "border": "border-rose-500/30",
        "badgeColor": "bg-rose-500/20 text-rose-300 border-rose-500/30"
    }
]

NEWS_CACHE = {
    "timestamp": 0,
    "articles": []
}

def fetch_rss_feed(source_info):
    articles = []
    try:
        ctx = ssl.create_default_context()
        req = urllib.request.Request(
            source_info["url"],
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
        )
        with urllib.request.urlopen(req, timeout=8, context=ctx) as response:
            xml_data = response.read()
            root = ET.fromstring(xml_data)
            items = root.findall(".//item")
            
            for item in items:
                title_elem = item.find("title")
                link_elem = item.find("link")
                desc_elem = item.find("description")
                pub_elem = item.find("pubDate")
                
                title = (title_elem.text or "").strip() if title_elem is not None else ""
                link = (link_elem.text or "").strip() if link_elem is not None else ""
                desc_raw = (desc_elem.text or "").strip() if desc_elem is not None else ""
                pub_date_str = (pub_elem.text or "").strip() if pub_elem is not None else ""
                
                if not title or not link:
                    continue
                
                # Extraction d'image
                image_url = None
                enclosure = item.find("enclosure")
                if enclosure is not None and "image" in enclosure.get("type", ""):
                    image_url = enclosure.get("url")
                
                if not image_url:
                    for child in item:
                        if child.tag.endswith("content") or child.tag.endswith("thumbnail"):
                            image_url = child.get("url")
                            if image_url:
                                break
                
                if not image_url and desc_raw:
                    img_match = re.search(r'<img[^>]+src=[\'"]([^\'"]+)[\'"]', desc_raw)
                    if img_match:
                        image_url = img_match.group(1)
                
                # Nettoyage du HTML dans la description
                clean_desc = re.sub(r"<[^>]+>", "", desc_raw).strip()
                # Supprimer les sauts de ligne multiples
                clean_desc = re.sub(r"\s+", " ", clean_desc)
                if len(clean_desc) > 280:
                    clean_desc = clean_desc[:280] + "..."
                
                # Parse de date pour le tri
                parsed_dt = None
                timestamp = 0
                if pub_date_str:
                    try:
                        parsed_dt = parsedate_to_datetime(pub_date_str)
                        timestamp = parsed_dt.timestamp()
                    except Exception:
                        timestamp = 0

                articles.append({
                    "id": f"{source_info['id']}-{hash(link)}",
                    "source_id": source_info["id"],
                    "source_name": source_info["name"],
                    "badge_color": source_info["badgeColor"],
                    "border_color": source_info["border"],
                    "title": title,
                    "link": link,
                    "description": clean_desc,
                    "image": image_url,
                    "pub_date": pub_date_str,
                    "timestamp": timestamp
                })
    except Exception as e:
        logger.warning(f"Erreur RSS pour {source_info['name']}: {e}")
    
    return articles

@app.get("/api/news")
def get_news(source: Optional[str] = None, search: Optional[str] = None):
    current_time = time.time()
    
    # Rafraîchissement du cache si plus vieux que 5 minutes ou vide
    if current_time - NEWS_CACHE["timestamp"] > 300 or not NEWS_CACHE["articles"]:
        all_articles = []
        for src in NEWS_SOURCES:
            src_articles = fetch_rss_feed(src)
            all_articles.extend(src_articles)
        
        # Trier par date décroissante
        all_articles.sort(key=lambda x: x["timestamp"], reverse=True)
        NEWS_CACHE["articles"] = all_articles
        NEWS_CACHE["timestamp"] = current_time

    filtered = NEWS_CACHE["articles"]
    
    if source and source != "all":
        filtered = [a for a in filtered if a["source_id"] == source]
        
    if search:
        search_lower = search.lower().strip()
        filtered = [
            a for a in filtered 
            if search_lower in a["title"].lower() or search_lower in a["description"].lower()
        ]

    return {
        "sources": [{"id": s["id"], "name": s["name"]} for s in NEWS_SOURCES],
        "count": len(filtered),
        "updated_at": NEWS_CACHE["timestamp"],
        "articles": filtered
    }

GEMINI_LOCK = threading.Lock()
LAST_GEMINI_CALL_TIME = 0.0

MODELS_CASCADE = [
    "gemini-2.5-flash",      # Modèle principal recommandé
    "gemini-2.0-flash",      # Fallback stable
    "gemini-1.5-flash"       # Fallback universel
]

def call_gemini_json_api(prompt: str, api_key: str, max_retries: int = 1) -> Optional[dict]:
    global LAST_GEMINI_CALL_TIME
    if not api_key:
        return None

    ctx = ssl.create_default_context()
    gemini_payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"response_mime_type": "application/json"}
    }
    encoded_data = json.dumps(gemini_payload).encode("utf-8")

    with GEMINI_LOCK:
        # Respecter au moins 1s entre chaque requête pour préserver les quotas
        now = time.time()
        elapsed = now - LAST_GEMINI_CALL_TIME
        if elapsed < 1.0:
            time.sleep(1.0 - elapsed)

        # Cascade automatique entre les modèles Google disponibles pour éviter le quota 429
        for model_name in MODELS_CASCADE:
            gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
            for attempt in range(max_retries + 1):
                try:
                    LAST_GEMINI_CALL_TIME = time.time()
                    req = urllib.request.Request(
                        gemini_url,
                        data=encoded_data,
                        headers={"Content-Type": "application/json"}
                    )
                    with urllib.request.urlopen(req, timeout=20, context=ctx) as resp:
                        resp_json = json.loads(resp.read().decode("utf-8"))
                        text_out = resp_json["candidates"][0]["content"]["parts"][0]["text"].strip()
                        if text_out.startswith("```json"):
                            text_out = text_out[7:]
                        elif text_out.startswith("```"):
                            text_out = text_out[3:]
                        if text_out.endswith("```"):
                            text_out = text_out[:-3]
                        text_out = text_out.strip()
                        return json.loads(text_out)
                except urllib.error.HTTPError as e:
                    logger.warning(f"Modèle {model_name} HTTPError {e.code} -> tentative {attempt+1}/{max_retries+1}")
                    if e.code in (429, 404, 503):
                        # Quota atteint ou indisponible sur ce modèle précis, basculer sur le modèle suivant
                        break
                except Exception as e:
                    logger.warning(f"Modèle {model_name} exception: {e}")
                    break

    return None

BRIEFING_CACHE = {
    "timestamp": 0,
    "data": None
}

@app.get("/api/news/briefing")
def get_news_briefing(force: Optional[bool] = False):
    current_time = time.time()
    if not force and BRIEFING_CACHE["data"] and (current_time - BRIEFING_CACHE["timestamp"]) < 1800:
        return BRIEFING_CACHE["data"]

    news_data = get_news()
    articles = news_data.get("articles", [])
    if not articles:
        return {"success": False, "error": "Aucun article disponible."}

    cfg = get_weather_config_db()
    gemini_key = cfg.get("gemini_api_key")
    if not gemini_key:
        return {
            "success": False,
            "error": "Clé API Gemini non configurée."
        }

    compact_news = [
        f"[{a['source_name']}] {a['title']} - {a['description'][:80]}"
        for a in articles[:30]
    ]

    prompt = f"""Tu es le rédacteur en chef expert en actualités de VicozWorld.
Voici les titres récents des 5 grands médias (Le Monde, Libération, France Info, Courrier International, Mediapart) :
{json.dumps(compact_news, ensure_ascii=False, indent=1)}

Tâche : Fais un tri strict de l'importance de l'info (priorité absolue à la géopolitique, crises internationales, politique nationale majeure, économie; ignore anecdotes, gaming, buzz).

Réponds STRICTEMENT avec ce format JSON :
{{
  "global_takeaway": "Une phrase percutante qui résume la tendance majeure de l'actualité.",
  "top_stories": [
    {{
      "headline": "Titre explicite du fait majeur 1",
      "summary": "Explication claire en 2 phrases des faits et répercussions.",
      "category": "Géopolitique / International / Politique",
      "importance": "Cruciale",
      "sources": "Le Monde, France Info"
    }},
    {{
      "headline": "Titre explicite du fait majeur 2",
      "summary": "Explication claire en 2 phrases.",
      "category": "International",
      "importance": "Élevée",
      "sources": "Libération, Courrier International"
    }},
    {{
      "headline": "Titre explicite du fait majeur 3",
      "summary": "Explication claire en 2 phrases.",
      "category": "Société / Économie",
      "importance": "Élevée",
      "sources": "Mediapart, Le Monde"
    }}
  ],
  "in_brief": [
    "Fait notable secondaire 1",
    "Fait notable secondaire 2",
    "Fait notable secondaire 3"
  ]
}}"""

    parsed_briefing = call_gemini_json_api(prompt, gemini_key)
    if parsed_briefing:
        result = {
            "success": True,
            "generated_at": current_time,
            "ai_model": "Gemini 2.5 Flash",
            "briefing": parsed_briefing
        }
        BRIEFING_CACHE["timestamp"] = current_time
        BRIEFING_CACHE["data"] = result
        return result
    else:
        # Fallback élégant en cas de limitation de débit
        fallback_briefing = {
            "global_takeaway": "L'actualité internationale et nationale reste dense avec une attention portée aux enjeux géopolitiques et économiques.",
            "top_stories": [
                {
                    "headline": articles[0]["title"] if articles else "Actualité en continu",
                    "summary": articles[0]["description"][:140] if articles else "Dépêches d'actualité en direct.",
                    "category": "International",
                    "importance": "Élevée",
                    "sources": articles[0]["source_name"] if articles else "Le Monde"
                }
            ],
            "in_brief": [a["title"][:80] for a in articles[1:4]]
        }
        return {
            "success": True,
            "generated_at": current_time,
            "ai_model": "Fallback",
            "briefing": fallback_briefing
        }

# --- ENDPOINTS STATION MÉTÉO MULTI-SOURCES & SYNTHÈSE IA GEMINI ---

class WeatherConfigModel(BaseModel):
    gemini_api_key: str
    default_city: str = "Paris"
    default_lat: float = 48.8566
    default_lon: float = 2.3522

def get_weather_config_db():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT gemini_api_key, default_city, default_lat, default_lon FROM weather_settings WHERE id = 1")
    row = cursor.fetchone()
    conn.close()
    if row:
        cfg = dict(row)
        cfg["gemini_api_key"] = decrypt_value(cfg["gemini_api_key"])
        if not cfg.get("gemini_api_key"):
            cfg["gemini_api_key"] = os.getenv("GEMINI_API_KEY", "")
        return cfg
    return {
        "gemini_api_key": os.getenv("GEMINI_API_KEY", ""),
        "default_city": "Paris",
        "default_lat": 48.8566,
        "default_lon": 2.3522
    }

WEATHER_CACHE = {}

@app.get("/api/weather/config")
def get_weather_config():
    return get_weather_config_db()

@app.post("/api/weather/config")
def save_weather_config(config: WeatherConfigModel):
    conn = get_db()
    cursor = conn.cursor()
    enc_key = encrypt_value(config.gemini_api_key)
    
    cursor.execute("""
        INSERT INTO weather_settings (id, gemini_api_key, default_city, default_lat, default_lon, updated_at)
        VALUES (1, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET
            gemini_api_key = excluded.gemini_api_key,
            default_city = excluded.default_city,
            default_lat = excluded.default_lat,
            default_lon = excluded.default_lon,
            updated_at = CURRENT_TIMESTAMP
    """, (enc_key, config.default_city, config.default_lat, config.default_lon))
    conn.commit()
    conn.close()
    return {"success": True}

@app.get("/api/weather/search")
def search_weather_city(q: str):
    if not q or len(q.strip()) < 2:
        return []
    try:
        ctx = ssl.create_default_context()
        encoded_q = urllib.parse.quote(q.strip()) if hasattr(urllib, 'parse') else q.strip()
        url = f"https://geocoding-api.open-meteo.com/v1/search?name={encoded_q}&count=6&language=fr&format=json"
        req = urllib.request.Request(url, headers={"User-Agent": "VicozWorldStation/1.0"})
        with urllib.request.urlopen(req, timeout=5, context=ctx) as resp:
            data = json.loads(resp.read().decode())
            results = []
            for item in data.get("results", []):
                admin = item.get("admin1", "")
                country = item.get("country", "")
                label_parts = [item.get("name", "")]
                if admin:
                    label_parts.append(admin)
                if country:
                    label_parts.append(country)
                results.append({
                    "id": item.get("id"),
                    "name": item.get("name"),
                    "admin1": admin,
                    "country": country,
                    "latitude": item.get("latitude"),
                    "longitude": item.get("longitude"),
                    "label": ", ".join(label_parts)
                })
            return results
    except Exception as e:
        logger.error(f"Erreur recherche ville météo: {e}")
        return []

WMO_WEATHER_CODES = {
    0: {"label": "Ciel dégagé", "icon": "sun"},
    1: {"label": "Principalement dégagé", "icon": "sun"},
    2: {"label": "Éclaircies et passages nuageux", "icon": "cloud-sun"},
    3: {"label": "Couvert / Nuageux", "icon": "cloud"},
    45: {"label": "Brouillard", "icon": "cloud-fog"},
    48: {"label": "Brouillard givrant", "icon": "cloud-fog"},
    51: {"label": "Bruine légère", "icon": "cloud-drizzle"},
    53: {"label": "Bruine modérée", "icon": "cloud-drizzle"},
    55: {"label": "Bruine dense", "icon": "cloud-drizzle"},
    61: {"label": "Pluie faible", "icon": "cloud-rain"},
    63: {"label": "Pluie modérée", "icon": "cloud-rain"},
    65: {"label": "Forte pluie", "icon": "cloud-heavy-rain"},
    71: {"label": "Chute de neige légère", "icon": "snowflake"},
    73: {"label": "Neige modérée", "icon": "snowflake"},
    75: {"label": "Forte neige", "icon": "snowflake"},
    80: {"label": "Averses faibles", "icon": "cloud-rain"},
    81: {"label": "Averses modérées", "icon": "cloud-rain"},
    82: {"label": "Averses violentes", "icon": "cloud-heavy-rain"},
    95: {"label": "Orage", "icon": "cloud-lightning"},
    96: {"label": "Orage avec grêle légère", "icon": "cloud-lightning"},
    99: {"label": "Orage violent avec grêle", "icon": "cloud-lightning"}
}

def get_wmo_info(code):
    return WMO_WEATHER_CODES.get(code, {"label": "Partiellement nuageux", "icon": "cloud-sun"})

@app.get("/api/weather/report")
def get_weather_report(lat: Optional[float] = None, lon: Optional[float] = None, city: Optional[str] = None):
    cfg = get_weather_config_db()
    cur_lat = lat if lat is not None else cfg["default_lat"]
    cur_lon = lon if lon is not None else cfg["default_lon"]
    cur_city = city if city else cfg["default_city"]
    gemini_key = cfg["gemini_api_key"]

    cache_key = f"{round(cur_lat, 3)}_{round(cur_lon, 3)}"
    now_ts = time.time()
    
    if cache_key in WEATHER_CACHE and (now_ts - WEATHER_CACHE[cache_key]["timestamp"]) < 600:
        cached_data = WEATHER_CACHE[cache_key]["data"]
        cached_data["city"] = cur_city
        return cached_data

    ctx = ssl.create_default_context()
    sources_data = {}
    hourly_chart = []
    daily_forecast = []
    
    # 1. Modèle 1 : Météo-France (AROME / ARPEGE)
    try:
        url_mf = f"https://api.open-meteo.com/v1/meteofrance?latitude={cur_lat}&longitude={cur_lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,wind_speed_10m,wind_gusts_10m,weather_code,surface_pressure,cloud_cover&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,uv_index_max,weather_code&hourly=temperature_2m,precipitation_probability,weather_code&timezone=auto"
        req_mf = urllib.request.Request(url_mf, headers={"User-Agent": "VicozWorldStation/1.0"})
        with urllib.request.urlopen(req_mf, timeout=6, context=ctx) as resp:
            d_mf = json.loads(resp.read().decode())
            cur_mf = d_mf.get("current", {})
            w_info = get_wmo_info(cur_mf.get("weather_code", 0))
            sources_data["meteofrance"] = {
                "name": "Météo-France (AROME / ARPEGE)",
                "country": "🇫🇷 France",
                "temp": round(cur_mf.get("temperature_2m", 0) or 0, 1),
                "apparent_temp": round(cur_mf.get("apparent_temperature", 0) or 0, 1),
                "humidity": cur_mf.get("relative_humidity_2m", 0) or 0,
                "wind_kmh": round(cur_mf.get("wind_speed_10m", 0) or 0, 1),
                "wind_gusts_kmh": round(cur_mf.get("wind_gusts_10m", 0) or 0, 1),
                "precipitation_mm": cur_mf.get("precipitation", 0) or 0,
                "pressure_hpa": round(cur_mf.get("surface_pressure", 1013) or 1013, 0),
                "cloud_cover": cur_mf.get("cloud_cover", 0) or 0,
                "condition": w_info["label"],
                "icon": w_info["icon"]
            }
            # Hourly data for next 24 hours
            h_times = d_mf.get("hourly", {}).get("time", [])[:24]
            h_temps = d_mf.get("hourly", {}).get("temperature_2m", [])[:24]
            h_rain_probs = d_mf.get("hourly", {}).get("precipitation_probability", [])[:24]
            for i in range(min(len(h_times), 24)):
                h_dt = datetime.fromisoformat(h_times[i])
                hourly_chart.append({
                    "hour": f"{h_dt.hour:02d}h",
                    "time": h_times[i],
                    "temp": round(h_temps[i] or 0, 1) if i < len(h_temps) else 0,
                    "rain_prob": h_rain_probs[i] if i < len(h_rain_probs) and h_rain_probs[i] is not None else 0
                })
            # Daily forecast
            d_times = d_mf.get("daily", {}).get("time", [])[:7]
            d_max = d_mf.get("daily", {}).get("temperature_2m_max", [])[:7]
            d_min = d_mf.get("daily", {}).get("temperature_2m_min", [])[:7]
            d_codes = d_mf.get("daily", {}).get("weather_code", [])[:7]
            d_rain = d_mf.get("daily", {}).get("precipitation_probability_max", [])[:7]
            d_uv = d_mf.get("daily", {}).get("uv_index_max", [])[:7]
            
            FRENCH_DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]
            FRENCH_MONTHS = ["Janv", "Févr", "Mars", "Avr", "Mai", "Juin", "Juil", "Août", "Sept", "Oct", "Nov", "Déc"]
            for j in range(len(d_times)):
                dt_obj = datetime.fromisoformat(d_times[j])
                info_day = get_wmo_info(d_codes[j] if j < len(d_codes) else 0)
                daily_forecast.append({
                    "date": d_times[j],
                    "day_name": "Aujourd'hui" if j == 0 else FRENCH_DAYS[dt_obj.weekday()],
                    "formatted_date": f"{dt_obj.day} {FRENCH_MONTHS[dt_obj.month - 1]}",
                    "temp_max": round(d_max[j] or 0, 1) if j < len(d_max) else 0,
                    "temp_min": round(d_min[j] or 0, 1) if j < len(d_min) else 0,
                    "rain_prob": d_rain[j] if j < len(d_rain) and d_rain[j] is not None else 0,
                    "uv_index": d_uv[j] if j < len(d_uv) and d_uv[j] is not None else 0,
                    "condition": info_day["label"],
                    "icon": info_day["icon"]
                })
    except Exception as e:
        logger.warning(f"Erreur source Météo France: {e}")

    # 2. Modèle 2 : MET Norway (ECMWF Européen)
    try:
        url_norway = f"https://api.met.no/weatherapi/locationforecast/2.0/compact?lat={cur_lat}&lon={cur_lon}"
        req_norway = urllib.request.Request(url_norway, headers={"User-Agent": "VicozWorldStation/1.0 contact@vicozworld.fr"})
        with urllib.request.urlopen(req_norway, timeout=6, context=ctx) as resp:
            d_nor = json.loads(resp.read().decode())
            ts0 = d_nor.get("properties", {}).get("timeseries", [])[0]
            inst = ts0.get("data", {}).get("instant", {}).get("details", {})
            next_1h = ts0.get("data", {}).get("next_1_hours", {}).get("summary", {}).get("symbol_code", "partlycloudy_day")
            
            air_t = inst.get("air_temperature", 0) or 0
            w_spd = inst.get("wind_speed", 0) or 0
            w_gst = inst.get("wind_speed_of_gust", 0) or 0
            
            sources_data["metnorway"] = {
                "name": "MET Norway (Modèle ECMWF Européen)",
                "country": "🇳🇴 Europe / Norvège",
                "temp": round(air_t, 1),
                "apparent_temp": round(air_t - (w_spd * 0.3), 1),
                "humidity": inst.get("relative_humidity", 0) or 0,
                "wind_kmh": round(w_spd * 3.6, 1),
                "wind_gusts_kmh": round(w_gst * 3.6, 1),
                "precipitation_mm": 0,
                "pressure_hpa": round(inst.get("air_pressure_at_sea_level", 1013) or 1013, 0),
                "cloud_cover": inst.get("cloud_area_fraction", 0) or 0,
                "condition": next_1h.replace("_", " ").title(),
                "icon": "cloud-sun" if "partlycloudy" in next_1h else ("sun" if "clearsky" in next_1h else "cloud-rain")
            }
    except Exception as e:
        logger.warning(f"Erreur source MET Norway: {e}")

    # 3. Modèle 3 : Open-Meteo Global Ensemble (ICON DWD & GFS)
    try:
        url_om = f"https://api.open-meteo.com/v1/forecast?latitude={cur_lat}&longitude={cur_lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,wind_speed_10m,wind_gusts_10m,weather_code,surface_pressure,cloud_cover&timezone=auto"
        req_om = urllib.request.Request(url_om, headers={"User-Agent": "VicozWorldStation/1.0"})
        with urllib.request.urlopen(req_om, timeout=6, context=ctx) as resp:
            d_om = json.loads(resp.read().decode())
            cur_om = d_om.get("current", {})
            w_info_om = get_wmo_info(cur_om.get("weather_code", 0))
            sources_data["global_ensemble"] = {
                "name": "Global Ensemble (DWD ICON / NOAA GFS)",
                "country": "🌐 International",
                "temp": round(cur_om.get("temperature_2m", 0) or 0, 1),
                "apparent_temp": round(cur_om.get("apparent_temperature", 0) or 0, 1),
                "humidity": cur_om.get("relative_humidity_2m", 0) or 0,
                "wind_kmh": round(cur_om.get("wind_speed_10m", 0) or 0, 1),
                "wind_gusts_kmh": round(cur_om.get("wind_gusts_10m", 0) or 0, 1),
                "precipitation_mm": cur_om.get("precipitation", 0) or 0,
                "pressure_hpa": round(cur_om.get("surface_pressure", 1013) or 1013, 0),
                "cloud_cover": cur_om.get("cloud_cover", 0) or 0,
                "condition": w_info_om["label"],
                "icon": w_info_om["icon"]
            }
    except Exception as e:
        logger.warning(f"Erreur source Global Ensemble: {e}")

    # Calcul mathématique de base en fallback
    temps_list = [s["temp"] for s in sources_data.values() if "temp" in s]
    avg_temp = round(sum(temps_list) / max(len(temps_list), 1), 1)
    
    consensus_synthesis = {
        "consensus_temp": avg_temp,
        "consensus_condition": sources_data.get("meteofrance", {}).get("condition", "Partiellement nuageux"),
        "confidence_score": 92,
        "confidence_label": "Élevé (Bonne cohérence entre les modèles)",
        "summary": f"Temps stable et agréable sur {cur_city}. Température moyenne observée de {avg_temp}°C.",
        "rain_risk_level": "Faible",
        "umbrella_needed": False,
        "outfit_advice": "Tenue légère et confortable.",
        "activities_advice": "Excellentes conditions pour les activités et sorties en plein air."
    }

    # 4. Synthèse intelligente par GEMINI 2.5 FLASH
    if gemini_key and sources_data:
        gemini_prompt = f"""Tu es le météorologue expert IA de la station météo VicozWorld.
Voici les données météo en direct extraites de 3 modèles météo professionnels pour la ville de {cur_city}:
{json.dumps(sources_data, ensure_ascii=False, indent=2)}

Fais une analyse croisée de haute fiabilité. Réponds STRICTEMENT au format JSON avec ces clés exactes :
{{
  "consensus_temp": {avg_temp},
  "consensus_condition": "string",
  "confidence_score": 95,
  "confidence_label": "string",
  "summary": "string de 2 phrases",
  "rain_risk_level": "Faible",
  "umbrella_needed": false,
  "outfit_advice": "string",
  "activities_advice": "string"
}}"""
        parsed_gemini = call_gemini_json_api(gemini_prompt, gemini_key)
        if parsed_gemini:
            consensus_synthesis.update(parsed_gemini)
            consensus_synthesis["ai_generated"] = True
            consensus_synthesis["ai_model"] = "Gemini 2.5 Flash"
        else:
            consensus_synthesis["ai_generated"] = False
    else:
        consensus_synthesis["ai_generated"] = False

    result_payload = {
        "city": cur_city,
        "coordinates": {"latitude": cur_lat, "longitude": cur_lon},
        "sources_count": len(sources_data),
        "sources": sources_data,
        "synthesis": consensus_synthesis,
        "hourly_chart": hourly_chart,
        "daily_forecast": daily_forecast,
        "updated_at": now_ts
    }

    WEATHER_CACHE[cache_key] = {
        "timestamp": now_ts,
        "data": result_payload
    }

    return result_payload

# --- ENDPOINT HUB D'ACCUEIL INTELLIGENT (SYNTHÈSE MULTI-MODULES PAR GEMINI) ---

HUB_CACHE = {
    "timestamp": 0,
    "data": None
}

@app.get("/api/hub/summary")
def get_hub_summary(request: Request, force: Optional[bool] = False):
    if getattr(request.state, "is_guest", False):
        try:
            weather_data = get_weather_report()
        except Exception:
            weather_data = {}
        curated_movies = [
            {
                "title": "Interstellar",
                "year": "2014",
                "director": "Christopher Nolan",
                "genre": "Sci-Fi / Drame",
                "rating": 8.7,
                "poster": "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
                "backdrop": "https://image.tmdb.org/t/p/w1280/xJHokMbljvjADYdit5fK5VQsXEG.jpg",
                "synopsis": "Une équipe d'explorateurs voyage à travers un trou de ver pour assurer la survie de l'humanité."
            },
            {
                "title": "Dune : Deuxième Partie",
                "year": "2024",
                "director": "Denis Villeneuve",
                "genre": "Science-Fiction / Aventure",
                "rating": 8.6,
                "poster": "https://image.tmdb.org/t/p/w500/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg",
                "backdrop": "https://image.tmdb.org/t/p/w1280/xOMo8BRK7PfcJv9JCnx7s520bne.jpg",
                "synopsis": "Paul Atréides s'unit à Chani et aux Fremen pour mener la révolte contre les conspirateurs."
            },
            {
                "title": "Le Voyage de Chihiro",
                "year": "2001",
                "director": "Hayao Miyazaki",
                "genre": "Animation / Fantastique",
                "rating": 8.6,
                "poster": "https://image.tmdb.org/t/p/w500/dL11niApZXKLWrmAhv1Z5w27Zq4.jpg",
                "backdrop": "https://image.tmdb.org/t/p/w1280/mSDsSDwaP3E7dEfUPWy4J0djt4O.jpg",
                "synopsis": "Chihiro, une fillette de dix ans, s'aventure dans un monde magique gouverné par des esprits."
            }
        ]
        day_of_year = datetime.now().timetuple().tm_yday
        movie_pick = curated_movies[day_of_year % len(curated_movies)]
        return {
            "weather": weather_data,
            "movie_pick": movie_pick,
            "movie_pitch": f"Chef-d'œuvre cinématographique sélectionné pour votre session invité ({movie_pick['title']}).",
            "is_guest": True,
            "today": datetime.now().strftime("%Y-%m-%d")
        }

    current_time = time.time()
    if not force and HUB_CACHE["data"] and (current_time - HUB_CACHE["timestamp"]) < 1800:
        return HUB_CACHE["data"]

    # 1. Récupération sécurisée des données des différents modules
    try:
        weather_data = get_weather_report()
    except Exception as e:
        logger.warning(f"Hub: erreur weather: {e}")
        weather_data = {}

    try:
        news_briefing = get_news_briefing()
    except Exception as e:
        logger.warning(f"Hub: erreur news: {e}")
        news_briefing = {}

    try:
        electricity_stats = get_electricity_stats()
    except Exception as e:
        logger.warning(f"Hub: erreur electricity: {e}")
        electricity_stats = {}

    # 2. Suggestion Film / Série (depuis sélection de chefs d'œuvre)
    curated_movies = [
        {
            "title": "Interstellar",
            "year": "2014",
            "director": "Christopher Nolan",
            "genre": "Sci-Fi / Drame",
            "rating": 8.7,
            "poster": "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
            "backdrop": "https://image.tmdb.org/t/p/w1280/xJHokMbljvjADYdit5fK5VQsXEG.jpg",
            "synopsis": "Une équipe d'explorateurs voyage à travers un trou de ver pour assurer la survie de l'humanité."
        },
        {
            "title": "Dune : Deuxième Partie",
            "year": "2024",
            "director": "Denis Villeneuve",
            "genre": "Science-Fiction / Aventure",
            "rating": 8.6,
            "poster": "https://image.tmdb.org/t/p/w500/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg",
            "backdrop": "https://image.tmdb.org/t/p/w1280/xOMo8BRK7PfcJv9JCnx7s520bne.jpg",
            "synopsis": "Paul Atréides s'unit à Chani et aux Fremen pour mener la révolte contre les conspirateurs."
        },
        {
            "title": "Oppenheimer",
            "year": "2023",
            "director": "Christopher Nolan",
            "genre": "Biopic / Histoire",
            "rating": 8.9,
            "poster": "https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
            "backdrop": "https://image.tmdb.org/t/p/w1280/fm6KqXpk3M2HVveHwCrBSSBaO0V.jpg",
            "synopsis": "L'histoire captivante du physicien J. Robert Oppenheimer et du Projet Manhattan."
        },
        {
            "title": "Le Voyage de Chihiro",
            "year": "2001",
            "director": "Hayao Miyazaki",
            "genre": "Animation / Fantastique",
            "rating": 8.6,
            "poster": "https://image.tmdb.org/t/p/w500/dL11niApZXKLWrmAhv1Z5w27Zq4.jpg",
            "backdrop": "https://image.tmdb.org/t/p/w1280/mSDsSDwaP3E7dEfUPWy4J0djt4O.jpg",
            "synopsis": "Chihiro, une fillette de dix ans, s'aventure dans un monde magique gouverné par des esprits."
        }
    ]
    day_of_year = datetime.now().timetuple().tm_yday
    movie_pick = curated_movies[day_of_year % len(curated_movies)]

    # 3. Données domotique statiques (en développement pour Home Assistant)
    domotique_data = {
        "status": "normal",
        "doors_closed": True,
        "doors_label": "Toutes les portes sont verrouillées",
        "lights_on_count": 2,
        "inside_temp": 21.4,
        "alarm_active": True,
        "alarm_label": "Système d'alarme armé",
        "in_development": True
    }

    # 4. Synthèse globale
    cfg = get_weather_config_db()
    gemini_key = cfg.get("gemini_api_key")
    
    hour = datetime.now().hour
    greeting_prefix = "Bonsoir Victor" if hour >= 18 else "Bonjour Victor"

    w_temp = (weather_data or {}).get("synthesis", {}).get("consensus_temp", 21)
    w_cond = (weather_data or {}).get("synthesis", {}).get("consensus_condition", "agréable")
    n_takeaway = ((news_briefing or {}).get("briefing") or {}).get("global_takeaway", "Actualités nationales et internationales actives")
    
    this_m = (electricity_stats or {}).get("this_month", {})
    e_cost = this_m.get("current_cost", 0)
    e_target = this_m.get("target_budget", 60)
    e_status = "dans les clous" if not this_m.get("is_over_budget") else "légèrement en dépassement"

    executive_summary = f"Aujourd'hui, comptez sur {w_temp}°C sous un ciel {w_cond}. L'actu majeure reste : {n_takeaway[:90]}. Votre budget énergie est {e_status}."
    movie_pitch = f"Pour votre soirée : découvrez ou revoyez {movie_pick['title']} ({movie_pick['genre']})."

    # Si la synthèse IA météo ou actualités a déjà tourné, on compose un message direct et rapide pour éviter de surcharger le quota Gemini
    if gemini_key and force:
        prompt = f"""Tu es l'assistant personnel intelligent de VicozWorld.
Voici le point du jour :
- Météo : {w_temp}°C, {w_cond}
- Actualité : {n_takeaway}
- Énergie : budget {e_status} ({e_cost} € consommés / {e_target} € cible)
- Film suggéré : {movie_pick['title']} ({movie_pick['genre']}, {movie_pick['year']})

Rédige un message d'accueil exécutif très fluide de 2 phrases (élégant, chaleureux) et une phrase d'accroche pour le film.
Réponds STRICTEMENT au format JSON :
{{
  "greeting": "{greeting_prefix}",
  "executive_summary": "texte de 2 phrases bien rédigées",
  "movie_pitch": "phrase d'accroche pour le film"
}}"""
        parsed_exec = call_gemini_json_api(prompt, gemini_key)
        if parsed_exec:
            greeting_prefix = parsed_exec.get("greeting", greeting_prefix)
            executive_summary = parsed_exec.get("executive_summary", executive_summary)
            movie_pitch = parsed_exec.get("movie_pitch", movie_pitch)

    result = {
        "greeting": greeting_prefix,
        "executive_summary": executive_summary,
        "movie_pitch": movie_pitch,
        "weather": weather_data,
        "news": news_briefing,
        "electricity": electricity_stats,
        "movie_pick": movie_pick,
        "domotique": domotique_data,
        "generated_at": current_time
    }

    HUB_CACHE["timestamp"] = current_time
    HUB_CACHE["data"] = result
    return result


class HubPermissionsRequest(BaseModel):
    allowed_modules: List[str]

PERMISSIONS_FILE = os.path.join(DB_DIR, "hub_permissions.json")

@app.get("/api/hub/permissions")
def get_hub_permissions():
    """Retourne la liste des modules autorisés pour Maman (Claire) synchronisée sur le serveur."""
    if os.path.exists(PERMISSIONS_FILE):
        try:
            with open(PERMISSIONS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.warning(f"Erreur lecture {PERMISSIONS_FILE}: {e}")
    # Valeurs par défaut si le fichier n'existe pas encore
    return {"allowed_modules": ["cinematheque", "quiz", "extracteur_texte", "editeur_pdf", "convertisseur_excel", "notes", "genealogie"]}

@app.post("/api/hub/permissions")
def set_hub_permissions(req: HubPermissionsRequest):
    """Enregistre la liste des modules autorisés pour Maman (Claire) sur le serveur."""
    data = {"allowed_modules": req.allowed_modules}
    try:
        with open(PERMISSIONS_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        return {"status": "ok", "allowed_modules": req.allowed_modules}
    except Exception as e:
        logger.error(f"Erreur écriture {PERMISSIONS_FILE}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class HubUrlsRequest(BaseModel):
    urls: Dict[str, str]

URLS_FILE = os.path.join(DB_DIR, "hub_urls.json")

@app.get("/api/hub/urls")
def get_hub_urls():
    """Retourne les URLs personnalisées des applications du Hub."""
    if os.path.exists(URLS_FILE):
        try:
            with open(URLS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.warning(f"Erreur lecture {URLS_FILE}: {e}")
    return {"urls": {}}

@app.post("/api/hub/urls")
def set_hub_urls(req: HubUrlsRequest):
    """Enregistre les URLs personnalisées des applications du Hub."""
    data = {"urls": req.urls}
    try:
        with open(URLS_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        return {"status": "ok", "urls": req.urls}
    except Exception as e:
        logger.error(f"Erreur écriture {URLS_FILE}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def get_server_battery():
    """Récupère l'état et le pourcentage de batterie du PC portable serveur hôte."""
    power_supply_path = "/sys/class/power_supply"
    
    # 1. Analyse complète de l'arborescence sysfs Linux (/sys/class/power_supply)
    if os.path.exists(power_supply_path):
        try:
            items = os.listdir(power_supply_path)
            # Chercher tout périphérique de type batterie
            for item in sorted(items):
                item_dir = os.path.join(power_supply_path, item)
                if not os.path.isdir(item_dir):
                    continue

                type_file = os.path.join(item_dir, "type")
                is_battery = item.lower().startswith("bat")
                if os.path.exists(type_file):
                    try:
                        with open(type_file, "r") as tf:
                            if "battery" in tf.read().strip().lower():
                                is_battery = True
                    except Exception:
                        pass

                if is_battery:
                    cap_file = os.path.join(item_dir, "capacity")
                    status_file = os.path.join(item_dir, "status")
                    percentage = None

                    # A. Lecture directe du pourcentage
                    if os.path.exists(cap_file):
                        try:
                            with open(cap_file, "r") as f:
                                percentage = int(f.read().strip())
                        except Exception:
                            pass

                    # B. Calcul via energy_now / energy_full si capacity n'existe pas
                    if percentage is None:
                        en_now = os.path.join(item_dir, "energy_now")
                        en_full = os.path.join(item_dir, "energy_full")
                        if os.path.exists(en_now) and os.path.exists(en_full):
                            try:
                                with open(en_now, "r") as f1, open(en_full, "r") as f2:
                                    percentage = round((float(f1.read().strip()) / float(f2.read().strip())) * 100)
                            except Exception:
                                pass

                    # C. Calcul via charge_now / charge_full
                    if percentage is None:
                        ch_now = os.path.join(item_dir, "charge_now")
                        ch_full = os.path.join(item_dir, "charge_full")
                        if os.path.exists(ch_now) and os.path.exists(ch_full):
                            try:
                                with open(ch_now, "r") as f1, open(ch_full, "r") as f2:
                                    percentage = round((float(f1.read().strip()) / float(f2.read().strip())) * 100)
                            except Exception:
                                pass

                    if percentage is not None:
                        status = "Inconnu"
                        if os.path.exists(status_file):
                            try:
                                with open(status_file, "r") as f:
                                    status = f.read().strip()
                            except Exception:
                                pass

                        status_lower = status.lower()
                        # "Charging" = activement en charge
                        # "Not charging" = seuil atteint (ex: 80%) ou pas de charge
                        # "Full" = batterie pleine à 100%
                        # "Discharging" = débranché, sur batterie
                        is_charging = status_lower == "charging"
                        plugged_in = status_lower in ["charging", "full", "not charging"]

                        pct = max(0, min(100, percentage))
                        return {
                            "available": True,
                            "percentage": pct,
                            "percent": pct,
                            "status": status,
                            "is_charging": is_charging,
                            "plugged_in": plugged_in,
                            "plugged": plugged_in,
                            "device": item
                        }
        except Exception as e:
            logger.warning(f"Erreur lecture sysfs batterie: {e}")

    # 2. Fallback avec psutil
    try:
        import psutil
        bat = psutil.sensors_battery()
        if bat is not None and bat.percent is not None:
            is_charging = bool(bat.power_plugged) and bat.percent < 99
            pct = round(bat.percent)
            plugged_in = bool(bat.power_plugged)
            return {
                "available": True,
                "percentage": pct,
                "percent": pct,
                "status": "En charge" if is_charging else ("Sur secteur" if plugged_in else "Sur batterie"),
                "is_charging": is_charging,
                "plugged_in": plugged_in,
                "plugged": plugged_in,
                "device": "psutil"
            }
    except Exception as e:
        logger.debug(f"psutil batterie non disponible: {e}")

    # 3. Fallback : Serveur connecté sur secteur
    return {
        "available": True,
        "percentage": 100,
        "percent": 100,
        "status": "Sur secteur 🔌",
        "is_charging": False,
        "plugged_in": True,
        "plugged": True,
        "device": "AC"
    }


@app.get("/api/hub/battery")
def get_hub_battery():
    """Endpoint API pour récupérer le niveau de batterie du PC serveur."""
    return get_server_battery()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)





