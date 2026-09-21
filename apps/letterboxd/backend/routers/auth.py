"""
Router Auth : /api/auth/device-info
Contient aussi les helpers partagés pour l'authentification mTLS.
"""
import re
from typing import Optional
from fastapi import APIRouter, Request

router = APIRouter(prefix="/api/auth", tags=["auth"])


def extract_cn(raw_dn: str) -> Optional[str]:
    """Extrait le Common Name (CN) d'un Subject DN X.509."""
    if not raw_dn:
        return None
    match = re.search(r"CN=([^/,]+)", raw_dn)
    if match:
        return match.group(1).strip()
    return raw_dn.strip() if raw_dn else None


@router.get("/device-info")
def get_device_info(request: Request):
    """Retourne les informations de l'équipement connecté via certificat client mTLS."""
    device_cn = getattr(request.state, "device_cn", "Inconnu")
    status = request.headers.get("x-client-cert-status", "")
    is_guest = getattr(request.state, "is_guest", False) or (
        "invité" in device_cn.lower() or "guest" in device_cn.lower()
    )

    if is_guest:
        return {
            "authenticated": False,
            "device_cn": device_cn,
            "verified": False,
            "is_guest": True,
            "profile_hint": "invite",
            "serial": None,
        }

    verified = (status == "SUCCESS") or (device_cn and device_cn != "Anonyme / Non vérifié")
    profile_hint = "victor"
    cn_lower = device_cn.lower()
    if "claire" in cn_lower or "maman" in cn_lower:
        profile_hint = "claire"
        
    is_admin = False
    if "victor" in cn_lower:
        is_admin = True
    else:
        from database import get_db_ctx
        try:
            with get_db_ctx() as conn:
                row = conn.execute("SELECT 1 FROM admin_devices WHERE LOWER(device_cn) = ?", (cn_lower,)).fetchone()
                if row:
                    is_admin = True
        except Exception:
            pass

    return {
        "authenticated": verified,
        "device_cn": device_cn,
        "verified": verified,
        "is_guest": False,
        "profile_hint": profile_hint,
        "is_admin": is_admin,
        "serial": request.headers.get("x-client-cert-serial", None),
    }
