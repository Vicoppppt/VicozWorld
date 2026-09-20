from fastapi import APIRouter
from typing import Any
from database import crud_get_all, crud_upsert, crud_delete

router = APIRouter(prefix="/api/medias", tags=["medias"])


@router.get("")
def get_medias():
    items = crud_get_all("medias", sort_key="loggedAt", sort_reverse=True)
    return items


@router.put("/{media_id}")
def save_media(media_id: str, payload: dict[str, Any]):
    return crud_upsert("medias", media_id, payload)


@router.delete("/{media_id}")
def delete_media(media_id: str):
    return crud_delete("medias", media_id)
