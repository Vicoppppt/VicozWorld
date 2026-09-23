"""
Caches in-memory thread-safe pour l'API backend.
Chaque cache est protégé par un threading.Lock() dédié.
"""
import threading
import time

# ─── Cache actualités ─────────────────────────────────────────────────────────

_news_lock = threading.Lock()
_news_cache: dict = {"timestamp": 0.0, "articles": []}


def get_news_cache() -> dict:
    with _news_lock:
        return dict(_news_cache)


def set_news_cache(articles: list):
    with _news_lock:
        _news_cache["timestamp"] = time.time()
        _news_cache["articles"] = articles


# ─── Cache briefing ───────────────────────────────────────────────────────────

_briefing_lock = threading.Lock()
_briefing_cache: dict = {"timestamp": 0.0, "data": None}


def get_briefing_cache() -> dict:
    with _briefing_lock:
        return dict(_briefing_cache)


def set_briefing_cache(data: dict):
    with _briefing_lock:
        _briefing_cache["timestamp"] = time.time()
        _briefing_cache["data"] = data


# ─── Cache météo (multi-clé lat/lon) ─────────────────────────────────────────

_weather_lock = threading.Lock()
_weather_cache: dict = {}


def get_weather_cache(key: str) -> dict | None:
    with _weather_lock:
        return _weather_cache.get(key)


def set_weather_cache(key: str, data: dict):
    with _weather_lock:
        _weather_cache[key] = {"timestamp": time.time(), "data": data}


# ─── Cache hub ────────────────────────────────────────────────────────────────

_hub_lock = threading.Lock()
_hub_cache: dict = {"timestamp": 0.0, "data": None}


def get_hub_cache() -> dict:
    with _hub_lock:
        return dict(_hub_cache)


def set_hub_cache(data: dict):
    with _hub_lock:
        _hub_cache["timestamp"] = time.time()
        _hub_cache["data"] = data


# ─── Cache suggestion film quotidienne ───────────────────────────────────────

_movie_lock = threading.Lock()
_movie_cache: dict = {"date": None, "movie": None}


def get_movie_cache() -> dict:
    with _movie_lock:
        return dict(_movie_cache)


def set_movie_cache(date: str, movie: dict):
    with _movie_lock:
        _movie_cache["date"] = date
        _movie_cache["movie"] = movie


# ─── OTP Invité dynamique ─────────────────────────────────────────────────────

_otp_lock = threading.Lock()
_guest_otp: dict = {"code": None, "expires_at": 0.0}


def get_guest_otp() -> dict:
    with _otp_lock:
        return dict(_guest_otp)


def set_guest_otp(code: str, expires_at: float):
    with _otp_lock:
        _guest_otp["code"] = code
        _guest_otp["expires_at"] = expires_at


def revoke_guest_otp():
    with _otp_lock:
        _guest_otp["code"] = None
        _guest_otp["expires_at"] = 0.0


# ─── Cache Banque ───────────────────────────────────────────────────────────────

_bank_lock = threading.Lock()
_bank_cache: dict = {"timestamp": 0.0, "data": None}


def get_bank_cache() -> dict:
    with _bank_lock:
        return dict(_bank_cache)


def set_bank_cache(data: dict):
    with _bank_lock:
        _bank_cache["timestamp"] = time.time()
        _bank_cache["data"] = data


# ─── Rate-limiting Gemini ─────────────────────────────────────────────────────

_gemini_lock = threading.Lock()
_last_gemini_call_time: float = 0.0


def get_gemini_lock() -> threading.Lock:
    return _gemini_lock


def get_last_gemini_call() -> float:
    return _last_gemini_call_time


def set_last_gemini_call(t: float):
    global _last_gemini_call_time
    _last_gemini_call_time = t
