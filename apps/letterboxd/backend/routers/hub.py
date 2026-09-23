"""
Router Hub : /api/hub/*
Hub d'accueil intelligent avec synthèse IA, batterie et permissions.
"""
import os
import json
import time
import logging
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Request

from models import HubPermissionsRequest, HubUrlsRequest
from caches import get_hub_cache, set_hub_cache, get_movie_cache, set_movie_cache
from ai_helper import call_gemini_json_api, get_ai_service_config
from routers.electricity import get_electricity_stats
from routers.weather import get_weather_report

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/hub", tags=["hub"])

DB_DIR = os.getenv("DATA_DIR", os.path.dirname(os.path.abspath(__file__)))
PERMISSIONS_FILE = os.path.join(DB_DIR, "hub_permissions.json")
URLS_FILE = os.path.join(DB_DIR, "hub_urls.json")

# Données domotiques statiques (en attente d'intégration Home Assistant)
_DOMOTIQUE_PLACEHOLDER = {
    "status": "normal",
    "doors_closed": True,
    "doors_label": "Toutes les portes sont verrouillées",
    "lights_on_count": 2,
    "inside_temp": 21.4,
    "alarm_active": True,
    "alarm_label": "Système d'alarme armé",
    "in_development": True,  # Flag explicite : données non réelles
}

_CURATED_FALLBACK_MOVIES = [
    {"title": "Interstellar", "year": "2014", "director": "Christopher Nolan", "genre": "Sci-Fi / Drame",
     "rating": 8.7, "poster": "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
     "synopsis": "Une équipe d'explorateurs voyage à travers un trou de ver."},
    {"title": "Dune : Deuxième Partie", "year": "2024", "director": "Denis Villeneuve",
     "genre": "Science-Fiction / Aventure", "rating": 8.6,
     "poster": "https://image.tmdb.org/t/p/w500/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg",
     "synopsis": "Paul Atréides s'unit aux Fremen pour mener la révolte."},
    {"title": "Le Voyage de Chihiro", "year": "2001", "director": "Hayao Miyazaki",
     "genre": "Animation / Fantastique", "rating": 8.6,
     "poster": "https://image.tmdb.org/t/p/w500/dL11niApZXKLWrmAhv1Z5w27Zq4.jpg",
     "synopsis": "Chihiro s'aventure dans un monde magique gouverné par des esprits."},
]


@router.get("/battery")
def get_hub_battery():
    """Endpoint API pour récupérer le niveau de batterie du PC serveur."""
    return _get_server_battery()


