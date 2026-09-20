"""
Router Prise Connectée / Domotique : /api/hub/plug/*
Pilote la 'Prise Serveur' (TP-Link Tapo P100) via l'API REST de Home Assistant.

🔒 SÉCURITÉ :
Le jeton d'accès (HASS_TOKEN) est lu EXCLUSIVEMENT depuis les variables
d'environnement (.env) et n'est JAMAIS persisté en base de données SQLite.
"""
import os
import json
import ssl
import time
import logging
import urllib.request
import urllib.error
from typing import Optional
from fastapi import APIRouter, HTTPException

from database import get_db_ctx
from models import PlugConfigRequest, PlugSetStateRequest

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/hub/plug", tags=["plug"])


def _get_env_token() -> str:
    """Récupère le jeton Home Assistant STRICTEMENT depuis la variable d'environnement."""
    return os.getenv("HASS_TOKEN", "").strip()


def _get_plug_config() -> dict:
    """
    Lit la configuration de la prise.
    L'URL et l'entity_id proviennent de SQLite ou des variables d'environnement.
    Le token provient EXCLUSIVEMENT de os.getenv('HASS_TOKEN').
    """
    with get_db_ctx() as conn:
        row = conn.execute(
            """
            SELECT hass_url, entity_id, name, device_model, room, last_known_state
            FROM plug_settings WHERE id = 1
            """
        ).fetchone()

    env_url = os.getenv("HASS_URL", "").strip()
    env_entity = os.getenv("HASS_PLUG_ENTITY_ID", "").strip()
    token = _get_env_token()

    if row:
        d = dict(row)
        url = d.get("hass_url") or env_url
        entity = d.get("entity_id") or env_entity or "switch.prise_serveur"
        return {
            "hass_url": url.rstrip("/"),
            "hass_token": token,  # Strictement depuis l'env
            "entity_id": entity,
            "name": d.get("name") or "Ventilos Serveur",
            "device_model": d.get("device_model") or "TP-Link P100",
            "room": d.get("room") or "Salon",
            "last_known_state": d.get("last_known_state") or "off",
        }

    return {
        "hass_url": env_url.rstrip("/"),
        "hass_token": token,
        "entity_id": env_entity or "switch.prise_serveur",
        "name": "Ventilos Serveur",
        "device_model": "TP-Link P100",
        "room": "Salon",
        "last_known_state": "off",
    }


def _update_last_known_state(state: str):
    """Met à jour le dernier état connu de la prise en base SQLite."""
    clean_state = "on" if state.lower() == "on" else "off"
    try:
        with get_db_ctx() as conn:
            conn.execute(
                "UPDATE plug_settings SET last_known_state = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1",
                (clean_state,),
            )
            conn.commit()
    except Exception as e:
        logger.warning(f"Erreur mise à jour last_known_state: {e}")


