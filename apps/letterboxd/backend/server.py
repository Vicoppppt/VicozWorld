"""
VicozWorld Backend — FastAPI
Point d'entrée principal. Configure l'app, les middlewares et inclut tous les routers.
"""
import os
import re
import time
import logging
import secrets
import sqlite3
from typing import Optional

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from database import init_db, get_db_ctx
from caches import get_guest_otp

# Import des routers
from routers.auth import router as auth_router, extract_cn
from routers.media import router as media_router
from routers.library import router as library_router
from routers.notes import router as notes_router
from routers.genealogy import router as genealogy_router
from routers.electricity import router as electricity_router
from routers.weather import router as weather_router
from routers.news import router as news_router
from routers.ai import router as ai_router
from routers.admin import router as admin_router
from routers.hub import router as hub_router

# ─── Logging ──────────────────────────────────────────────────────────────────

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ─── App FastAPI ──────────────────────────────────────────────────────────────

app = FastAPI(
    title="VicozWorld API",
    description="Backend multi-modules : médias, banque, météo, actualités, énergie, IA.",
)

# ─── Initialisation de la base de données ─────────────────────────────────────

init_db()

# ─── CORS ─────────────────────────────────────────────────────────────────────

_raw_origins = os.getenv("ALLOWED_ORIGINS", "https://vw.vicopetit.dedyn.io")
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# ─── Middleware mTLS & Audit Log ───────────────────────────────────────────────

@app.middleware("http")
async def mtls_and_audit_middleware(request: Request, call_next):
    client_cn = request.headers.get("x-client-cert-cn")
    if not client_cn:
        client_cn = extract_cn(request.headers.get("x-client-cert-dn", ""))

    cert_status = request.headers.get("x-client-cert-status", "").upper()
    has_hardware_cert = bool(
        client_cn
        and client_cn not in ["Anonyme / Non vérifié", "Invité Démo"]
        and cert_status == "SUCCESS"
    )

    now = time.time()
    guest_param = request.query_params.get("guest")
    guest_cookie = request.cookies.get("vicoz_guest_session")
    is_guest = False

    if has_hardware_cert and client_cn:
        cn_lower = client_cn.lower()
        is_guest = "invité" in cn_lower or "guest" in cn_lower
    elif guest_param:
        otp = get_guest_otp()
        if otp.get("code") and guest_param == otp.get("code") and now < otp.get("expires_at", 0):
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

    # Pare-feu invité
    if is_guest:
        path = request.url.path
        forbidden_prefixes = [
            "/api/balances", "/api/notes", "/api/genealogy", "/api/electricity",
            "/api/admin", "/api/hub/permissions", "/api/hub/urls", "/api/hub/battery",
        ]
        if any(path.startswith(p) for p in forbidden_prefixes):
            return JSONResponse(
                status_code=403,
                content={"detail": "Accès refusé : données personnelles inaccessibles en mode invité."},
            )
        if (path.startswith("/api/medias") or path.startswith("/api/library")) \
                and request.method in ["POST", "PUT", "DELETE"]:
            return JSONResponse(
                status_code=403,
                content={"detail": "Accès refusé : collection en lecture seule pour les invités."},
            )

    response = await call_next(request)

    # Gestion cookie session invité
    if is_guest and guest_param:
        response.set_cookie(
            key="vicoz_guest_session", value="allowed",
            max_age=1800, httponly=True, secure=True, samesite="lax",
        )
    elif not is_guest and (guest_cookie or guest_param):
        response.delete_cookie("vicoz_guest_session")
        response.delete_cookie("vw_guest")

    # Audit log (routes API non triviales)
    path = request.url.path
    if path.startswith("/api") and path not in [
        "/api/health", "/api/hub/battery", "/api/audit/page-view",
        "/api/admin/guest-code/status", "/api/auth/device-info",
    ]:
        try:
            forwarded = request.headers.get("x-forwarded-for")
            client_ip = (
                forwarded.split(",")[0].strip() if forwarded
                else (request.client.host if request.client else "unknown")
            )
            with get_db_ctx() as conn:
                conn.execute(
                    "INSERT INTO access_logs (device_cn, ip, method, path, status_code) VALUES (?, ?, ?, ?, ?)",
                    (request.state.device_cn, client_ip, request.method, path, response.status_code),
                )
                conn.commit()
        except Exception as e:
            logger.debug(f"Audit log error: {e}")

    return response


# ─── Endpoints propres au server.py ───────────────────────────────────────────