@router.get("/permissions")
def get_hub_permissions():
    """Retourne la liste des modules autorisés pour Maman (Claire)."""
    if os.path.exists(PERMISSIONS_FILE):
        try:
            with open(PERMISSIONS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.warning(f"Erreur lecture permissions: {e}")
    return {"allowed_modules": ["cinematheque", "quiz", "extracteur_texte", "correcteur_redaction",
                                 "detourage_ia", "upscale_ia", "editeur_pdf", "convertisseur_excel",
                                 "notes", "genealogie"]}


@router.post("/permissions")
def set_hub_permissions(req: HubPermissionsRequest):
    """Enregistre la liste des modules autorisés pour Maman (Claire)."""
    from fastapi import HTTPException
    data = {"allowed_modules": req.allowed_modules}
    try:
        with open(PERMISSIONS_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        return {"status": "ok", "allowed_modules": req.allowed_modules}
    except Exception as e:
        logger.error(f"Erreur écriture permissions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/urls")
def get_hub_urls():
    """Retourne les URLs personnalisées des applications du Hub."""
    if os.path.exists(URLS_FILE):
        try:
            with open(URLS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.warning(f"Erreur lecture urls: {e}")
    return {"urls": {}}


@router.post("/urls")
def set_hub_urls(req: HubUrlsRequest):
    """Enregistre les URLs personnalisées des applications du Hub."""
    from fastapi import HTTPException
    try:
        with open(URLS_FILE, "w", encoding="utf-8") as f:
            json.dump({"urls": req.urls}, f, indent=2, ensure_ascii=False)
        return {"status": "ok", "urls": req.urls}
    except Exception as e:
        logger.error(f"Erreur écriture urls: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/summary")
def get_hub_summary(request: Request, force: Optional[bool] = False):
    is_guest = getattr(request.state, "is_guest", False)

    # ─── Mode invité : données publiques simplifiées ───
    if is_guest:
        try:
            weather_data = get_weather_report()
        except Exception:
            weather_data = {}
        day_of_year = datetime.now().timetuple().tm_yday
        movie_pick = _CURATED_FALLBACK_MOVIES[day_of_year % len(_CURATED_FALLBACK_MOVIES)]
        return {
            "weather": weather_data, "movie_pick": movie_pick,
            "movie_pitch": f"Chef-d'œuvre sélectionné pour votre session invité ({movie_pick['title']}).",
            "is_guest": True, "today": datetime.now().strftime("%Y-%m-%d"),
        }

    # ─── Cache hub ─────────────────────────────────────
    current_time = time.time()
    cached = get_hub_cache()
    if not force and cached["data"] and (current_time - cached["timestamp"]) < 1800:
        return cached["data"]

    # ─── Collecte des données des modules (en parallèle) ──────────────
    import concurrent.futures
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
        f_weather = executor.submit(get_weather_report, force=force)
        
        def safe_get_news():
            from routers.news import get_news_briefing
            return get_news_briefing()
            
        f_news = executor.submit(safe_get_news)
        f_elec = executor.submit(get_electricity_stats)

        try:
            weather_data = f_weather.result()
        except Exception as e:
            logger.warning(f"Hub: erreur weather: {e}")
            weather_data = {}

        try:
            news_briefing = f_news.result()
        except Exception as e:
            logger.warning(f"Hub: erreur news: {e}")
            news_briefing = {}

        try:
            electricity_stats = f_elec.result()
        except Exception as e:
            logger.warning(f"Hub: erreur electricity: {e}")
            electricity_stats = {}

    # ─── Suggestion film du jour ───────────────────────
    gemini_key = os.environ.get("GEMINI_API_KEY", "").strip()
    current_date = datetime.now().strftime("%Y-%m-%d")
    movie_cache = get_movie_cache()
    movie_pick = None

    if movie_cache["date"] == current_date and movie_cache["movie"]:
        movie_pick = movie_cache["movie"]
    elif gemini_key:
        try:
            ai_cfg = get_ai_service_config()
            model_choice = ai_cfg.get("hub_briefing", "gemini-1.5-flash")
            prompt = """Tu es un expert en cinéma. Recommande un excellent film (chef-d'œuvre, culte ou pépite méconnue) pour ce soir.
Ne recommande PAS Interstellar, Dune, Oppenheimer, Le Voyage de Chihiro.
Réponds STRICTEMENT au format JSON :
{"title": "Titre", "year": "Année", "director": "Réalisateur", "genre": "Genre",
"rating": "Note/10", "poster": "URL affiche", "synopsis": "Bref synopsis accrocheur"}"""
            parsed_movie = call_gemini_json_api(prompt, gemini_key, preferred_model=model_choice)
            if parsed_movie and "title" in parsed_movie:
                if not parsed_movie.get("poster"):
                    parsed_movie["poster"] = "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&q=80&w=500"
                movie_pick = parsed_movie
                set_movie_cache(current_date, movie_pick)
        except Exception as e:
            logger.warning(f"Erreur suggestion film Gemini: {e}")

    if not movie_pick:
        day_of_year = datetime.now().timetuple().tm_yday
        movie_pick = _CURATED_FALLBACK_MOVIES[day_of_year % len(_CURATED_FALLBACK_MOVIES)]

    # ─── Synthèse executive ────────────────────────────
    hour = datetime.now().hour
    greeting_prefix = "Bonsoir Victor" if hour >= 18 else "Bonjour Victor"
    w_temp = (weather_data or {}).get("synthesis", {}).get("consensus_temp", 21)
    w_cond = (weather_data or {}).get("synthesis", {}).get("consensus_condition", "agréable")
    n_takeaway = ((news_briefing or {}).get("briefing") or {}).get(
        "global_takeaway", "Actualités nationales et internationales actives"
    )
    this_m = (electricity_stats or {}).get("this_month", {})
    e_cost = this_m.get("current_cost", 0)
    e_target = this_m.get("target_budget", 60)
    e_status = "dans les clous" if not this_m.get("is_over_budget") else "légèrement en dépassement"

    executive_summary = (
        f"Aujourd'hui, comptez sur {w_temp}°C sous un ciel {w_cond}. "
        f"L'actu majeure : {n_takeaway[:90]}. "
        f"Votre budget énergie est {e_status}."
    )
    movie_pitch = f"Pour votre soirée : découvrez ou revoyez {movie_pick['title']} ({movie_pick.get('genre', '')})."

    if gemini_key and force:
        ai_cfg = get_ai_service_config()
        model_choice = ai_cfg.get("hub_briefing", "gemini-1.5-flash")
        prompt = f"""Tu es l'assistant personnel de VicozWorld.
Point du jour : Météo {w_temp}°C {w_cond} | Actu : {n_takeaway} | Énergie {e_status} ({e_cost}€/{e_target}€) | Film : {movie_pick['title']}
Réponds STRICTEMENT au format JSON :
{{"greeting": "{greeting_prefix}", "executive_summary": "2 phrases élégantes", "movie_pitch": "phrase d'accroche pour le film"}}"""
        parsed_exec = call_gemini_json_api(prompt, gemini_key, preferred_model=model_choice)
        if parsed_exec:
            greeting_prefix = parsed_exec.get("greeting", greeting_prefix)
            executive_summary = parsed_exec.get("executive_summary", executive_summary)
            movie_pitch = parsed_exec.get("movie_pitch", movie_pitch)

    result = {
        "greeting": greeting_prefix,
        "executive_summary": executive_summary,
        "movie_pitch": movie_pitch,
        "weather": weather_data,
        "news": news_briefing,
        "electricity": electricity_stats,
        "movie_pick": movie_pick,
        "domotique": _DOMOTIQUE_PLACEHOLDER,
        "has_gemini_key": bool(gemini_key),
        "generated_at": current_time,
    }

    set_hub_cache(result)
    return result


# ─── Batterie serveur ─────────────────────────────────────────────────────────

def _get_server_battery() -> dict:
    """Récupère l'état de la batterie du PC serveur, ainsi que l'utilisation CPU et température."""
    import psutil
    
    cpu_percent = None
    cpu_temp = None
    try:
        # psutil.cpu_percent with interval=None gives the percent since last call
        # We can pass 0.1 for a quick measurement if we want, but None is non-blocking.
        cpu_percent = psutil.cpu_percent(interval=None)
        temps = psutil.sensors_temperatures()
        if temps:
            for name, entries in temps.items():
                if "coretemp" in name or "acpitz" in name or "k10temp" in name:
                    cpu_temp = round(entries[0].current)
                    break
            if cpu_temp is None and len(temps) > 0:
                for entries in temps.values():
                    cpu_temp = round(entries[0].current)
                    break
    except Exception as e:
        logger.warning(f"Erreur lecture CPU stats: {e}")

    stats = {
        "cpu_percent": cpu_percent,
        "cpu_temp": cpu_temp
    }

    power_supply_path = "/sys/class/power_supply"

    if os.path.exists(power_supply_path):
        try:
            for item in sorted(os.listdir(power_supply_path)):
                item_dir = os.path.join(power_supply_path, item)
                if not os.path.isdir(item_dir):
                    continue
                is_battery = item.lower().startswith("bat")
                type_file = os.path.join(item_dir, "type")
                if os.path.exists(type_file):
                    try:
                        with open(type_file) as tf:
                            if "battery" in tf.read().strip().lower():
                                is_battery = True
                    except Exception:
                        pass
                if not is_battery:
                    continue

                percentage = None
                for a_file, b_file in [
                    ("capacity", None),
                    ("energy_now", "energy_full"),
                    ("charge_now", "charge_full"),
                ]:
                    a_path = os.path.join(item_dir, a_file)
                    if b_file is None and os.path.exists(a_path):
                        try:
                            with open(a_path) as f:
                                percentage = int(f.read().strip())
                                break
                        except Exception:
                            pass
                    elif b_file:
                        b_path = os.path.join(item_dir, b_file)
                        if os.path.exists(a_path) and os.path.exists(b_path):
                            try:
                                with open(a_path) as f1, open(b_path) as f2:
                                    percentage = round((float(f1.read().strip()) / float(f2.read().strip())) * 100)
                                    break
                            except Exception:
                                pass

                if percentage is not None:
                    status = "Inconnu"
                    status_path = os.path.join(item_dir, "status")
                    if os.path.exists(status_path):
                        try:
                            with open(status_path) as f:
                                status = f.read().strip()
                        except Exception:
                            pass
                    s_lower = status.lower()
                    is_charging = s_lower == "charging"
                    plugged_in = s_lower in ("charging", "full", "not charging")
                    pct = max(0, min(100, percentage))
                    stats.update({
                        "available": True, "percentage": pct, "percent": pct,
                        "status": status, "is_charging": is_charging,
                        "plugged_in": plugged_in, "plugged": plugged_in, "device": item,
                    })
                    return stats
        except Exception as e:
            logger.warning(f"Erreur lecture sysfs batterie: {e}")

    # Fallback psutil pour batterie
    try:
        bat = psutil.sensors_battery()
        if bat is not None and bat.percent is not None:
            is_charging = bool(bat.power_plugged) and bat.percent < 99
            pct = round(bat.percent)
            plugged_in = bool(bat.power_plugged)
            stats.update({
                "available": True, "percentage": pct, "percent": pct,
                "status": "En charge" if is_charging else ("Sur secteur" if plugged_in else "Sur batterie"),
                "is_charging": is_charging, "plugged_in": plugged_in, "plugged": plugged_in, "device": "psutil",
            })
            return stats
    except Exception:
        pass

    # Fallback secteur
    stats.update({
        "available": True, "percentage": 100, "percent": 100,
        "status": "Sur secteur ⚡", "is_charging": False,
        "plugged_in": True, "plugged": True, "device": "AC",
    })
    return stats
