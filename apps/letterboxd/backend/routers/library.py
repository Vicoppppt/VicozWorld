import json
import logging
import urllib.request
import urllib.parse
from concurrent.futures import ThreadPoolExecutor
from typing import Any

from fastapi import APIRouter
from database import crud_get_all, crud_upsert, crud_delete

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/library", tags=["library"])


@router.get("/search/deezer")
def search_deezer_proxy(q: str):
    """Proxy de recherche d'albums Deezer avec pochettes 1000x1000px et dates de sortie."""
    if not q or not q.strip():
        return {"data": []}
    try:
        encoded_q = urllib.parse.quote(q.strip())
        url = f"https://api.deezer.com/search/album?q={encoded_q}&limit=12"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
        with urllib.request.urlopen(req, timeout=5) as response:
            if response.status != 200:
                return {"data": []}
            data = json.loads(response.read().decode("utf-8"))
            albums = data.get("data", [])

        def fetch_album_date(alb):
            alb_id = alb.get("id")
            if not alb_id:
                return alb
            try:
                d_req = urllib.request.Request(
                    f"https://api.deezer.com/album/{alb_id}",
                    headers={"User-Agent": "Mozilla/5.0"}
                )
                with urllib.request.urlopen(d_req, timeout=3) as d_res:
                    if d_res.status == 200:
                        alb["release_date"] = json.loads(d_res.read().decode("utf-8")).get("release_date", "")
            except Exception:
                pass
            return alb

        with ThreadPoolExecutor(max_workers=6) as executor:
            enriched_albums = list(executor.map(fetch_album_date, albums))
        return {"data": enriched_albums}
    except Exception as e:
        logger.warning(f"Erreur proxy Deezer: {e}")
    return {"data": []}


@router.get("")
def get_library_items():
    return crud_get_all("library_items", sort_key="addedAt", sort_reverse=True)


@router.put("/{item_id}")
def save_library_item(item_id: str, payload: dict[str, Any]):
    return crud_upsert("library_items", item_id, payload)


@router.delete("/{item_id}")
def delete_library_item(item_id: str):
    return crud_delete("library_items", item_id)
