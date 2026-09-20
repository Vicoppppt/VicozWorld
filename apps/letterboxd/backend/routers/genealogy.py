import json
from typing import Any

from fastapi import APIRouter
from database import crud_get_all, crud_upsert, crud_delete, get_db_ctx

router = APIRouter(prefix="/api/genealogy", tags=["genealogy"])


@router.get("")
def get_genealogy_members():
    return crud_get_all("genealogy")


@router.put("/{member_id}")
def save_genealogy_member(member_id: str, payload: dict[str, Any]):
    return crud_upsert("genealogy", member_id, payload)


@router.delete("/{member_id}")
def delete_genealogy_member(member_id: str):
    return crud_delete("genealogy", member_id)


@router.post("/bulk")
def bulk_save_genealogy(payload: dict[str, Any]):
    members = payload.get("members", [])
    replace = payload.get("replace", False)
    with get_db_ctx() as conn:
        if replace:
            conn.execute("DELETE FROM genealogy")
        for m in members:
            m_id = str(m.get("id", ""))
            if not m_id:
                continue
            conn.execute("""
                INSERT INTO genealogy (id, data, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(id) DO UPDATE SET data=excluded.data, updated_at=CURRENT_TIMESTAMP
            """, (m_id, json.dumps(m)))
        conn.commit()
    return {"success": True, "count": len(members)}


@router.delete("")
def clear_genealogy():
    with get_db_ctx() as conn:
        conn.execute("DELETE FROM genealogy")
        conn.commit()
    return {"success": True, "message": "Généalogie réinitialisée"}
