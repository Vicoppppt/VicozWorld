"""
Router Admin : /api/admin/*
Gère : access-logs, backup, backups, certs (CRUD + download + delete),
       proxies (CRUD + toggle), guest-code OTP.
Accès restreint à Victor via verify_victor_admin().
"""
import os
import re
import shutil
import secrets
import subprocess
import smtplib
import logging
from typing import Optional
from datetime import datetime
from email.message import EmailMessage

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import FileResponse

from database import get_db_ctx, create_db_backup
from models import CertCreateRequest, ProxyCreateRequest
from caches import get_guest_otp, set_guest_otp, revoke_guest_otp
import time

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin", tags=["admin"])

# ─── Variables d'environnement ────────────────────────────────────────────────

CERTS_DIR = os.getenv("CERTS_DIR", os.path.join(os.getenv("DATA_DIR", "."), "certs"))
BACKUP_DIR = os.path.join(os.getenv("DATA_DIR", "."), "backups")


# ─── Guard admin ─────────────────────────────────────────────────────────────

def verify_victor_admin(request: Request):
    """Vérifie que la requête provient de Victor ou d'un équipement admin autorisé."""
    device_cn = getattr(request.state, "device_cn", "")
    is_guest = getattr(request.state, "is_guest", True)
    if is_guest or not device_cn:
        raise HTTPException(
            status_code=403,
            detail="Accès interdit : authentification requise."
        )
        
    cn_lower = device_cn.lower()
    if "victor" in cn_lower:
        return
        
    with get_db_ctx() as conn:
        row = conn.execute("SELECT 1 FROM admin_devices WHERE LOWER(device_cn) = ?", (cn_lower,)).fetchone()
        if not row:
            raise HTTPException(
                status_code=403,
                detail="Accès interdit : réservé aux administrateurs."
            )


# ─── Access logs ──────────────────────────────────────────────────────────────

