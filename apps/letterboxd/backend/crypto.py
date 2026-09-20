"""
Module de chiffrement symétrique Fernet.
Centralise encrypt_value / decrypt_value utilisés dans le backend.
"""
import os
import logging
from cryptography.fernet import Fernet, InvalidToken

logger = logging.getLogger(__name__)

ENCRYPTION_KEY = os.getenv("DB_ENCRYPTION_KEY", "").strip()
cipher = None

if ENCRYPTION_KEY:
    try:
        cipher = Fernet(ENCRYPTION_KEY)
    except Exception as e:
        logger.warning(f"Clé DB_ENCRYPTION_KEY invalide, chiffrement désactivé: {e}")


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
        logger.error("Impossible de déchiffrer : clé maître invalide ou token corrompu.")
        return ""
