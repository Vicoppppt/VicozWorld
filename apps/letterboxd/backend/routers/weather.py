"""
Router Météo : /api/weather/*
Station météo multi-sources avec synthèse IA Gemini.
"""
import os
import json
import ssl
import logging
import urllib.request
import urllib.parse
from datetime import datetime
from typing import Optional
from fastapi import APIRouter

from database import get_db_ctx
from models import WeatherConfigModel
from constants import FRENCH_MONTHS_SHORT, FRENCH_DAYS, WMO_WEATHER_CODES
from caches import get_weather_cache, set_weather_cache
from ai_helper import call_gemini_json_api, get_ai_service_config
import time

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/weather", tags=["weather"])


# ─── Config DB ────────────────────────────────────────────────────────────────

def get_weather_config_db() -> dict:
    with get_db_ctx() as conn:
        row = conn.execute(
            "SELECT default_city, default_lat, default_lon FROM weather_settings WHERE id = 1"
        ).fetchone()
    gemini_key = os.getenv("GEMINI_API_KEY", "")
    if row:
        cfg = dict(row)
        cfg["gemini_api_key"] = gemini_key
        return cfg
    return {"gemini_api_key": gemini_key, "default_city": "Paris", "default_lat": 48.8566, "default_lon": 2.3522}


@router.get("/config")
def get_weather_config():
    return get_weather_config_db()


@router.post("/config")
def save_weather_config(config: WeatherConfigModel):
    with get_db_ctx() as conn:
        conn.execute("""
            INSERT INTO weather_settings (id, gemini_api_key, default_city, default_lat, default_lon, updated_at)
            VALUES (1, '', ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(id) DO UPDATE SET
                default_city=excluded.default_city,
                default_lat=excluded.default_lat,
                default_lon=excluded.default_lon,
                updated_at=CURRENT_TIMESTAMP
        """, (config.default_city, config.default_lat, config.default_lon))
        conn.commit()
    return {"success": True}


# ─── Recherche ville ──────────────────────────────────────────────────────────

@router.get("/search")
def search_weather_city(q: str):
    if not q or len(q.strip()) < 2:
        return []
    try:
        ctx = ssl.create_default_context()
        encoded_q = urllib.parse.quote(q.strip())
        url = f"https://geocoding-api.open-meteo.com/v1/search?name={encoded_q}&count=6&language=fr&format=json"
        req = urllib.request.Request(url, headers={"User-Agent": "VicozWorldStation/1.0"})
        with urllib.request.urlopen(req, timeout=5, context=ctx) as resp:
            data = json.loads(resp.read().decode())
            return [
                {
                    "id": item.get("id"),
                    "name": item.get("name"),
                    "admin1": item.get("admin1", ""),
                    "country": item.get("country", ""),
                    "latitude": item.get("latitude"),
                    "longitude": item.get("longitude"),
                    "label": ", ".join(filter(None, [item.get("name"), item.get("admin1"), item.get("country")])),
                }
                for item in data.get("results", [])
            ]
    except Exception as e:
        logger.error(f"Erreur recherche ville météo: {e}")
        return []


# ─── Helpers ─────────────────────────────────────────────────────────────────

def get_wmo_info(code: int) -> dict:
    return WMO_WEATHER_CODES.get(code, {"label": "Partiellement nuageux", "icon": "cloud-sun"})


# ─── Rapport météo ────────────────────────────────────────────────────────────

