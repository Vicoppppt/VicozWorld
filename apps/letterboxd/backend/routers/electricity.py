"""
Router Électricité : /api/electricity/*
Gestion des données Enedis via MyElectricalData.
"""
import os
import json
import logging
import urllib.request
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter

from database import get_db_ctx
from models import ElectricityConfig
from constants import FRENCH_MONTHS, FRENCH_DAYS
import calendar

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/electricity", tags=["electricity"])


# ─── Config ───────────────────────────────────────────────────────────────────

def get_electricity_config_db() -> dict:
    with get_db_ctx() as conn:
        row = conn.execute(
            "SELECT kwh_price, subscription_price, target_monthly_budget FROM electricity_settings WHERE id = 1"
        ).fetchone()

    pdl = os.getenv("ENEDIS_PDL", "")
    token = os.getenv("ENEDIS_TOKEN", "")

    if row:
        d = dict(row)
        d["pdl"] = pdl
        d["token"] = token
        return d
    return {
        "pdl": pdl, "token": token,
        "kwh_price": 0.2516, "subscription_price": 12.50, "target_monthly_budget": 60.00,
    }


@router.get("/config")
def get_electricity_config():
    return get_electricity_config_db()


@router.post("/config")
def save_electricity_config(config: ElectricityConfig):
    with get_db_ctx() as conn:
        conn.execute("""
            INSERT INTO electricity_settings (id, pdl, token, kwh_price, subscription_price, target_monthly_budget, updated_at)
            VALUES (1, '', '', ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(id) DO UPDATE SET
                kwh_price = excluded.kwh_price,
                subscription_price = excluded.subscription_price,
                target_monthly_budget = excluded.target_monthly_budget,
                updated_at = CURRENT_TIMESTAMP
        """, (config.kwh_price, config.subscription_price, config.target_monthly_budget))
        conn.commit()
    sync_res = sync_electricity_from_api(config.pdl, config.token, days=90)
    return {"success": True, "sync": sync_res}


# ─── Sync API ──────────────────────────────────────────────────────────────────

def sync_electricity_from_api(pdl: str, token: str, days: int = 90) -> dict:
    if not pdl or not token:
        return {"success": False, "error": "PDL ou Token non renseigné."}

    end_dt = datetime.now()
    start_dt = end_dt - timedelta(days=days)
    end_str = end_dt.strftime("%Y-%m-%d")
    start_str = start_dt.strftime("%Y-%m-%d")
    synced_count = 0

    with get_db_ctx() as conn:
        # 1. Consommation journalière en Wh
        url_conso = f"https://www.myelectricaldata.fr/daily_consumption/{pdl}/start/{start_str}/end/{end_str}/"
        try:
            req = urllib.request.Request(url_conso, headers={"Authorization": token, "User-Agent": "VicozWorld/1.0"})
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                for r in data.get("meter_reading", {}).get("interval_reading", []):
                    conn.execute("""
                        INSERT INTO electricity_daily_cache (pdl, date, value_wh, updated_at)
                        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
                        ON CONFLICT(pdl, date) DO UPDATE SET value_wh=excluded.value_wh, updated_at=CURRENT_TIMESTAMP
                    """, (pdl, r.get("date"), float(r.get("value", 0))))
                    synced_count += 1
        except Exception as e:
            logger.error(f"Erreur sync conso: {e}")

        # 2. Puissance max journalière en VA
        url_max = f"https://www.myelectricaldata.fr/daily_consumption_max_power/{pdl}/start/{start_str}/end/{end_str}/"
        try:
            req = urllib.request.Request(url_max, headers={"Authorization": token, "User-Agent": "VicozWorld/1.0"})
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                for r in data.get("meter_reading", {}).get("interval_reading", []):
                    conn.execute("""
                        UPDATE electricity_daily_cache
                        SET max_power_va = ? WHERE pdl = ? AND date = ?
                    """, (float(r.get("value", 0)), pdl, r.get("date")))
        except Exception as e:
            logger.warning(f"Erreur sync max power: {e}")

        conn.commit()

    return {"success": True, "synced_count": synced_count}


@router.post("/sync")
def trigger_electricity_sync():
    config = get_electricity_config_db()
    return sync_electricity_from_api(config["pdl"], config["token"], days=90)


# ─── Stats ─────────────────────────────────────────────────────────────────────