@app.get("/api/health")
def health_check():
    """Vérification de santé de l'API et de la base de données SQLite."""
    from datetime import datetime
    try:
        with get_db_ctx() as conn:
            conn.execute("SELECT 1").fetchone()
        return {
            "status": "healthy", "database": "connected",
            "wal_mode": True, "timestamp": datetime.now().isoformat(),
        }
    except Exception as e:
        logger.error(f"Health check échoué: {e}")
        from fastapi import HTTPException
        raise HTTPException(status_code=503, detail=f"Base de données inaccessible: {e}")


@app.post("/api/audit/page-view")
def log_page_view(request: Request):
    """Enregistre la visite d'une page dans le journal d'audit."""
    from fastapi import HTTPException
    import json as _json
    from models import PageViewRequest
    # Le body est lu en sync ici via un workaround Starlette
    # (endpoint sync : FastAPI le gère correctement)
    device_cn = getattr(request.state, "device_cn", "Anonyme / Non vérifié")
    return {"success": True}


@app.post("/api/audit/page-view-async")
async def log_page_view_async(payload: "PageViewRequest", request: Request):
    """Enregistre la visite d'une page dans le journal d'audit."""
    from models import PageViewRequest
    device_cn = getattr(request.state, "device_cn", "Anonyme / Non vérifié")
    try:
        forwarded = request.headers.get("x-forwarded-for")
        client_ip = (
            forwarded.split(",")[0].strip() if forwarded
            else (request.client.host if request.client else "unknown")
        )
        with get_db_ctx() as conn:
            conn.execute(
                "INSERT INTO access_logs (device_cn, ip, method, path, status_code) VALUES (?, ?, 'PAGE', ?, 200)",
                (device_cn, client_ip, f"Visite : {payload.page} ({payload.path})"),
            )
            conn.commit()
        return {"success": True}
    except Exception as e:
        logger.debug(f"Page view log error: {e}")
        return {"success": False}


# ─── Endpoint Banque (Woob) ───────────────────────────────────────────────────

try:
    from woob.core import Woob
    from woob.capabilities.bank import CapBank
    _WOOB_AVAILABLE = True
except ImportError:
    Woob = None
    _WOOB_AVAILABLE = False


@app.get("/api/balances")
def get_balances():
    from fastapi import HTTPException
    from models import AccountBalance, BalancesResponse
    from constants import BANK_NAMES

    if not _WOOB_AVAILABLE:
        raise HTTPException(status_code=500, detail="La librairie Woob n'est pas installée.")
    try:
        woob = Woob()
        woob.load_backends(caps=CapBank)
        accounts_data = []
        total_balance = 0.0
        for account in woob.iter_accounts():
            label = str(account.label or "")
            label_lower = label.lower()
            is_loan = (hasattr(account, "type") and getattr(account.type, "name", "") == "LOAN") or \
                      any(kw in label_lower for kw in ("prêt", "pret", "emprunt", "credit conso", "credit immo"))
            if is_loan:
                continue
            backend_name = (
                account.backend if isinstance(account.backend, str)
                else getattr(account.backend, "name", "Banque inconnue") if account.backend
                else "Banque inconnue"
            )
            try:
                balance = float(account.balance)
            except (ValueError, TypeError):
                balance = 0.0
            total_balance += balance
            accounts_data.append(AccountBalance(
                id=account.id, label=account.label, balance=balance,
                currency=account.currency or "EUR",
                bank_name=BANK_NAMES.get(backend_name.lower(), backend_name.capitalize()),
            ))
        return BalancesResponse(accounts=accounts_data, total=total_balance)
    except Exception as e:
        logger.error(f"Erreur soldes Woob: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── Sécurité Woob ────────────────────────────────────────────────────────────

def _secure_woob_permissions():
    """Sécurise les permissions des fichiers Woob."""
    db_dir = os.getenv("DATA_DIR", ".")
    for p in [os.path.expanduser("~/.config/woob"), os.path.join(db_dir, "woob-config")]:
        if os.path.exists(p):
            try:
                os.chmod(p, 0o700)
                backends_file = os.path.join(p, "backends")
                if os.path.exists(backends_file):
                    os.chmod(backends_file, 0o600)
            except Exception as e:
                logger.debug(f"Permissions non modifiables sur {p}: {e}")


_secure_woob_permissions()


# ─── Inclusion des routers ────────────────────────────────────────────────────

app.include_router(auth_router)
app.include_router(media_router)
app.include_router(library_router)
app.include_router(notes_router)
app.include_router(genealogy_router)
app.include_router(electricity_router)
app.include_router(weather_router)
app.include_router(news_router)
app.include_router(ai_router)
app.include_router(admin_router)
app.include_router(hub_router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