def _query_hass_state(hass_url: str, hass_token: str, entity_id: str) -> Optional[dict]:
    """Interroge Home Assistant pour récupérer l'état exact de l'entité."""
    if not hass_url or not hass_token or not entity_id:
        return None

    endpoint = f"{hass_url}/api/states/{entity_id}"
    ctx = ssl.create_default_context()
    req = urllib.request.Request(
        endpoint,
        headers={
            "Authorization": f"Bearer {hass_token}",
            "Content-Type": "application/json",
            "User-Agent": "VicozWorld/1.0",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=3.0, context=ctx) as resp:
            if resp.status == 200:
                return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        logger.warning(f"Home Assistant HTTP {e.code} pour {entity_id}: {e}")
    except Exception as e:
        logger.warning(f"Home Assistant inaccessible ({hass_url}): {e}")
    return None


def _call_hass_service(hass_url: str, hass_token: str, service: str, entity_id: str) -> tuple[bool, Optional[str]]:
    """
    Appelle un service de commutation Home Assistant de manière explicite (turn_on ou turn_off).
    Retourne (succès: bool, nouvel_état: Optional[str]).
    """
    if not hass_url or not hass_token:
        return False, None

    domain = entity_id.split(".")[0] if "." in entity_id else "switch"
    endpoint = f"{hass_url}/api/services/{domain}/{service}"
    payload = json.dumps({"entity_id": entity_id}).encode("utf-8")
    ctx = ssl.create_default_context()
    req = urllib.request.Request(
        endpoint,
        data=payload,
        headers={
            "Authorization": f"Bearer {hass_token}",
            "Content-Type": "application/json",
            "User-Agent": "VicozWorld/1.0",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=4.5, context=ctx) as resp:
            if resp.status in (200, 201):
                raw = resp.read().decode("utf-8")
                # Home Assistant renvoie généralement une liste d'entités modifiées
                try:
                    data = json.loads(raw)
                    if isinstance(data, list):
                        for item in data:
                            if item.get("entity_id") == entity_id:
                                return True, item.get("state")
                except Exception:
                    pass
                return True, None
    except Exception as e:
        logger.error(f"Erreur appel service Home Assistant {domain}/{service}: {e}")
        # Tentative fallback avec domain homeassistant
        try:
            fallback_url = f"{hass_url}/api/services/homeassistant/{service}"
            fb_req = urllib.request.Request(
                fallback_url,
                data=payload,
                headers={"Authorization": f"Bearer {hass_token}", "Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(fb_req, timeout=4.5, context=ctx) as fb_resp:
                if fb_resp.status in (200, 201):
                    return True, None
        except Exception:
            pass

    return False, None


# ─── Endpoints API ────────────────────────────────────────────────────────────

@router.get("")
def get_plug_status():
    """
    Retourne l'état en direct vérifié de la Prise Serveur.
    Priorité absolue à l'état réel rapporté par Home Assistant.
    """
    cfg = _get_plug_config()
    hass_url = cfg["hass_url"]
    hass_token = cfg["hass_token"]
    entity_id = cfg["entity_id"]
    last_known = cfg["last_known_state"]

    has_credentials = bool(hass_url and hass_token)

    if has_credentials:
        hass_data = _query_hass_state(hass_url, hass_token, entity_id)
        if hass_data:
            raw_state = str(hass_data.get("state", "")).lower().strip()
            # Dans Home Assistant, les états valides d'un commutateur sont 'on' ou 'off'
            if raw_state == "on":
                is_on = True
                clean_state = "on"
            elif raw_state == "off":
                is_on = False
                clean_state = "off"
            else:
                # Appareil indisponible ou inconnu (ex: 'unavailable')
                is_on = False
                clean_state = raw_state or "unavailable"

            if clean_state in ("on", "off"):
                _update_last_known_state(clean_state)

            return {
                "configured": True,
                "connected": True,
                "available": clean_state not in ("unavailable", "unknown"),
                "state": clean_state,
                "is_on": is_on,
                "name": cfg["name"],
                "entity_id": entity_id,
                "device_model": cfg["device_model"],
                "room": cfg["room"],
                "friendly_name": hass_data.get("attributes", {}).get("friendly_name", cfg["name"]),
                "last_changed": hass_data.get("last_changed"),
                "last_updated": hass_data.get("last_updated"),
            }
        else:
            # Home Assistant configuré mais requête échouée
            return {
                "configured": True,
                "connected": False,
                "available": False,
                "state": last_known,
                "is_on": last_known == "on",
                "name": cfg["name"],
                "entity_id": entity_id,
                "device_model": cfg["device_model"],
                "room": cfg["room"],
                "warning": "Home Assistant configuré mais injoignable.",
            }

    # Non configuré : mode local autonome
    return {
        "configured": False,
        "connected": False,
        "available": True,
        "state": last_known,
        "is_on": last_known == "on",
        "name": cfg["name"],
        "entity_id": entity_id,
        "device_model": cfg["device_model"],
        "room": cfg["room"],
        "hint": "Ajoutez HASS_URL et HASS_TOKEN dans votre fichier .env pour synchroniser la prise en direct.",
    }


@router.post("/set")
def set_plug_state(req: PlugSetStateRequest):
    """
    Définit explicitement l'état de la prise ('on' pour allumer, 'off' pour éteindre).
    Commande IDEMPOTENTE : impossible de basculer dans le mauvais sens.
    """
    target = req.state.lower().strip()
    if target not in ("on", "off"):
        raise HTTPException(status_code=400, detail="L'état doit être 'on' ou 'off'.")

    cfg = _get_plug_config()
    hass_url = cfg["hass_url"]
    hass_token = cfg["hass_token"]
    entity_id = cfg["entity_id"]
    service = "turn_on" if target == "on" else "turn_off"

    if hass_url and hass_token:
        success, confirmed_state = _call_hass_service(hass_url, hass_token, service, entity_id)
        if not success:
            raise HTTPException(status_code=502, detail="Échec de la commande vers Home Assistant.")
        final_state = confirmed_state if confirmed_state in ("on", "off") else target
    else:
        # Mode autonome
        final_state = target
        success = True

    _update_last_known_state(final_state)

    return {
        "success": True,
        "state": final_state,
        "is_on": final_state == "on",
        "name": cfg["name"],
        "entity_id": entity_id,
    }


@router.post("/toggle")
def toggle_plug():
    """
    Inverse l'état de la prise.
    Détermine l'état courant réel pour envoyer l'action inverse explicite (turn_off si ON, turn_on si OFF).
    """
    cfg = _get_plug_config()
    hass_url = cfg["hass_url"]
    hass_token = cfg["hass_token"]
    entity_id = cfg["entity_id"]

    # 1. Déterminer l'état actuel de manière fiable
    current_state = cfg["last_known_state"]
    if hass_url and hass_token:
        live = _query_hass_state(hass_url, hass_token, entity_id)
        if live and live.get("state") in ("on", "off"):
            current_state = live["state"]

    # 2. Inverser vers l'état cible déterministe
    target_state = "off" if current_state == "on" else "on"
    service = "turn_off" if current_state == "on" else "turn_on"

    if hass_url and hass_token:
        success, confirmed_state = _call_hass_service(hass_url, hass_token, service, entity_id)
        if not success:
            raise HTTPException(status_code=502, detail="Échec de la commande vers Home Assistant.")
        final_state = confirmed_state if confirmed_state in ("on", "off") else target_state
    else:
        final_state = target_state
        success = True

    _update_last_known_state(final_state)

    return {
        "success": True,
        "state": final_state,
        "is_on": final_state == "on",
        "name": cfg["name"],
        "entity_id": entity_id,
    }


@router.get("/config")
def get_plug_config():
    """
    Retourne la configuration actuelle.
    Ne renvoie JAMAIS le token, confirme simplement s'il est présent dans .env.
    """
    cfg = _get_plug_config()
    has_token = bool(cfg["hass_token"])

    return {
        "hass_url": cfg["hass_url"],
        "entity_id": cfg["entity_id"],
        "name": cfg["name"],
        "device_model": cfg["device_model"],
        "room": cfg["room"],
        "has_token": has_token,
        "token_source": "Variable d'environnement HASS_TOKEN (.env)" if has_token else "Non configuré",
    }


@router.post("/config")
def save_plug_config(req: PlugConfigRequest):
    """
    Enregistre les paramètres non sensibles (URL, entité, nom, pièce) en SQLite.
    🔒 LE TOKEN N'EST JAMAIS STOCKÉ EN BASE DE DONNÉES.
    """
    current_cfg = _get_plug_config()
    new_url = (req.hass_url if req.hass_url is not None else current_cfg["hass_url"]).strip().rstrip("/")
    new_entity = (req.entity_id or current_cfg["entity_id"]).strip()
    new_name = (req.name or current_cfg["name"]).strip()
    new_model = (req.device_model or current_cfg["device_model"]).strip()
    new_room = (req.room or current_cfg["room"]).strip()

    with get_db_ctx() as conn:
        conn.execute(
            """
            INSERT INTO plug_settings (id, hass_url, hass_token, entity_id, name, device_model, room, updated_at)
            VALUES (1, ?, '', ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(id) DO UPDATE SET
                hass_url = excluded.hass_url,
                hass_token = '',
                entity_id = excluded.entity_id,
                name = excluded.name,
                device_model = excluded.device_model,
                room = excluded.room,
                updated_at = CURRENT_TIMESTAMP
            """,
            (new_url, new_entity, new_name, new_model, new_room),
        )
        conn.commit()

    return {
        "success": True,
        "message": "Configuration enregistrée avec succès. Le jeton d'accès reste protégé dans le fichier .env.",
    }