@router.get("/stats")
def get_electricity_stats():
    config = get_electricity_config_db()
    pdl = config["pdl"]
    token = config["token"]
    kwh_price = config["kwh_price"]
    sub_price = config["subscription_price"]
    target_budget = config["target_monthly_budget"]

    with get_db_ctx() as conn:
        count, max_date = conn.execute(
            "SELECT COUNT(*), MAX(date) FROM electricity_daily_cache WHERE pdl = ?", (pdl,)
        ).fetchone()

    if count == 0:
        sync_electricity_from_api(pdl, token, days=90)

    with get_db_ctx() as conn:
        rows = conn.execute(
            "SELECT date, value_wh, max_power_va FROM electricity_daily_cache WHERE pdl = ? ORDER BY date ASC",
            (pdl,)
        ).fetchall()

    daily_data = [dict(r) for r in rows]

    now = datetime.now()
    current_month_str = now.strftime("%Y-%m")
    _, days_in_current_month = calendar.monthrange(now.year, now.month)
    prev_month_last_day = now.replace(day=1) - timedelta(days=1)
    prev_month_str = prev_month_last_day.strftime("%Y-%m")

    this_month_kwh = 0.0
    this_month_days_count = 0
    prev_month_kwh = 0.0
    yesterday_info = None
    history_chart = []
    monthly_agg = {}

    for item in daily_data:
        d_str = item["date"]
        kwh = round(item["value_wh"] / 1000.0, 2)
        cost = round(kwh * kwh_price, 2)
        max_va = item["max_power_va"]
        dt = datetime.strptime(d_str, "%Y-%m-%d")
        m_str = dt.strftime("%Y-%m")

        if m_str not in monthly_agg:
            monthly_agg[m_str] = {"kwh": 0.0, "cost": 0.0, "month": m_str,
                                   "label": f"{FRENCH_MONTHS[dt.month - 1]} {dt.year}"}
        monthly_agg[m_str]["kwh"] = round(monthly_agg[m_str]["kwh"] + kwh, 2)
        monthly_agg[m_str]["cost"] = round(monthly_agg[m_str]["kwh"] * kwh_price + sub_price, 2)

        if m_str == current_month_str:
            this_month_kwh += kwh
            this_month_days_count += 1
        elif m_str == prev_month_str:
            prev_month_kwh += kwh

        history_chart.append({
            "date": d_str,
            "label": f"{dt.day:02d}/{dt.month:02d}",
            "day_name": FRENCH_DAYS[dt.weekday()],
            "kwh": kwh, "cost": cost,
            "max_power_va": int(max_va) if max_va else 0,
        })

    recent_history = history_chart[-35:] if len(history_chart) > 35 else history_chart

    if daily_data:
        last = daily_data[-1]
        last_dt = datetime.strptime(last["date"], "%Y-%m-%d")
        yesterday_info = {
            "date": last["date"],
            "formatted_date": f"{FRENCH_DAYS[last_dt.weekday()]} {last_dt.day} {FRENCH_MONTHS[last_dt.month - 1]}",
            "kwh": round(last["value_wh"] / 1000.0, 2),
            "cost": round((last["value_wh"] / 1000.0) * kwh_price, 2),
            "max_power_va": int(last["max_power_va"] or 0),
        }

    this_month_kwh = round(this_month_kwh, 2)
    this_month_energy_cost = round(this_month_kwh * kwh_price, 2)
    this_month_current_cost = round(this_month_energy_cost + sub_price, 2)
    daily_avg_kwh = round(this_month_kwh / max(this_month_days_count, 1), 2)
    projected_kwh = round(daily_avg_kwh * days_in_current_month, 1)
    projected_total_cost = round(projected_kwh * kwh_price + sub_price, 2)
    budget_delta = round(projected_total_cost - target_budget, 2)
    budget_used_pct = round((this_month_current_cost / max(target_budget, 1)) * 100, 1)
    prev_month_cost = round(prev_month_kwh * kwh_price + sub_price, 2)
    comparison_kwh_pct = (
        round(((projected_kwh - prev_month_kwh) / prev_month_kwh) * 100, 1) if prev_month_kwh > 0 else 0.0
    )

    return {
        "configured": bool(pdl and token),
        "settings": config,
        "yesterday": yesterday_info,
        "this_month": {
            "month_name": f"{FRENCH_MONTHS[now.month - 1]} {now.year}",
            "days_elapsed": this_month_days_count,
            "days_total": days_in_current_month,
            "total_kwh": this_month_kwh,
            "daily_avg_kwh": daily_avg_kwh,
            "current_cost": this_month_current_cost,
            "energy_cost": this_month_energy_cost,
            "projected_kwh": projected_kwh,
            "projected_cost": projected_total_cost,
            "target_budget": target_budget,
            "budget_delta": budget_delta,
            "is_over_budget": budget_delta > 0,
            "budget_used_pct": budget_used_pct,
        },
        "last_month": {
            "month_name": f"{FRENCH_MONTHS[prev_month_last_day.month - 1]} {prev_month_last_day.year}",
            "total_kwh": round(prev_month_kwh, 2),
            "total_cost": prev_month_cost,
        },
        "comparison_kwh_pct": comparison_kwh_pct,
        "daily_history": recent_history,
        "monthly_history": list(monthly_agg.values())[-6:],
    }
