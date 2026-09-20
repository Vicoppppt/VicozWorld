from fastapi import APIRouter
from typing import Any
from database import crud_get_all, crud_upsert, crud_delete

router = APIRouter(prefix="/api/notes", tags=["notes"])


@router.get("")
def get_notes():
    return crud_get_all("notes", sort_key="updatedAt", sort_reverse=True)


@router.put("/{note_id}")
def save_note(note_id: str, payload: dict[str, Any]):
    return crud_upsert("notes", note_id, payload)


@router.delete("/{note_id}")
def delete_note(note_id: str):
    return crud_delete("notes", note_id)
