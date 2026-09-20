"""
Router Actualités : /api/news, /api/news/briefing
Flux RSS multi-sources avec cache in-memory thread-safe.
"""
import ssl
import re
import json
import logging
import urllib.request
import time
from typing import Optional
from email.utils import parsedate_to_datetime
import xml.etree.ElementTree as ET
from fastapi import APIRouter

from caches import get_news_cache, set_news_cache, get_briefing_cache, set_briefing_cache
from ai_helper import call_gemini_json_api, get_ai_service_config
import os

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/news", tags=["news"])

NEWS_SOURCES = [
    {"id": "lemonde", "name": "Le Monde", "url": "https://www.lemonde.fr/rss/une.xml",
     "color": "from-sky-900/40 to-indigo-950/40", "border": "border-sky-500/30",
     "badgeColor": "bg-sky-500/20 text-sky-300 border-sky-500/30"},
    {"id": "liberation", "name": "Libération", "url": "https://www.liberation.fr/arc/outboundfeeds/rss-all/",
     "color": "from-red-950/40 to-rose-950/40", "border": "border-red-500/30",
     "badgeColor": "bg-red-500/20 text-red-300 border-red-500/30"},
    {"id": "franceinfo", "name": "France Info", "url": "https://www.francetvinfo.fr/titres.rss",
     "color": "from-amber-950/40 to-yellow-950/40", "border": "border-amber-500/30",
     "badgeColor": "bg-amber-500/20 text-amber-300 border-amber-500/30"},
    {"id": "courrier", "name": "Courrier International", "url": "https://www.courrierinternational.com/feed/all/rss.xml",
     "color": "from-pink-950/40 to-fuchsia-950/40", "border": "border-pink-500/30",
     "badgeColor": "bg-pink-500/20 text-pink-300 border-pink-500/30"},
    {"id": "mediapart", "name": "Mediapart", "url": "https://www.mediapart.fr/articles/feed",
     "color": "from-rose-950/40 to-red-950/40", "border": "border-rose-500/30",
     "badgeColor": "bg-rose-500/20 text-rose-300 border-rose-500/30"},
]


def fetch_rss_feed(source_info: dict) -> list:
    articles = []
    try:
        ctx = ssl.create_default_context()
        req = urllib.request.Request(
            source_info["url"],
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"},
        )
        with urllib.request.urlopen(req, timeout=8, context=ctx) as response:
            root = ET.fromstring(response.read())
            for item in root.findall(".//item"):
                title_elem = item.find("title")
                link_elem = item.find("link")
                desc_elem = item.find("description")
                pub_elem = item.find("pubDate")

                title = (title_elem.text or "").strip() if title_elem is not None else ""
                link = (link_elem.text or "").strip() if link_elem is not None else ""
                desc_raw = (desc_elem.text or "").strip() if desc_elem is not None else ""
                pub_date_str = (pub_elem.text or "").strip() if pub_elem is not None else ""

                if not title or not link:
                    continue

                # Extraction d'image
                image_url = None
                enclosure = item.find("enclosure")
                if enclosure is not None and "image" in enclosure.get("type", ""):
                    image_url = enclosure.get("url")
                if not image_url:
                    for child in item:
                        if child.tag.endswith("content") or child.tag.endswith("thumbnail"):
                            image_url = child.get("url")
                            if image_url:
                                break
                if not image_url and desc_raw:
                    img_match = re.search(r'<img[^>]+src=[\'"]([^\'"]+)[\'"]', desc_raw)
                    if img_match:
                        image_url = img_match.group(1)

                # Nettoyage description HTML
                clean_desc = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", desc_raw)).strip()
                if len(clean_desc) > 280:
                    clean_desc = clean_desc[:280] + "..."

                timestamp = 0
                if pub_date_str:
                    try:
                        timestamp = parsedate_to_datetime(pub_date_str).timestamp()
                    except Exception:
                        pass

                articles.append({
                    "id": f"{source_info['id']}-{hash(link)}",
                    "source_id": source_info["id"],
                    "source_name": source_info["name"],
                    "badge_color": source_info["badgeColor"],
                    "border_color": source_info["border"],
                    "title": title, "link": link,
                    "description": clean_desc,
                    "image": image_url,
                    "pub_date": pub_date_str,
                    "timestamp": timestamp,
                })
    except Exception as e:
        logger.warning(f"Erreur RSS pour {source_info['name']}: {e}")
    return articles


