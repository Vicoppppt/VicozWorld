"""
Module helper IA Gemini partagé entre les routers.
Contient call_gemini_json_api et get_ai_service_config.
"""
import os
import ssl
import json
import time
import logging
import urllib.request
import urllib.error
from typing import Optional

from database import get_db_ctx
from constants import DEFAULT_AI_SERVICE_CONFIG, MODELS_CASCADE
from caches import get_gemini_lock, get_last_gemini_call, set_last_gemini_call

logger = logging.getLogger(__name__)


def get_ai_service_config() -> dict:
    """Récupère la configuration des modèles IA depuis la base de données."""
    with get_db_ctx() as conn:
        rows = conn.execute("SELECT service_id, model_name FROM ai_model_settings").fetchall()
    res = DEFAULT_AI_SERVICE_CONFIG.copy()
    for r in rows:
        res[r["service_id"]] = r["model_name"]
    return res


def save_ai_service_config(cfg: dict) -> bool:
    """Sauvegarde la configuration des modèles IA."""
    try:
        with get_db_ctx() as conn:
            for s_id, m_name in cfg.items():
                conn.execute("""
                    INSERT INTO ai_model_settings (service_id, model_name)
                    VALUES (?, ?)
                    ON CONFLICT(service_id) DO UPDATE SET model_name=excluded.model_name, updated_at=CURRENT_TIMESTAMP
                """, (s_id, m_name))
            conn.commit()
        return True
    except Exception as e:
        logger.error(f"Erreur écriture ai_model_settings: {e}")
        return False


def call_gemini_json_api(
    prompt: str,
    api_key: str,
    preferred_model: Optional[str] = None,
    max_retries: int = 1,
) -> Optional[dict]:
    """
    Appelle l'API Gemini avec cascade de modèles et rate-limiting (1s entre appels).
    Retourne le JSON parsé ou None en cas d'échec.
    """
    if not api_key:
        return None

    cascade = list(MODELS_CASCADE)
    if preferred_model:
        if preferred_model in cascade:
            cascade.remove(preferred_model)
        cascade.insert(0, preferred_model)

    ctx = ssl.create_default_context()
    gemini_payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"response_mime_type": "application/json"},
    }
    encoded_data = json.dumps(gemini_payload).encode("utf-8")

    lock = get_gemini_lock()
    with lock:
        now = time.time()
        elapsed = now - get_last_gemini_call()
        if elapsed < 1.0:
            time.sleep(1.0 - elapsed)

        for model_name in cascade:
            gemini_url = (
                f"https://generativelanguage.googleapis.com/v1beta/models/"
                f"{model_name}:generateContent?key={api_key}"
            )
            for attempt in range(max_retries + 1):
                try:
                    set_last_gemini_call(time.time())
                    req = urllib.request.Request(
                        gemini_url, data=encoded_data,
                        headers={"Content-Type": "application/json"},
                    )
                    with urllib.request.urlopen(req, timeout=20, context=ctx) as resp:
                        resp_json = json.loads(resp.read().decode("utf-8"))
                        text_out = resp_json["candidates"][0]["content"]["parts"][0]["text"].strip()
                        # Nettoyer les blocs markdown éventuels
                        if text_out.startswith("```json"):
                            text_out = text_out[7:]
                        elif text_out.startswith("```"):
                            text_out = text_out[3:]
                        if text_out.endswith("```"):
                            text_out = text_out[:-3]
                        return json.loads(text_out.strip())
                except urllib.error.HTTPError as e:
                    logger.warning(f"Modèle {model_name} HTTPError {e.code} → tentative {attempt + 1}")
                    if e.code in (429, 404, 503):
                        break
                except Exception as e:
                    logger.warning(f"Modèle {model_name} exception: {e}")
                    break

    return None