@router.get("/report")
def get_weather_report(
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    city: Optional[str] = None,
    force: bool = False,
):
    cfg = get_weather_config_db()
    cur_lat = lat if lat is not None else cfg["default_lat"]
    cur_lon = lon if lon is not None else cfg["default_lon"]
    cur_city = city if city else cfg["default_city"]
    gemini_key = os.getenv("GEMINI_API_KEY", "").strip()

    cache_key = f"{round(cur_lat, 3)}_{round(cur_lon, 3)}"
    now_ts = time.time()

    if not force:
        cached = get_weather_cache(cache_key)
        if cached and (now_ts - cached["timestamp"]) < 600:
            data = dict(cached["data"])
            data["city"] = cur_city
            return data

    ctx = ssl.create_default_context()
    sources_data = {}
    hourly_chart = []
    daily_forecast = []

    # 1. Météo-France (AROME / ARPEGE)
    try:
        url_mf = (
            f"https://api.open-meteo.com/v1/meteofrance?latitude={cur_lat}&longitude={cur_lon}"
            f"&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,"
            f"wind_speed_10m,wind_gusts_10m,weather_code,surface_pressure,cloud_cover"
            f"&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,"
            f"uv_index_max,weather_code&hourly=temperature_2m,precipitation_probability,weather_code&timezone=auto"
        )
        req_mf = urllib.request.Request(url_mf, headers={"User-Agent": "VicozWorldStation/1.0"})
        with urllib.request.urlopen(req_mf, timeout=6, context=ctx) as resp:
            d_mf = json.loads(resp.read().decode())
            cur_mf = d_mf.get("current", {})
            w_info = get_wmo_info(cur_mf.get("weather_code", 0))
            sources_data["meteofrance"] = {
                "name": "Météo-France (AROME / ARPEGE)", "country": "🇫🇷 France",
                "temp": round(cur_mf.get("temperature_2m", 0) or 0, 1),
                "apparent_temp": round(cur_mf.get("apparent_temperature", 0) or 0, 1),
                "humidity": cur_mf.get("relative_humidity_2m", 0) or 0,
                "wind_kmh": round(cur_mf.get("wind_speed_10m", 0) or 0, 1),
                "wind_gusts_kmh": round(cur_mf.get("wind_gusts_10m", 0) or 0, 1),
                "precipitation_mm": cur_mf.get("precipitation", 0) or 0,
                "pressure_hpa": round(cur_mf.get("surface_pressure", 1013) or 1013, 0),
                "cloud_cover": cur_mf.get("cloud_cover", 0) or 0,
                "condition": w_info["label"], "icon": w_info["icon"],
            }
            h_times = d_mf.get("hourly", {}).get("time", [])[:24]
            h_temps = d_mf.get("hourly", {}).get("temperature_2m", [])[:24]
            h_rain_probs = d_mf.get("hourly", {}).get("precipitation_probability", [])[:24]
            for i in range(min(len(h_times), 24)):
                h_dt = datetime.fromisoformat(h_times[i])
                hourly_chart.append({
                    "hour": f"{h_dt.hour:02d}h", "time": h_times[i],
                    "temp": round(h_temps[i] or 0, 1) if i < len(h_temps) else 0,
                    "rain_prob": h_rain_probs[i] if i < len(h_rain_probs) and h_rain_probs[i] is not None else 0,
                })
            d_times = d_mf.get("daily", {}).get("time", [])[:7]
            d_max = d_mf.get("daily", {}).get("temperature_2m_max", [])[:7]
            d_min = d_mf.get("daily", {}).get("temperature_2m_min", [])[:7]
            d_codes = d_mf.get("daily", {}).get("weather_code", [])[:7]
            d_rain = d_mf.get("daily", {}).get("precipitation_probability_max", [])[:7]
            d_uv = d_mf.get("daily", {}).get("uv_index_max", [])[:7]
            for j in range(len(d_times)):
                dt_obj = datetime.fromisoformat(d_times[j])
                info_day = get_wmo_info(d_codes[j] if j < len(d_codes) else 0)
                daily_forecast.append({
                    "date": d_times[j],
                    "day_name": "Aujourd'hui" if j == 0 else FRENCH_DAYS[dt_obj.weekday()],
                    "formatted_date": f"{dt_obj.day} {FRENCH_MONTHS_SHORT[dt_obj.month - 1]}",
                    "temp_max": round(d_max[j] or 0, 1) if j < len(d_max) else 0,
                    "temp_min": round(d_min[j] or 0, 1) if j < len(d_min) else 0,
                    "rain_prob": d_rain[j] if j < len(d_rain) and d_rain[j] is not None else 0,
                    "uv_index": d_uv[j] if j < len(d_uv) and d_uv[j] is not None else 0,
                    "condition": info_day["label"], "icon": info_day["icon"],
                })
    except Exception as e:
        logger.warning(f"Erreur source Météo France: {e}")

    # 2. MET Norway (ECMWF Européen)
    try:
        url_norway = f"https://api.met.no/weatherapi/locationforecast/2.0/compact?lat={cur_lat}&lon={cur_lon}"
        req_norway = urllib.request.Request(url_norway, headers={"User-Agent": "VicozWorldStation/1.0 contact@vicozworld.fr"})
        with urllib.request.urlopen(req_norway, timeout=6, context=ctx) as resp:
            d_nor = json.loads(resp.read().decode())
            ts0 = d_nor.get("properties", {}).get("timeseries", [])[0]
            inst = ts0.get("data", {}).get("instant", {}).get("details", {})
            next_1h = ts0.get("data", {}).get("next_1_hours", {}).get("summary", {}).get("symbol_code", "partlycloudy_day")
            air_t = inst.get("air_temperature", 0) or 0
            w_spd = inst.get("wind_speed", 0) or 0
            w_gst = inst.get("wind_speed_of_gust", 0) or 0
            sources_data["metnorway"] = {
                "name": "MET Norway (Modèle ECMWF Européen)", "country": "🇳🇴 Europe / Norvège",
                "temp": round(air_t, 1), "apparent_temp": round(air_t - (w_spd * 0.3), 1),
                "humidity": inst.get("relative_humidity", 0) or 0,
                "wind_kmh": round(w_spd * 3.6, 1), "wind_gusts_kmh": round(w_gst * 3.6, 1),
                "precipitation_mm": 0,
                "pressure_hpa": round(inst.get("air_pressure_at_sea_level", 1013) or 1013, 0),
                "cloud_cover": inst.get("cloud_area_fraction", 0) or 0,
                "condition": next_1h.replace("_", " ").title(),
                "icon": "cloud-sun" if "partlycloudy" in next_1h else ("sun" if "clearsky" in next_1h else "cloud-rain"),
            }
    except Exception as e:
        logger.warning(f"Erreur source MET Norway: {e}")

    # 3. Open-Meteo Global Ensemble (ICON DWD & GFS)
    try:
        url_om = (
            f"https://api.open-meteo.com/v1/forecast?latitude={cur_lat}&longitude={cur_lon}"
            f"&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,"
            f"wind_speed_10m,wind_gusts_10m,weather_code,surface_pressure,cloud_cover&timezone=auto"
        )
        req_om = urllib.request.Request(url_om, headers={"User-Agent": "VicozWorldStation/1.0"})
        with urllib.request.urlopen(req_om, timeout=6, context=ctx) as resp:
            d_om = json.loads(resp.read().decode())
            cur_om = d_om.get("current", {})
            w_info_om = get_wmo_info(cur_om.get("weather_code", 0))
            sources_data["global_ensemble"] = {
                "name": "Global Ensemble (DWD ICON / NOAA GFS)", "country": "🌐 International",
                "temp": round(cur_om.get("temperature_2m", 0) or 0, 1),
                "apparent_temp": round(cur_om.get("apparent_temperature", 0) or 0, 1),
                "humidity": cur_om.get("relative_humidity_2m", 0) or 0,
                "wind_kmh": round(cur_om.get("wind_speed_10m", 0) or 0, 1),
                "wind_gusts_kmh": round(cur_om.get("wind_gusts_10m", 0) or 0, 1),
                "precipitation_mm": cur_om.get("precipitation", 0) or 0,
                "pressure_hpa": round(cur_om.get("surface_pressure", 1013) or 1013, 0),
                "cloud_cover": cur_om.get("cloud_cover", 0) or 0,
                "condition": w_info_om["label"], "icon": w_info_om["icon"],
            }
    except Exception as e:
        logger.warning(f"Erreur source Global Ensemble: {e}")

    temps_list = [s["temp"] for s in sources_data.values() if "temp" in s]
    avg_temp = round(sum(temps_list) / max(len(temps_list), 1), 1)

    consensus_synthesis = {
        "consensus_temp": avg_temp,
        "consensus_condition": sources_data.get("meteofrance", {}).get("condition", "Partiellement nuageux"),
        "confidence_score": min(92, 70 + len(sources_data) * 10),
        "confidence_label": "Élevé (Bonne cohérence entre les modèles)",
        "summary": f"Temps stable sur {cur_city}. Température moyenne de {avg_temp}°C.",
        "rain_risk_level": "Faible", "umbrella_needed": False,
        "outfit_advice": "Tenue légère et confortable.",
        "activities_advice": "Excellentes conditions pour les activités en plein air.",
    }

    if gemini_key and sources_data:
        ai_cfg = get_ai_service_config()
        model_choice = ai_cfg.get("meteo", "gemini-1.5-flash")
        gemini_prompt = f"""Tu es le météorologue expert IA de VicozWorld.
Voici les données météo de 3 modèles professionnels pour {cur_city}:
{json.dumps(sources_data, ensure_ascii=False, indent=2)}

Réponds STRICTEMENT au format JSON:
{{"consensus_temp": {avg_temp}, "consensus_condition": "string", "confidence_score": 95,
"confidence_label": "string", "summary": "string de 2 phrases", "rain_risk_level": "Faible",
"umbrella_needed": false, "outfit_advice": "string", "activities_advice": "string"}}"""
        parsed = call_gemini_json_api(gemini_prompt, gemini_key, preferred_model=model_choice)
        if parsed:
            consensus_synthesis.update(parsed)
            consensus_synthesis["ai_generated"] = True
            consensus_synthesis["ai_model"] = model_choice
        else:
            consensus_synthesis["ai_generated"] = False
    else:
        consensus_synthesis["ai_generated"] = False

    result_payload = {
        "city": cur_city,
        "coordinates": {"latitude": cur_lat, "longitude": cur_lon},
        "sources_count": len(sources_data),
        "sources": sources_data,
        "synthesis": consensus_synthesis,
        "hourly_chart": hourly_chart,
        "daily_forecast": daily_forecast,
        "updated_at": now_ts,
    }

    set_weather_cache(cache_key, result_payload)
    return result_payload
