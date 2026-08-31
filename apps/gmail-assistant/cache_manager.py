#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Module Cache Manager (kept_emails.json & categorized_emails.json)
Permet de mémoriser localement :
 1. Les e-mails conservés lors du nettoyage (kept_emails.json)
 2. Les e-mails déjà catégorisés avec des libellés (categorized_emails.json)
afin d'éviter de les réanalyser par l'IA ou de les réafficher inutilement.
"""

import json
import os
from datetime import datetime
from typing import List, Dict, Any, Set

CACHE_DIR = os.getenv("DATA_DIR", os.path.dirname(os.path.abspath(__file__)))
KEPT_CACHE_FILE = os.path.join(CACHE_DIR, "kept_emails.json")
CATEGORIZED_CACHE_FILE = os.path.join(CACHE_DIR, "categorized_emails.json")


def _load_cache_file(filepath: str) -> Dict[str, Any]:
    """Charge un fichier JSON de cache s'il existe."""
    if not os.path.exists(filepath):
        return {"uids": [], "items": {}}
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
            if "uids" not in data:
                data["uids"] = []
            if "items" not in data:
                data["items"] = {}
            return data
    except Exception:
        return {"uids": [], "items": {}}


def _save_cache_file(filepath: str, data: Dict[str, Any]):
    """Sauvegarde les données dans un fichier JSON."""
    try:
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"[ERREUR CACHE] Impossible de sauvegarder {filepath} : {e}")


# ==========================================
# GESTION DES E-MAILS CONSERVÉS (NETTOYAGE)
# ==========================================

def get_kept_uids() -> Set[str]:
    """Retourne l'ensemble des UIDs conservés."""
    data = _load_cache_file(KEPT_CACHE_FILE)
    return set(str(uid) for uid in data.get("uids", []))


def add_to_kept(emails: List[Dict[str, Any]]):
    """Ajoute une liste d'e-mails à la mémoire des e-mails conservés."""
    data = _load_cache_file(KEPT_CACHE_FILE)
    current_uids = set(str(uid) for uid in data["uids"])

    for item in emails:
        uid = str(item.get("uid", ""))
        if uid and uid not in current_uids:
            current_uids.add(uid)
            data["items"][uid] = {
                "uid": uid,
                "subject": item.get("subject", ""),
                "sender": item.get("sender", ""),
                "date": item.get("date", ""),
                "saved_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }

    data["uids"] = list(current_uids)
    _save_cache_file(KEPT_CACHE_FILE, data)


def remove_from_kept(uids: List[str]):
    """Retire une liste d'UIDs de la mémoire des e-mails conservés."""
    data = _load_cache_file(KEPT_CACHE_FILE)
    current_uids = set(str(uid) for uid in data["uids"])

    for uid in uids:
        uid_str = str(uid)
        current_uids.discard(uid_str)
        data["items"].pop(uid_str, None)

    data["uids"] = list(current_uids)
    _save_cache_file(KEPT_CACHE_FILE, data)


def filter_out_kept(emails: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Filtre la liste d'e-mails en excluant ceux qui sont déjà marqués comme conservés."""
    kept_uids = get_kept_uids()
    return [e for e in emails if str(e.get("uid", "")) not in kept_uids]


def get_kept_items_list() -> List[Dict[str, Any]]:
    """Retourne la liste de tous les e-mails actuellement conservés."""
    data = _load_cache_file(KEPT_CACHE_FILE)
    return list(data.get("items", {}).values())


def clear_kept_cache():
    """Vide entièrement la mémoire des e-mails conservés."""
    _save_cache_file(KEPT_CACHE_FILE, {"uids": [], "items": {}})


# ==========================================
# GESTION DES E-MAILS CATÉGORISÉS (LIBELLÉS)
# ==========================================

def get_categorized_uids() -> Set[str]:
    """Retourne l'ensemble des UIDs déjà catégorisés."""
    data = _load_cache_file(CATEGORIZED_CACHE_FILE)
    return set(str(uid) for uid in data.get("uids", []))


def add_to_categorized(emails_with_labels: List[Dict[str, Any]]):
    """
    Ajoute une liste d'e-mails avec leur libellé attribué à la mémoire des catégorisés.
    
    Args:
        emails_with_labels: Liste de dicts avec 'uid', 'label', 'subject', 'sender', 'date'
    """
    data = _load_cache_file(CATEGORIZED_CACHE_FILE)
    current_uids = set(str(uid) for uid in data["uids"])

    for item in emails_with_labels:
        uid = str(item.get("uid", ""))
        if uid:
            current_uids.add(uid)
            data["items"][uid] = {
                "uid": uid,
                "label": item.get("label", ""),
                "subject": item.get("subject", ""),
                "sender": item.get("sender", ""),
                "date": item.get("date", ""),
                "categorized_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }

    data["uids"] = list(current_uids)
    _save_cache_file(CATEGORIZED_CACHE_FILE, data)


def get_categorized_items_list() -> List[Dict[str, Any]]:
    """Retourne la liste de tous les e-mails déjà catégorisés."""
    data = _load_cache_file(CATEGORIZED_CACHE_FILE)
    return list(data.get("items", {}).values())


def clear_categorized_cache():
    """Vide entièrement la mémoire des e-mails catégorisés."""
    _save_cache_file(CATEGORIZED_CACHE_FILE, {"uids": [], "items": {}})