@router.get("/access-logs")
def get_access_logs(request: Request, limit: int = 200):
    """Retourne les N derniers journaux d'accès."""
    verify_victor_admin(request)
    with get_db_ctx() as conn:
        rows = conn.execute(
            """
            SELECT id, device_cn, ip, method, path, status_code, timestamp
            FROM access_logs
            ORDER BY id DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()
    return [dict(r) for r in rows]


# ─── Backup ───────────────────────────────────────────────────────────────────

@router.post("/backup")
def trigger_backup(request: Request):
    """Déclenche une sauvegarde manuelle de la base de données."""
    verify_victor_admin(request)
    filename = create_db_backup("manual")
    if not filename:
        raise HTTPException(status_code=500, detail="Échec de la sauvegarde.")
    return {"success": True, "filename": filename}


@router.get("/backups")
def list_backups(request: Request):
    """Liste les fichiers de sauvegarde disponibles."""
    verify_victor_admin(request)
    if not os.path.isdir(BACKUP_DIR):
        return []
    files = sorted(
        [f for f in os.listdir(BACKUP_DIR) if f.endswith(".db")],
        key=lambda f: os.path.getmtime(os.path.join(BACKUP_DIR, f)),
        reverse=True,
    )
    result = []
    for f in files:
        fpath = os.path.join(BACKUP_DIR, f)
        stat = os.stat(fpath)
        result.append({
            "filename": f,
            "size_bytes": stat.st_size,
            "created_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
        })
    return result


# ─── Certificats ─────────────────────────────────────────────────────────────

@router.get("/certs")
def list_certs(request: Request):
    """Liste les certificats clients générés avec leur date d'expiration."""
    verify_victor_admin(request)
    ca_crt = os.path.join(CERTS_DIR, "ca.crt")
    ca_exists = os.path.exists(ca_crt)

    if not os.path.isdir(CERTS_DIR):
        return {
            "ca_exists": ca_exists,
            "certs": []
        }

    certs = []
    for device_name in os.listdir(CERTS_DIR):
        device_dir = os.path.join(CERTS_DIR, device_name)
        if not os.path.isdir(device_dir):
            continue

        cert_file = os.path.join(device_dir, "client.crt")
        if not os.path.exists(cert_file):
            alt_cert = os.path.join(device_dir, f"{device_name}.crt")
            if os.path.exists(alt_cert):
                cert_file = alt_cert
            else:
                continue

        p12_file = os.path.join(device_dir, "client.p12")
        if not os.path.exists(p12_file):
            alt_p12 = os.path.join(device_dir, f"{device_name}.p12")
            if os.path.exists(alt_p12):
                p12_file = alt_p12

        expiry_date = "Valide (5 ans)"
        try:
            result = subprocess.run(
                ["openssl", "x509", "-enddate", "-noout", "-in", cert_file],
                capture_output=True, text=True, timeout=10
            )
            if result.returncode == 0 and "notAfter=" in result.stdout:
                # Format: notAfter=Jan  1 00:00:00 2026 GMT
                expiry_date = result.stdout.strip().replace("notAfter=", "")
        except Exception as e:
            logger.warning(f"Impossible de lire la date d'expiration pour {device_name}: {e}")

        try:
            created_at = datetime.fromtimestamp(os.path.getmtime(cert_file)).strftime("%Y-%m-%d %H:%M")
        except Exception:
            created_at = ""

        is_admin_cert = False
        if "victor" in device_name.lower():
            is_admin_cert = True
        else:
            with get_db_ctx() as conn:
                row = conn.execute("SELECT 1 FROM admin_devices WHERE LOWER(device_cn) = ?", (device_name.lower(),)).fetchone()
                if row:
                    is_admin_cert = True

        certs.append({
            "name": device_name,
            "device_name": device_name,
            "expires_at": expiry_date,
            "expiry_date": expiry_date,
            "has_p12": os.path.exists(p12_file),
            "cert_path": cert_file,
            "created_at": created_at,
            "is_admin": is_admin_cert,
            "download_url": f"/api/admin/certs/download/{device_name}",
        })

    certs.sort(key=lambda x: x.get("created_at", ""), reverse=True)

    return {
        "ca_exists": ca_exists,
        "certs": certs
    }


@router.post("/certs/generate")
def generate_cert(request: Request, body: CertCreateRequest):
    """
    Génère un certificat client + fichier .p12 pour un équipement.
    Envoie optionnellement le .p12 par e-mail si body.email est fourni.
    """
    verify_victor_admin(request)

    device_name = body.device_name.strip()
    password = body.password
    email = body.email

    if not device_name or not password:
        raise HTTPException(status_code=400, detail="device_name et password sont requis.")

    # Sécuriser le nom de l'équipement
    safe_name = re.sub(r"[^a-zA-Z0-9_\-]", "_", device_name)
    device_dir = os.path.join(CERTS_DIR, safe_name)

    if os.path.exists(device_dir):
        raise HTTPException(
            status_code=409,
            detail=f"Un certificat pour '{safe_name}' existe déjà. Supprimez-le d'abord."
        )

    os.makedirs(device_dir, exist_ok=True)

    ca_cert = os.path.join(CERTS_DIR, "ca.crt")
    ca_key = os.path.join(CERTS_DIR, "ca.key")

    if not os.path.exists(ca_cert) or not os.path.exists(ca_key):
        try:
            subprocess.run(["openssl", "genrsa", "-out", ca_key, "4096"], check=True, timeout=15)
            os.chmod(ca_key, 0o600)
            subprocess.run([
                "openssl", "req", "-x509", "-new", "-nodes", "-key", ca_key, "-sha256", "-days", "3650",
                "-out", ca_cert, "-subj", "/C=FR/ST=IDF/O=VicozWorld/OU=Security/CN=VicozWorld-Root-CA"
            ], check=True, timeout=15)
            npm_ssl_dir = os.getenv("NPM_SSL_DIR", "/data/custom_ssl")
            if os.path.isdir(npm_ssl_dir):
                shutil.copy2(ca_cert, os.path.join(npm_ssl_dir, "ca.crt"))
        except Exception as e:
            logger.error(f"Erreur création CA: {e}")
            raise HTTPException(status_code=500, detail=f"Échec initialisation CA: {e}")

    key_file = os.path.join(device_dir, "client.key")
    csr_file = os.path.join(device_dir, "client.csr")
    crt_file = os.path.join(device_dir, "client.crt")
    p12_file = os.path.join(device_dir, "client.p12")

    try:
        # 1. Génération de la clé privée
        subprocess.run(
            ["openssl", "genrsa", "-out", key_file, "4096"],
            check=True, capture_output=True, timeout=60
        )

        # 2. Génération du CSR
        subprocess.run(
            [
                "openssl", "req", "-new",
                "-key", key_file,
                "-out", csr_file,
                "-subj", f"/CN={safe_name}/O=VicozWorld"
            ],
            check=True, capture_output=True, timeout=30
        )

        # 3. Signature par la CA
        subprocess.run(
            [
                "openssl", "x509", "-req",
                "-in", csr_file,
                "-CA", ca_cert,
                "-CAkey", ca_key,
                "-CAcreateserial",
                "-out", crt_file,
                "-days", "730",
                "-sha256"
            ],
            check=True, capture_output=True, timeout=30
        )

        # 4. Export .p12
        subprocess.run(
            [
                "openssl", "pkcs12", "-export",
                "-out", p12_file,
                "-inkey", key_file,
                "-in", crt_file,
                "-certfile", ca_cert,
                "-passout", f"pass:{password}"
            ],
            check=True, capture_output=True, timeout=30
        )

    except subprocess.CalledProcessError as e:
        # Nettoyage en cas d'erreur
        shutil.rmtree(device_dir, ignore_errors=True)
        logger.error(f"Erreur OpenSSL pour {safe_name}: {e.stderr}")
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la génération du certificat : {e.stderr}"
        )
    except Exception as e:
        shutil.rmtree(device_dir, ignore_errors=True)
        raise HTTPException(status_code=500, detail=str(e))

    # 5. Envoi e-mail optionnel
    email_status = None
    if email:
        try:
            smtp_host = os.getenv("SMTP_HOST", "localhost")
            smtp_port = int(os.getenv("SMTP_PORT", "25"))
            smtp_user = os.getenv("SMTP_USER", "")
            smtp_pass = os.getenv("SMTP_PASS", "")
            smtp_from = os.getenv("SMTP_FROM", smtp_user or "noreply@vicozworld.local")

            msg = EmailMessage()
            msg["Subject"] = f"[VicozWorld] Certificat client – {safe_name}"
            msg["From"] = smtp_from
            msg["To"] = email
            msg.set_content(
                f"Bonjour,\n\n"
                f"Voici le certificat client pour l'équipement : {safe_name}\n"
                f"Mot de passe du fichier .p12 : {password}\n\n"
                f"Importez le fichier joint dans votre navigateur ou système.\n\n"
                f"— VicozWorld Admin"
            )

            with open(p12_file, "rb") as f:
                msg.add_attachment(
                    f.read(),
                    maintype="application",
                    subtype="x-pkcs12",
                    filename=f"{safe_name}.p12"
                )

            with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as s:
                if smtp_user and smtp_pass:
                    s.starttls()
                    s.login(smtp_user, smtp_pass)
                s.send_message(msg)

            email_status = "sent"
            logger.info(f"Certificat envoyé par e-mail à {email} pour {safe_name}")

        except Exception as e:
            email_status = f"error: {e}"
            logger.warning(f"Impossible d'envoyer l'e-mail pour {safe_name}: {e}")

    return {
        "success": True,
        "name": safe_name,
        "device_name": safe_name,
        "download_url": f"/api/admin/certs/download/{safe_name}",
        "email_sent": email_status == "sent",
        "email_error": email_status if email_status and email_status != "sent" else None,
        "email_status": email_status,
        "message": f"Certificat client pour {safe_name} généré avec succès !"
    }


