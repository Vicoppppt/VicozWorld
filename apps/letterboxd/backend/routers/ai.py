"""
Router IA : /api/ai/*
Modèles disponibles, config, proxy Gemini, détourage et upscale.
"""
import os
import ssl
import json
import io
import logging
import urllib.request
import urllib.error
from typing import Optional
from fastapi import APIRouter, HTTPException, Request, File, Form, UploadFile
from fastapi.responses import JSONResponse, Response

from models import AIServiceConfigRequest
from ai_helper import get_ai_service_config, save_ai_service_config
from constants import MODELS_CASCADE

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/ai", tags=["ai"])


# ─── Modèles disponibles ──────────────────────────────────────────────────────

@router.get("/models")
def get_available_gemini_models():
    """Découvre dynamiquement les modèles Gemini disponibles pour la clé configurée."""
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    fallback_models = [
        {"id": "gemini-1.5-flash", "displayName": "Gemini 1.5 Flash", "description": "Modèle universel stable"},
        {"id": "gemini-2.0-flash", "displayName": "Gemini 2.0 Flash", "description": "Modèle nouvelle génération"},
        {"id": "gemini-1.5-pro", "displayName": "Gemini 1.5 Pro", "description": "Haute capacité"},
    ]
    if not api_key:
        return {"models": fallback_models}

    ctx = ssl.create_default_context()
    try:
        req = urllib.request.Request(
            f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}",
            headers={"User-Agent": "VicozWorld/1.0"},
        )
        with urllib.request.urlopen(req, timeout=10, context=ctx) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            valid_models = []
            for m in data.get("models", []):
                if "generateContent" not in m.get("supportedGenerationMethods", []):
                    continue
                m_id = m.get("name", "").replace("models/", "")
                if any(x in m_id.lower() for x in ("embedding", "aqa", "imagen")):
                    continue
                valid_models.append({
                    "id": m_id,
                    "displayName": m.get("displayName", m_id),
                    "description": m.get("description", ""),
                })
            if valid_models:
                return {"models": valid_models}
    except Exception as e:
        logger.warning(f"Erreur récupération modèles Gemini: {e}")

    return {"models": fallback_models}


# ─── Config modèles par service ───────────────────────────────────────────────

@router.get("/config")
def get_ai_config_endpoint():
    return get_ai_service_config()


@router.post("/config")
def set_ai_config_endpoint(req: AIServiceConfigRequest):
    cfg = req.model_dump()
    save_ai_service_config(cfg)
    return {"status": "ok", "config": cfg}


# ─── Proxy Gemini générique ───────────────────────────────────────────────────

@router.post("/proxy/gemini/{model}")
async def proxy_gemini_api(model: str, request: Request):
    """Proxy pour les outils HTML statiques afin de cacher la clé API."""
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise HTTPException(status_code=400, detail="Clé API Gemini non configurée.")

    if model == "default":
        ai_cfg = get_ai_service_config()
        model = ai_cfg.get("tools_text", "gemini-1.5-flash")

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    body = await request.body()
    ctx = ssl.create_default_context()
    req = urllib.request.Request(
        url, data=body,
        headers={"Content-Type": "application/json", "User-Agent": "VicozWorld/1.0"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30, context=ctx) as resp:
            return JSONResponse(content=json.loads(resp.read().decode("utf-8")))
    except urllib.error.HTTPError as e:
        raise HTTPException(status_code=e.code, detail=e.read().decode("utf-8"))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Outils image ─────────────────────────────────────────────────────────────

@router.post("/tools/remove-bg")
async def api_remove_bg(file: UploadFile = File(...), model: str = Form("bria-rmbg")):
    """Détourage d'image haute précision côté serveur (Bria RMBG / ISNet / U2Net)."""
    try:
        content = await file.read()
        try:
            from rembg import remove, new_session
            session = new_session(model if model in ["bria-rmbg", "isnet-general-use", "u2net"] else "bria-rmbg")
            output_bytes = remove(content, session=session)
            return Response(content=output_bytes, media_type="image/png")
        except ImportError:
            raise HTTPException(status_code=501, detail="Module rembg non installé.")
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"Erreur remove-bg: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/tools/upscale")
async def api_upscale(file: UploadFile = File(...), scale: int = Form(2), model: str = Form("photo")):
    """Super-résolution d'image côté serveur (Pillow LANCZOS + sharpening)."""
    try:
        content = await file.read()
        from PIL import Image, ImageEnhance
        img = Image.open(io.BytesIO(content))
        upscaled = img.resize((img.width * scale, img.height * scale), Image.Resampling.LANCZOS)
        upscaled = ImageEnhance.Sharpness(upscaled).enhance(1.35)
        out_buf = io.BytesIO()
        upscaled.save(out_buf, format="PNG")
        return Response(content=out_buf.getvalue(), media_type="image/png")
    except Exception as e:
        logger.warning(f"Erreur upscale: {e}")
        raise HTTPException(status_code=500, detail=str(e))
