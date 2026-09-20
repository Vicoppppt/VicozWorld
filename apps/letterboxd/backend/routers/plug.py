"""
Router Prise Connectée / Domotique : /api/hub/plug/*
Permet de piloter la 'Prise Serveur' (TP-Link P100) via l'API REST de Home Assistant.
"""
import os
import json
import ssl
import logging
import urllib.request
import urllib.error
from typing import Optional
from fastapi import APIRouter, HTTPException

from database import get_db_ctx
from models import PlugConfigRequest, PlugSetStateRequest

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/hub/plug", tags=["plug"])


def _get_plug_config_from_db() -> dict:
    """Lit la configuration de la prise depuis SQLite avec fallback variables d'environnement."""
    with get_db_ctx() as conn:
        row = conn.execute(
            """
            SELECT hass_url, hass_token, entity_id, name, device_model, room, last_known_state
            FROM plug_settings WHERE id = 1
            """
        ).fetchone()

    env_url = os.getenv("HASS_URL", "").strip()
    env_token = os.getenv("HASS_TOKEN", "").strip()
    env_entity = os.getenv("HASS_PLUG_ENTITY_ID", "").strip()

    if row:
        d = dict(row)
        # Préférer l'URL/Token de la DB s'ils sont renseignés, sinon utiliser les variables d'environnement
        if not d.get("hass_url") and env_url:
            d["hass_url"] = env_url
        if not d.get("hass_token") and env_token:
            d["hass_token"] = env_token
        if env_entity and (not d.get("entity_id") or d.get("entity_id") == "switch.prise_serveur"):
            d["entity_id"] = env_entity
        return d

    return {
        "hass_url": env_url,
        "hass_token": env_token,
        "entity_id": env_entity or "switch.prise_serveur",
        "name": "Prise Serveur",
        "device_model": "TP-Link P100",
        "room": "Salon",
        "last_known_state": "on",
    }


def _update_last_known_state(state: str):
    """Met à jour le dernier état connu de la prise en base."""
    try:
        with get_db_ctx() as conn:
            conn.execute(
                "UPDATE plug_settings SET last_known_state = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1",
                (state,),
            )
            conn.commit()
    except Exception as e:
        logger.warning(f"Erreur mise à jour last_known_state: {e}")


def _query_hass_state(hass_url: str, hass_token: str, entity_id: str) -> Optional[dict]:
    """Interroge Home Assistant pour récupérer l'état d'une entité."""
    if not hass_url or not hass_token or not entity_id:
        return None

    clean_url = hass_url.rstrip("/")
    endpoint = f"{clean_url}/api/states/{entity_id}"
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
        with urllib.request.urlopen(req, timeout=3.5, context=ctx) as resp:
            if resp.status == 200:
                return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        logger.warning(f"Home Assistant HTTP {e.code} pour {entity_id}: {e}")
    except Exception as e:
        logger.warning(f"Home Assistant inaccessible ({clean_url}): {e}")
    return None


def _call_hass_service(hass_url: str, hass_token: str, domain: str, service: str, entity_id: str) -> bool:
    """Appelle un service Home Assistant (ex: switch/turn_on, switch/toggle)."""
    if not hass_url or not hass_token:
        return False

    clean_url = hass_url.rstrip("/")
    endpoint = f"{clean_url}/api/services/{domain}/{service}"
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
        with urllib.request.urlopen(req, timeout=5.0, context=ctx) as resp:
            return resp.status in (200, 201)
    except Exception as e:
        logger.error(f"Erreur appel service Home Assistant {domain}/{service}: {e}")
        return False


# ─── Endpoints API ────────────────────────────────────────────────────────────

@router.get("")
def get_plug_status():
    """
    Retourne l'état en direct de la Prise Serveur.
    Interroge Home Assistant si configuré, sinon renvoie le dernier état connu.
    """
    cfg = _get_plug_config_from_db()
    hass_url = cfg.get("hass_url", "").strip()
    hass_token = cfg.get("hass_token", "").strip()
    entity_id = cfg.get("entity_id", "switch.prise_serveur").strip()
    last_known = cfg.get("last_known_state", "on")

    has_credentials = bool(hass_url and hass_token)

    if has_credentials:
        hass_data = _query_hass_state(hass_url, hass_token, entity_id)
        if hass_data:
            raw_state = hass_data.get("state", "unknown")
            is_on = raw_state == "on"
            _update_last_known_state(raw_state)
            return {
                "configured": True,
                "connected": True,
                "state": raw_state,
                "is_on": is_on,
                "name": cfg.get("name", "Prise Serveur"),
                "entity_id": entity_id,
                "device_model": cfg.get("device_model", "TP-Link P100"),
                "room": cfg.get("room", "Salon"),
                "friendly_name": hass_data.get("attributes", {}).get("friendly_name", cfg.get("name")),
                "last_changed": hass_data.get("last_changed"),
                "last_updated": hass_data.get("last_updated"),
            }
        else:
            # Home Assistant configuré mais temporairement injoignable
            return {
                "configured": True,
                "connected": False,
                "state": last_known,
                "is_on": last_known == "on",
                "name": cfg.get("name", "Prise Serveur"),
                "entity_id": entity_id,
                "device_model": cfg.get("device_model", "TP-Link P100"),
                "room": cfg.get("room", "Salon"),
                "warning": "Home Assistant configuré mais injoignable (dernier état conservé).",
            }

    # Non configuré : renvoie les données par défaut
    return {
        "configured": False,
        "connected": False,
        "state": last_known,
        "is_on": last_known == "on",
        "name": cfg.get("name", "Prise Serveur"),
        "entity_id": entity_id,
        "device_model": cfg.get("device_model", "TP-Link P100"),
        "room": cfg.get("room", "Salon"),
        "hint": "Configurez l'URL et le jeton Home Assistant pour synchroniser la prise en direct.",
    }


