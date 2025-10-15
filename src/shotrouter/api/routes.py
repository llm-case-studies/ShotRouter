from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from ..state import get_app_state
from ..events import broadcast
from ..sources import registry as source_registry, Source
from .. import db


router = APIRouter()


class ArmBody(BaseModel):
    repo_path: str
    target_dir: Optional[str] = "assets/images"


@router.post("/arm")
def arm_next(body: ArmBody) -> Dict[str, Any]:
    st = get_app_state()
    st.armed_repo_path = body.repo_path
    if body.target_dir:
        st.armed_target_dir = body.target_dir
    return {"status": "armed"}


class RouteBody(BaseModel):
    ids: List[str]
    repo_path: Optional[str] = None
    target_dir: Optional[str] = None


@router.get("/screenshots")
def list_screenshots(status: Optional[str] = Query(None), limit: int = 50, offset: int = 0) -> Dict[str, Any]:
    items = db.get().list_screenshots(status=status, limit=limit, offset=offset)
    return {"items": items}


@router.post("/route")
def route_items(body: RouteBody) -> Dict[str, Any]:
    st = get_app_state()
    repo = body.repo_path or st.armed_repo_path
    target_dir = body.target_dir or st.armed_target_dir
    if not repo:
        raise HTTPException(status_code=422, detail="repo_path missing and nothing armed")

    routed = []
    for sid in body.ids:
        s = db.get().get(sid)
        if not s:
            continue
        dest_path = f"{repo.rstrip('/')}/{target_dir.strip('/')}/example-{sid}.png"
        if db.get().route(sid, dest_path):
            routed.append({"id": sid, "dest_path": dest_path})
            broadcast("screenshot.routed", {"id": sid, "dest_path": dest_path})
    return {"routed": routed}


@router.delete("/screenshots/{sid}")
def delete_item(sid: str, with_file: bool = False) -> Dict[str, Any]:
    if db.get().delete(sid):
        broadcast("screenshot.deleted", {"id": sid})
        return {"deleted": sid}
    raise HTTPException(status_code=404, detail="not found")


class SettingsBody(BaseModel):
    sources: Optional[List[str]] = None
    debounce_ms: Optional[int] = None
    inbox_dir: Optional[str] = None


@router.get("/settings")
def get_settings() -> Dict[str, Any]:
    # Placeholder: return minimal effective config
    st = get_app_state()
    return {
        "api": {"host": "127.0.0.1", "port": 8767},
        "armed": {"repo_path": st.armed_repo_path, "target_dir": st.armed_target_dir},
        "sources": [s.path for s in source_registry.list()],
    }


@router.post("/settings")
def set_settings(body: SettingsBody) -> Dict[str, Any]:
    # Placeholder: accept and echo; real impl would persist
    return {"status": "ok", "updated": body.model_dump(exclude_none=True)}


# Sources API (in-memory)
class SourceBody(BaseModel):
    path: str
    enabled: bool = True
    debounce_ms: int = 400


@router.get("/sources")
def list_sources() -> Dict[str, Any]:
    return {"items": [s.__dict__ for s in source_registry.list()]}


@router.post("/sources")
def add_source(body: SourceBody) -> Dict[str, Any]:
    source_registry.add(Source(path=body.path, enabled=body.enabled, debounce_ms=body.debounce_ms))
    return {"status": "ok"}


@router.delete("/sources")
def remove_source(path: str) -> Dict[str, Any]:
    ok = source_registry.remove(path)
    if not ok:
        raise HTTPException(status_code=404, detail="not found")
    return {"status": "ok"}


# Compliance stubs
@router.get("/scans")
def list_scans(status: Optional[str] = None, limit: int = 50, offset: int = 0) -> Dict[str, Any]:
    return {"items": []}


@router.get("/findings")
def list_findings(screenshot_id: Optional[str] = None) -> Dict[str, Any]:
    return {"items": []}


class ApproveBody(BaseModel):
    id: str
    reason: Optional[str] = None


@router.post("/approve")
def approve_item(body: ApproveBody) -> Dict[str, Any]:
    # Stub: in a real impl, update decision and allow routing
    return {"status": "approved", "id": body.id}


class QuarantineBody(BaseModel):
    id: str
    reason: Optional[str] = None


@router.post("/quarantine")
def quarantine_item(body: QuarantineBody) -> Dict[str, Any]:
    if db.get().quarantine(body.id):
        broadcast("screenshot.quarantined", {"id": body.id})
        return {"status": "quarantined", "id": body.id}
    raise HTTPException(status_code=404, detail="not found")


# Dev helper to simulate a new screenshot (no watcher yet)
class SimNewBody(BaseModel):
    source_path: str
    size: int = 12345


@router.post("/dev/simulate_new")
def simulate_new(body: SimNewBody) -> Dict[str, Any]:
    rec = db.get().add_screenshot(body.source_path, body.size)
    broadcast("screenshot.new", {"id": rec["id"], "source_path": rec["source_path"], "size": rec["size"]})
    return {"id": rec["id"]}