@router.get("/certs/download/{device_name}")
def download_cert(request: Request, device_name: str):
    """Télécharge le fichier .p12 d'un équipement."""
    verify_victor_admin(request)

    safe_name = re.sub(r"[^a-zA-Z0-9_\-]", "_", device_name)
    p12_file = os.path.join(CERTS_DIR, safe_name, "client.p12")
    if not os.path.exists(p12_file):
        for alt in [
            os.path.join(CERTS_DIR, safe_name, f"{safe_name}.p12"),
            os.path.join(CERTS_DIR, device_name, f"{device_name}.p12"),
            os.path.join(CERTS_DIR, device_name, "client.p12"),
        ]:
            if os.path.exists(alt):
                p12_file = alt
                break
        else:
            raise HTTPException(
                status_code=404,
                detail=f"Fichier .p12 introuvable pour '{safe_name}'."
            )

    return FileResponse(
        path=p12_file,
        media_type="application/x-pkcs12",
        filename=f"{safe_name}.p12"
    )


@router.delete("/certs/{device_name}")
def delete_cert(request: Request, device_name: str):
    """Supprime le répertoire de certificat d'un équipement."""
    verify_victor_admin(request)

    safe_name = re.sub(r"[^a-zA-Z0-9_\-]", "_", device_name)
    device_dir = os.path.join(CERTS_DIR, safe_name)
    if not os.path.isdir(device_dir):
        device_dir = os.path.join(CERTS_DIR, device_name)

    if not os.path.isdir(device_dir):
        raise HTTPException(
            status_code=404,
            detail=f"Certificat introuvable pour '{safe_name}'."
        )

    try:
        shutil.rmtree(device_dir)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Impossible de supprimer : {e}")

    return {"success": True, "device_name": safe_name, "name": safe_name}


@router.put("/certs/{device_name}/toggle-admin")
def toggle_admin_cert(request: Request, device_name: str):
    """Accorde ou révoque le statut administrateur d'un équipement."""
    verify_victor_admin(request)
    
    if "victor" in device_name.lower():
        raise HTTPException(
            status_code=400,
            detail="Les équipements 'Victor' sont administrateurs par défaut et ne peuvent être modifiés."
        )

    with get_db_ctx() as conn:
        row = conn.execute("SELECT 1 FROM admin_devices WHERE LOWER(device_cn) = ?", (device_name.lower(),)).fetchone()
        if row:
            conn.execute("DELETE FROM admin_devices WHERE LOWER(device_cn) = ?", (device_name.lower(),))
            is_admin = False
        else:
            conn.execute("INSERT INTO admin_devices (device_cn) VALUES (?)", (device_name,))
            is_admin = True
        conn.commit()

    return {"success": True, "device_name": device_name, "is_admin": is_admin}