@router.post("/toggle")
def toggle_plug():
    """
    Inverse l'état de la prise (ON <-> OFF).
    Déclenche l'action sur Home Assistant si connecté.
    """
    cfg = _get_plug_config_from_db()
    hass_url = cfg.get("hass_url", "").strip()
    hass_token = cfg.get("hass_token", "").strip()
    entity_id = cfg.get("entity_id", "switch.prise_serveur").strip()
    last_known = cfg.get("last_known_state", "on")

    target_domain = entity_id.split(".")[0] if "." in entity_id else "switch"

    if hass_url and hass_token:
        success = _call_hass_service(hass_url, hass_token, target_domain, "toggle", entity_id)
        if not success:
            # Fallback vers domain homeassistant générique
            success = _call_hass_service(hass_url, hass_token, "homeassistant", "toggle", entity_id)

        # Vérifier l'état résultant
        new_hass_data = _query_hass_state(hass_url, hass_token, entity_id)
        if new_hass_data:
            new_state = new_hass_data.get("state", "off" if last_known == "on" else "on")
        else:
            new_state = "off" if last_known == "on" else "on"
    else:
        # Mode autonome / hors ligne : inverse simplement l'état local
        new_state = "off" if last_known == "on" else "on"
        success = True

    _update_last_known_state(new_state)

    return {
        "success": success,
        "state": new_state,
        "is_on": new_state == "on",
        "name": cfg.get("name", "Prise Serveur"),
        "entity_id": entity_id,
    }


@router.post("/set")
def set_plug_state(req: PlugSetStateRequest):
    """Force l'état de la prise ('on' ou 'off')."""
    target_state = req.state.lower().strip()
    if target_state not in ("on", "off"):
        raise HTTPException(status_code=400, detail="L'état doit être 'on' ou 'off'.")

    cfg = _get_plug_config_from_db()
    hass_url = cfg.get("hass_url", "").strip()
    hass_token = cfg.get("hass_token", "").strip()
    entity_id = cfg.get("entity_id", "switch.prise_serveur").strip()
    target_domain = entity_id.split(".")[0] if "." in entity_id else "switch"
    service = "turn_on" if target_state == "on" else "turn_off"

    if hass_url and hass_token:
        success = _call_hass_service(hass_url, hass_token, target_domain, service, entity_id)
        if not success:
            success = _call_hass_service(hass_url, hass_token, "homeassistant", service, entity_id)
    else:
        success = True

    _update_last_known_state(target_state)

    return {
        "success": success,
        "state": target_state,
        "is_on": target_state == "on",
        "entity_id": entity_id,
    }


@router.get("/config")
def get_plug_config():
    """Retourne la configuration actuelle de la prise (sans exposer le token en clair)."""
    cfg = _get_plug_config_from_db()
    token = cfg.get("hass_token", "")
    masked_token = (token[:6] + "..." + token[-4:]) if len(token) > 12 else ("******" if token else "")

    return {
        "hass_url": cfg.get("hass_url", ""),
        "entity_id": cfg.get("entity_id", "switch.prise_serveur"),
        "name": cfg.get("name", "Prise Serveur"),
        "device_model": cfg.get("device_model", "TP-Link P100"),
        "room": cfg.get("room", "Salon"),
        "has_token": bool(token),
        "masked_token": masked_token,
    }


@router.post("/config")
def save_plug_config(req: PlugConfigRequest):
    """Enregistre la configuration Home Assistant pour la prise."""
    current_cfg = _get_plug_config_from_db()
    new_url = (req.hass_url if req.hass_url is not None else current_cfg.get("hass_url", "")).strip()
    # Si le token envoyé est vide ou non fourni, conserver l'ancien token
    new_token = req.hass_token.strip() if (req.hass_token and req.hass_token.strip() and not req.hass_token.startswith("******")) else current_cfg.get("hass_token", "")
    new_entity = (req.entity_id or current_cfg.get("entity_id", "switch.prise_serveur")).strip()
    new_name = (req.name or current_cfg.get("name", "Prise Serveur")).strip()
    new_model = (req.device_model or current_cfg.get("device_model", "TP-Link P100")).strip()
    new_room = (req.room or current_cfg.get("room", "Salon")).strip()

    with get_db_ctx() as conn:
        conn.execute(
            """
            INSERT INTO plug_settings (id, hass_url, hass_token, entity_id, name, device_model, room, updated_at)
            VALUES (1, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(id) DO UPDATE SET
                hass_url = excluded.hass_url,
                hass_token = excluded.hass_token,
                entity_id = excluded.entity_id,
                name = excluded.name,
                device_model = excluded.device_model,
                room = excluded.room,
                updated_at = CURRENT_TIMESTAMP
            """,
            (new_url, new_token, new_entity, new_name, new_model, new_room),
        )
        conn.commit()

    return {"success": True, "message": "Configuration de la prise enregistrée avec succès."}
