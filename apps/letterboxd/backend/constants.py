"""
Constantes partagées entre tous les modules du backend.
"""

FRENCH_MONTHS = ["Janv.", "Févr.", "Mars", "Avr.", "Mai", "Juin",
                  "Juil.", "Août", "Sept.", "Oct.", "Nov.", "Déc."]

FRENCH_MONTHS_SHORT = ["Janv", "Févr", "Mars", "Avr", "Mai", "Juin",
                        "Juil", "Août", "Sept", "Oct", "Nov", "Déc"]

FRENCH_DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]

WMO_WEATHER_CODES = {
    0:  {"label": "Ciel dégagé",                      "icon": "sun"},
    1:  {"label": "Principalement dégagé",             "icon": "sun"},
    2:  {"label": "Éclaircies et passages nuageux",    "icon": "cloud-sun"},
    3:  {"label": "Couvert / Nuageux",                 "icon": "cloud"},
    45: {"label": "Brouillard",                        "icon": "cloud-fog"},
    48: {"label": "Brouillard givrant",                "icon": "cloud-fog"},
    51: {"label": "Bruine légère",                     "icon": "cloud-drizzle"},
    53: {"label": "Bruine modérée",                    "icon": "cloud-drizzle"},
    55: {"label": "Bruine dense",                      "icon": "cloud-drizzle"},
    61: {"label": "Pluie faible",                      "icon": "cloud-rain"},
    63: {"label": "Pluie modérée",                     "icon": "cloud-rain"},
    65: {"label": "Forte pluie",                       "icon": "cloud-heavy-rain"},
    71: {"label": "Chute de neige légère",             "icon": "snowflake"},
    73: {"label": "Neige modérée",                     "icon": "snowflake"},
    75: {"label": "Forte neige",                       "icon": "snowflake"},
    80: {"label": "Averses faibles",                   "icon": "cloud-rain"},
    81: {"label": "Averses modérées",                  "icon": "cloud-rain"},
    82: {"label": "Averses violentes",                 "icon": "cloud-heavy-rain"},
    95: {"label": "Orage",                             "icon": "cloud-lightning"},
    96: {"label": "Orage avec grêle légère",           "icon": "cloud-lightning"},
    99: {"label": "Orage violent avec grêle",          "icon": "cloud-lightning"},
}

BANK_NAMES = {
    "cragr": "Crédit Agricole",
    "boursorama": "BoursoBank",
    "caisseepargne": "Caisse d'Épargne",
    "societegenerale": "Société Générale",
    "creditmutuel": "Crédit Mutuel",
    "banquepopulaire": "Banque Populaire",
    "bnporc": "BNP Paribas",
    "lcl": "LCL",
    "fortuneo": "Fortuneo",
}

DEFAULT_AI_SERVICE_CONFIG = {
    "meteo": "gemini-1.5-flash",
    "news": "gemini-1.5-flash",
    "hub_briefing": "gemini-1.5-flash",
    "gmail_assistant": "gemini-1.5-flash",
    "tools_text": "gemini-1.5-pro",
}

MODELS_CASCADE = [
    "gemini-1.5-flash",   # Modèle universel stable et gratuit
    "gemini-2.0-flash",   # Modèle nouvelle génération
    "gemini-1.5-pro",     # Fallback haute capacité
]