# ─── Proxies ─────────────────────────────────────────────────────────────────

@router.get("/proxies")
def list_proxies(request: Request):
    """Liste tous les proxies gérés."""
    verify_victor_admin(request)
    with get_db_ctx() as conn:
        rows = conn.execute(
            "SELECT id, domain, label, is_protected, created_at FROM managed_proxies ORDER BY created_at"
        ).fetchall()
    return [
        {
            "id": r["id"],
            "domain": r["domain"],
            "label": r["label"],
            "is_protected": bool(r["is_protected"]),
            "created_at": r["created_at"],
        }
        for r in rows
    ]


@router.post("/proxies")
def create_proxy(request: Request, body: ProxyCreateRequest):
    """Ajoute un nouveau proxy géré."""
    verify_victor_admin(request)

    domain = body.domain.strip()
    label = body.label.strip()

    if not domain or not label:
        raise HTTPException(status_code=400, detail="domain et label sont requis.")

    proxy_id = re.sub(r"[^a-z0-9_\-]", "_", domain.lower())

    with get_db_ctx() as conn:
        existing = conn.execute(
            "SELECT id FROM managed_proxies WHERE id = ?", (proxy_id,)
        ).fetchone()
        if existing:
            raise HTTPException(
                status_code=409,
                detail=f"Un proxy avec l'identifiant '{proxy_id}' existe déjà."
            )
        conn.execute(
            """
            INSERT INTO managed_proxies (id, domain, label, is_protected, created_at)
            VALUES (?, ?, ?, 0, CURRENT_TIMESTAMP)
            """,
            (proxy_id, domain, label),
        )
        conn.commit()

    return {"success": True, "id": proxy_id, "domain": domain, "label": label}


@router.put("/proxies/{proxy_id}/toggle")
def toggle_proxy_protection(request: Request, proxy_id: str):
    """Bascule l'état is_protected d'un proxy."""
    verify_victor_admin(request)

    with get_db_ctx() as conn:
        row = conn.execute(
            "SELECT id, is_protected FROM managed_proxies WHERE id = ?", (proxy_id,)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail=f"Proxy '{proxy_id}' introuvable.")

        new_state = 0 if row["is_protected"] else 1
        conn.execute(
            "UPDATE managed_proxies SET is_protected = ? WHERE id = ?",
            (new_state, proxy_id)
        )
        conn.commit()

    return {"success": True, "id": proxy_id, "is_protected": bool(new_state)}


@router.delete("/proxies/{proxy_id}")
def delete_proxy(request: Request, proxy_id: str):
    """Supprime un proxy géré."""
    verify_victor_admin(request)

    with get_db_ctx() as conn:
        existing = conn.execute(
            "SELECT id FROM managed_proxies WHERE id = ?", (proxy_id,)
        ).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail=f"Proxy '{proxy_id}' introuvable.")

        conn.execute("DELETE FROM managed_proxies WHERE id = ?", (proxy_id,))
        conn.commit()

    return {"success": True, "id": proxy_id}


# ─── OTP Invité ───────────────────────────────────────────────────────────────

@router.post("/guest-code/generate")
def generate_guest_code(request: Request):
    """Génère un OTP à 6 chiffres valable 120 secondes."""
    verify_victor_admin(request)

    code = "".join([str(secrets.randbelow(10)) for _ in range(6)])
    expires_at = time.time() + 120

    set_guest_otp(code, expires_at)

    logger.info(f"OTP invité généré par {getattr(request.state, 'device_cn', 'inconnu')}")

    return {
        "success": True,
        "code": code,
        "expires_at": expires_at,
        "expires_in_seconds": 120,
    }


@router.get("/guest-code/status")
def get_guest_code_status(request: Request):
    """Retourne l'état actuel de l'OTP invité."""
    verify_victor_admin(request)

    otp = get_guest_otp()
    now = time.time()

    if not otp["code"] or otp["expires_at"] < now:
        return {
            "active": False,
            "code": None,
            "expires_at": None,
            "remaining_seconds": 0,
        }

    remaining = int(otp["expires_at"] - now)
    return {
        "active": True,
        "code": otp["code"],
        "expires_at": otp["expires_at"],
        "remaining_seconds": max(0, remaining),
    }


@router.post("/guest-code/revoke")
def revoke_guest_code(request: Request):
    """Révoque l'OTP invité actif."""
    verify_victor_admin(request)

    revoke_guest_otp()
    logger.info(f"OTP invité révoqué par {getattr(request.state, 'device_cn', 'inconnu')}")

    return {"success": True, "message": "OTP invité révoqué."}
