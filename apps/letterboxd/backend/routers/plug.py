"""
Router Prise Connectée / Domotique : /api/hub/plug/*
Pilote les ventilateurs de refroidissement du PC serveur (TP-Link Tapo P100)
via l'API REST de Home Assistant.

🔒 CONFIGURATION 100% .ENV :
Toutes les informations (URL, Token, Entité) sont lues STRICTEMENT depuis
les variables d'environnement (.env). Aucune donnée n'est stockée en base de données.
"""
import os
import json
import ssl
import logging
import urllib.request
import urllib.error
from typing import Optional
from fastapi import APIRouter, HTTPException

from models import PlugSetStateRequest

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/hub/plug", tags=["plug"])

# Cache mémoire léger de secours (en cas de coupure temporaire de Home Assistant)
_LAST_STATE = "off"


def _get_plug_config() -> dict:
    """Lit la configuration de la prise STRICTEMENT depuis le fichier .env."""
    url = os.getenv("HASS_URL", "").strip().rstrip("/")
    token = os.getenv("HASS_TOKEN", "").strip()
    entity_id = os.getenv("HASS_PLUG_ENTITY_ID", "switch.prise_serveur").strip()
    return {
        "hass_url": url,
        "hass_token": token,
        "entity_id": entity_id,
        "name": "Ventilos Serveur",
        "device_model": "TP-Link P100",
        "room": "Salon",
    }


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
        # Tentative fallback avec domain homeassistant générique
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
    Retourne l'état en direct vérifié des ventilateurs de refroidissement.
    Lit l'état directement depuis Home Assistant.
    """
    global _LAST_STATE
    cfg = _get_plug_config()
    hass_url = cfg["hass_url"]
    hass_token = cfg["hass_token"]
    entity_id = cfg["entity_id"]

    has_credentials = bool(hass_url and hass_token)

    if has_credentials:
        hass_data = _query_hass_state(hass_url, hass_token, entity_id)
        if hass_data:
            raw_state = str(hass_data.get("state", "")).lower().strip()
            if raw_state == "on":
                is_on = True
                clean_state = "on"
            elif raw_state == "off":
                is_on = False
                clean_state = "off"
            else:
                is_on = False
                clean_state = raw_state or "unavailable"

            if clean_state in ("on", "off"):
                _LAST_STATE = clean_state

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
            return {
                "configured": True,
                "connected": False,
                "available": False,
                "state": _LAST_STATE,
                "is_on": _LAST_STATE == "on",
                "name": cfg["name"],
                "entity_id": entity_id,
                "device_model": cfg["device_model"],
                "room": cfg["room"],
                "warning": "Home Assistant configuré dans le .env mais injoignable.",
            }

    # Non configuré dans le .env
    return {
        "configured": False,
        "connected": False,
        "available": True,
        "state": _LAST_STATE,
        "is_on": _LAST_STATE == "on",
        "name": cfg["name"],
        "entity_id": entity_id,
        "device_model": cfg["device_model"],
        "room": cfg["room"],
        "hint": "Ajoutez HASS_URL et HASS_TOKEN dans votre fichier .env pour activer la synchronisation.",
    }


@router.post("/set")
def set_plug_state(req: PlugSetStateRequest):
    """
    Définit explicitement l'état des ventilateurs ('on' pour allumer, 'off' pour éteindre).
    Commande IDEMPOTENTE : impossible de basculer dans le mauvais sens.
    """
    global _LAST_STATE
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
        final_state = target

    _LAST_STATE = final_state

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
    Inverse l'état des ventilateurs.
    Détermine l'état courant réel pour envoyer l'action inverse explicite (turn_off si ON, turn_on si OFF).
    """
    global _LAST_STATE
    cfg = _get_plug_config()
    hass_url = cfg["hass_url"]
    hass_token = cfg["hass_token"]
    entity_id = cfg["entity_id"]

    current_state = _LAST_STATE
    if hass_url and hass_token:
        live = _query_hass_state(hass_url, hass_token, entity_id)
        if live and live.get("state") in ("on", "off"):
            current_state = live["state"]

    target_state = "off" if current_state == "on" else "on"
    service = "turn_off" if current_state == "on" else "turn_on"

    if hass_url and hass_token:
        success, confirmed_state = _call_hass_service(hass_url, hass_token, service, entity_id)
        if not success:
            raise HTTPException(status_code=502, detail="Échec de la commande vers Home Assistant.")
        final_state = confirmed_state if confirmed_state in ("on", "off") else target_state
    else:
        final_state = target_state

    _LAST_STATE = final_state

    return {
        "success": True,
        "state": final_state,
        "is_on": final_state == "on",
        "name": cfg["name"],
        "entity_id": entity_id,
    }


@router.get("/config")
def get_plug_config():
    """Retourne la configuration active issue du .env."""
    cfg = _get_plug_config()
    has_token = bool(cfg["hass_token"])

    return {
        "hass_url": cfg["hass_url"],
        "entity_id": cfg["entity_id"],
        "name": cfg["name"],
        "device_model": cfg["device_model"],
        "room": cfg["room"],
        "has_token": has_token,
        "token_source": "Fichier .env (HASS_TOKEN)",
    }
