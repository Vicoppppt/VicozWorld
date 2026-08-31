#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Module Agent IA d'analyse et de tri d'e-mails (Google Gemini API)
Classifie les e-mails en :
 - INUTILE (Corbeille recommandée)
 - CONSERVER (À garder)
 - A_VERIFIER (Doute / manuel)
avec une explication en français pour chaque e-mail.
"""

import json
import os
from typing import List, Dict, Any

SYSTEM_PROMPT = """Tu es un Agent IA expert en tri et en organisation de boîtes mails.
Ton rôle est d'analyser la liste d'e-mails fournie (contenant UID, Expéditeur, Sujet, Date) et d'évaluer la pertinence de chaque message pour un utilisateur qui souhaite nettoyer sa boîte de réception (notamment supprimer les e-mails d'offres obsolètes de HelloWork, les notifications automatiques, les publicités, les spams et newsletters inutiles).

Pour CHAQUE e-mail de la liste, attribue une des 3 catégories suivantes :
1. "INUTILE" : E-mail de notification automatique sans suite, publicité, spams, newsletters non lues, offres d'emploi périmées (ex: HelloWork, LinkedIn), alertes automatiques. (Recommandé pour la Corbeille).
2. "CONSERVER" : E-mail important, factures, confirmations de commande, échanges professionnels humains, justificatifs administratifs, billets de transport.
3. "A_VERIFIER" : Doute raisonnable (ex: message d'un recruteur direct, mail de contact indéterminé).

Tu DOIS répondre STRICTEMENT au format JSON valide sous la forme d'une liste d'objets :
[
  {
    "uid": "ID_DE_L_EMAIL",
    "recommendation": "INUTILE" | "CONSERVER" | "A_VERIFIER",
    "reasoning": "Une phrase courte explicative en français expliquant ton choix."
  }
]
Ne rajoute AUCUN texte autour du JSON.
"""


def analyze_emails_with_ai(emails: List[Dict[str, Any]], api_key: str) -> Dict[str, Dict[str, str]]:
    """
    Analyse une liste d'e-mails grâce à l'Agent IA Gemini.
    
    Args:
        emails: Liste de dicts [{'uid': '...', 'sender': '...', 'subject': '...', 'date': '...'}]
        api_key: Clé API Google Gemini
        
    Returns:
        Dict indexé par uid : {'uid': {'recommendation': 'INUTILE', 'reasoning': '...'}}
    """
    if not api_key:
        raise ValueError("Clé API Gemini requise.")

    if not emails:
        return {}

    # Import dynamique pour éviter les problèmes de mise en cache du module
    try:
        from google import genai
        from google.genai import types
        use_genai_sdk = True
    except ImportError:
        use_genai_sdk = False

    # Préparer le prompt utilisateur avec la liste des e-mails
    emails_payload = []
    for item in emails:
        emails_payload.append({
            "uid": str(item.get("uid", "")),
            "sender": item.get("sender", ""),
            "subject": item.get("subject", ""),
            "date": item.get("date", "")
        })

    prompt_user = f"Voici la liste des e-mails à analyser :\n{json.dumps(emails_payload, ensure_ascii=False, indent=2)}"

    if use_genai_sdk:
        client = genai.Client(api_key=api_key)
        try:
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=f"{SYSTEM_PROMPT}\n\n{prompt_user}",
                config=types.GenerateContentConfig(
                    temperature=0.1,
                    response_mime_type="application/json"
                )
            )
            response_text = response.text.strip()
        except Exception as e:
            raise RuntimeError(f"Erreur lors de l'appel Gemini : {e}")
    else:
        # Fallback HTTP via urllib si le module n'est pas vu par Streamlit
        import urllib.request
        import urllib.parse
        
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
        headers = {"Content-Type": "application/json"}
        body = {
            "contents": [{"parts": [{"text": f"{SYSTEM_PROMPT}\n\n{prompt_user}"}]}],
            "generationConfig": {
                "temperature": 0.1,
                "responseMimeType": "application/json"
            }
        }
        
        req = urllib.request.Request(url, data=json.dumps(body).encode("utf-8"), headers=headers)
        try:
            with urllib.request.urlopen(req) as resp:
                res_json = json.loads(resp.read().decode("utf-8"))
                response_text = res_json["candidates"][0]["content"]["parts"][0]["text"].strip()
        except Exception as e:
            raise RuntimeError(f"Erreur HTTP API Gemini : {e}")

    # Nettoyage si entouré de balises markdown ```json
    if response_text.startswith("```json"):
        response_text = response_text[7:]
    if response_text.startswith("```"):
        response_text = response_text[3:]
    if response_text.endswith("```"):
        response_text = response_text[:-3]
    response_text = response_text.strip()

    try:
        parsed_results = json.loads(response_text)
    except json.JSONDecodeError as e:
        raise RuntimeError(f"Erreur de lecture du JSON de réponse IA : {e}\nTexte : {response_text[:200]}")

    results_by_uid = {}
    for res in parsed_results:
        uid = str(res.get("uid", ""))
        results_by_uid[uid] = {
            "recommendation": res.get("recommendation", "A_VERIFIER"),
            "reasoning": res.get("reasoning", "Aucune explication fournie.")
        }

    return results_by_uid


def categorize_emails_with_ai(emails: List[Dict[str, Any]], categories: List[str], api_key: str) -> Dict[str, Dict[str, str]]:
    """
    Classifie une liste d'e-mails dans une liste de catégories/libellés spécifiés.
    
    Args:
        emails: Liste de dicts [{'uid': '...', 'sender': '...', 'subject': '...', 'date': '...'}]
        categories: Liste de noms de libellés (ex: ['Factures', 'Recrutement', 'Voyages', 'Pro'])
        api_key: Clé API Google Gemini
        
    Returns:
        Dict indexé par uid : {'uid': {'assigned_label': 'Factures', 'reasoning': '...'}}
    """
    if not api_key:
        raise ValueError("Clé API Gemini requise.")

    if not emails:
        return {}

    if not categories:
        categories = ["Factures", "Recrutement", "Achats & Commandes", "Voyages", "Pro", "Banque", "Autre"]

    system_prompt_categorize = f"""Tu es un Agent IA expert en classement d'e-mails par dossiers/libellés.
Voici la liste EXCLUSIVES des catégories / libellés autorisés :
{json.dumps(categories, ensure_ascii=False)}

Ton rôle est d'attribuer la MEILLEURE catégorie à chaque e-mail de la liste en fonction de l'expéditeur, du sujet et de la date.

Tu DOIS répondre STRICTEMENT au format JSON valide sous la forme :
[
  {{
    "uid": "ID_DE_L_EMAIL",
    "assigned_label": "NOM_EXACT_DE_LA_CATEGORIE_CHOISIE",
    "reasoning": "Une phrase courte explicative en français."
  }}
]
Ne rajoute AUCUN texte autour du JSON.
"""

    try:
        from google import genai
        from google.genai import types
        use_genai_sdk = True
    except ImportError:
        use_genai_sdk = False

    emails_payload = []
    for item in emails:
        emails_payload.append({
            "uid": str(item.get("uid", "")),
            "sender": item.get("sender", ""),
            "subject": item.get("subject", ""),
            "date": item.get("date", "")
        })

    prompt_user = f"Voici la liste des e-mails à catégoriser :\n{json.dumps(emails_payload, ensure_ascii=False, indent=2)}"

    if use_genai_sdk:
        client = genai.Client(api_key=api_key)
        try:
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=f"{system_prompt_categorize}\n\n{prompt_user}",
                config=types.GenerateContentConfig(
                    temperature=0.1,
                    response_mime_type="application/json"
                )
            )
            response_text = response.text.strip()
        except Exception as e:
            raise RuntimeError(f"Erreur lors de l'appel Gemini : {e}")
    else:
        import urllib.request
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
        headers = {"Content-Type": "application/json"}
        body = {
            "contents": [{"parts": [{"text": f"{system_prompt_categorize}\n\n{prompt_user}"}]}],
            "generationConfig": {
                "temperature": 0.1,
                "responseMimeType": "application/json"
            }
        }
        req = urllib.request.Request(url, data=json.dumps(body).encode("utf-8"), headers=headers)
        try:
            with urllib.request.urlopen(req) as resp:
                res_json = json.loads(resp.read().decode("utf-8"))
                response_text = res_json["candidates"][0]["content"]["parts"][0]["text"].strip()
        except Exception as e:
            raise RuntimeError(f"Erreur HTTP API Gemini : {e}")

    if response_text.startswith("```json"):
        response_text = response_text[7:]
    if response_text.startswith("```"):
        response_text = response_text[3:]
    if response_text.endswith("```"):
        response_text = response_text[:-3]
    response_text = response_text.strip()

    try:
        parsed_results = json.loads(response_text)
    except json.JSONDecodeError as e:
        raise RuntimeError(f"Erreur de lecture du JSON de réponse IA : {e}")

    results_by_uid = {}
    for res in parsed_results:
        uid = str(res.get("uid", ""))
        results_by_uid[uid] = {
            "assigned_label": res.get("assigned_label", categories[0] if categories else "Autre"),
            "reasoning": res.get("reasoning", "Aucune explication fournie.")
        }

    return results_by_uid
