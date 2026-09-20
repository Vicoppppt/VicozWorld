"""
Tous les modèles Pydantic du backend.
Centralisés ici pour éviter la duplication entre routers.
"""
from pydantic import BaseModel
from typing import Optional, List, Dict, Any


# ─── Banque ──────────────────────────────────────────────────────────────────

class AccountBalance(BaseModel):
    id: str
    label: str
    balance: float
    currency: str
    bank_name: str


class BalancesResponse(BaseModel):
    accounts: list[AccountBalance]
    total: float


# ─── Électricité ──────────────────────────────────────────────────────────────

class ElectricityConfig(BaseModel):
    kwh_price: float = 0.2516
    subscription_price: float = 12.50
    target_monthly_budget: float = 60.00
    pdl: Optional[str] = None
    token: Optional[str] = None


# ─── Météo ────────────────────────────────────────────────────────────────────

class WeatherConfigModel(BaseModel):
    gemini_api_key: str
    default_city: str = "Paris"
    default_lat: float = 48.8566
    default_lon: float = 2.3522


# ─── IA ──────────────────────────────────────────────────────────────────────

class AIServiceConfigRequest(BaseModel):
    meteo: Optional[str] = "gemini-1.5-flash"
    news: Optional[str] = "gemini-1.5-flash"
    hub_briefing: Optional[str] = "gemini-1.5-flash"
    gmail_assistant: Optional[str] = "gemini-1.5-flash"
    tools_text: Optional[str] = "gemini-1.5-pro"


# ─── Audit ───────────────────────────────────────────────────────────────────

class PageViewRequest(BaseModel):
    page: str
    path: str


# ─── Certificats ─────────────────────────────────────────────────────────────

class CertCreateRequest(BaseModel):
    device_name: str
    password: str
    email: Optional[str] = None


# ─── Proxys ──────────────────────────────────────────────────────────────────

class ProxyCreateRequest(BaseModel):
    domain: str
    label: str


# ─── Hub ─────────────────────────────────────────────────────────────────────

class HubPermissionsRequest(BaseModel):
    allowed_modules: List[str]


class HubUrlsRequest(BaseModel):
    urls: Dict[str, str]


# ─── Prise Connectée (Home Assistant / TP-Link P100) ──────────────────────────

class PlugConfigRequest(BaseModel):
    hass_url: Optional[str] = None
    hass_token: Optional[str] = None
    entity_id: Optional[str] = "switch.prise_serveur"
    name: Optional[str] = "Ventilos Serveur"
    device_model: Optional[str] = "TP-Link P100"
    room: Optional[str] = "Salon"


class PlugSetStateRequest(BaseModel):
    state: str  # "on" | "off"