def _get_fresh_news() -> list:
    """Retourne les articles frais (rafraîchissement si cache > 5 min)."""
    cached = get_news_cache()
    if time.time() - cached["timestamp"] < 300 and cached["articles"]:
        return cached["articles"]
    all_articles = []
    for src in NEWS_SOURCES:
        all_articles.extend(fetch_rss_feed(src))
    all_articles.sort(key=lambda x: x["timestamp"], reverse=True)
    set_news_cache(all_articles)
    return all_articles


@router.get("")
def get_news(source: Optional[str] = None, search: Optional[str] = None):
    filtered = _get_fresh_news()
    if source and source != "all":
        filtered = [a for a in filtered if a["source_id"] == source]
    if search:
        s = search.lower().strip()
        filtered = [a for a in filtered if s in a["title"].lower() or s in a["description"].lower()]
    cached = get_news_cache()
    return {
        "sources": [{"id": s["id"], "name": s["name"]} for s in NEWS_SOURCES],
        "count": len(filtered),
        "updated_at": cached["timestamp"],
        "articles": filtered,
    }


@router.get("/briefing")
def get_news_briefing(force: Optional[bool] = False):
    current_time = time.time()
    cached = get_briefing_cache()
    if not force and cached["data"] and (current_time - cached["timestamp"]) < 1800:
        return cached["data"]

    articles = _get_fresh_news()
    if not articles:
        return {"success": False, "error": "Aucun article disponible."}

    gemini_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not gemini_key:
        return {"success": False, "error": "Clé API Gemini non configurée."}

    compact_news = [
        f"[{a['source_name']}] {a['title']} - {a['description'][:80]}"
        for a in articles[:30]
    ]
    prompt = f"""Tu es le rédacteur en chef expert de VicozWorld.
Voici les titres récents des 5 grands médias :
{json.dumps(compact_news, ensure_ascii=False, indent=1)}

Réponds STRICTEMENT au format JSON :
{{
  "global_takeaway": "Une phrase percutante qui résume la tendance majeure.",
  "top_stories": [
    {{"headline": "Titre 1", "summary": "2 phrases.", "category": "Géopolitique", "importance": "Cruciale", "sources": "Le Monde"}},
    {{"headline": "Titre 2", "summary": "2 phrases.", "category": "International", "importance": "Élevée", "sources": "Libération"}},
    {{"headline": "Titre 3", "summary": "2 phrases.", "category": "Société", "importance": "Élevée", "sources": "Mediapart"}}
  ],
  "in_brief": ["Fait secondaire 1", "Fait secondaire 2", "Fait secondaire 3"]
}}"""

    ai_cfg = get_ai_service_config()
    model_choice = ai_cfg.get("news", "gemini-1.5-flash")
    parsed_briefing = call_gemini_json_api(prompt, gemini_key, preferred_model=model_choice)

    if parsed_briefing:
        result = {
            "success": True, "generated_at": current_time,
            "ai_model": model_choice, "briefing": parsed_briefing,
        }
        set_briefing_cache(result)
        return result

    # Fallback élégant
    fallback = {
        "global_takeaway": "L'actualité internationale reste dense avec une attention aux enjeux géopolitiques.",
        "top_stories": [{"headline": articles[0]["title"], "summary": articles[0]["description"][:140],
                         "category": "International", "importance": "Élevée",
                         "sources": articles[0]["source_name"]}],
        "in_brief": [a["title"][:80] for a in articles[1:4]],
    }
    return {"success": True, "generated_at": current_time, "ai_model": "Fallback", "briefing": fallback}
