from typing import Any, Dict, List, Optional
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel

from ..state import get_app_state
from ..events import broadcast
from ..sources import registry as source_registry, Source
from ..config import get_default_source_candidates
from ..watcher import manager as watch_manager
from .. import db
from ..routing import route_to


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
        final = route_to(sid, dest_root=repo, target_dir=target_dir)
        if final:
            routed.append({"id": sid, "dest_path": final})
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
    # Merge registry with active watchers to avoid inconsistencies
    reg = {s.path: s for s in source_registry.list()}
    for w in watch_manager.list_active():
        path = w.get("path")
        if path and path not in reg:
            reg[path] = Source(path=path, enabled=bool(w.get("running")), debounce_ms=int(w.get("debounce_ms") or 400))
    return {"items": [s.__dict__ for s in reg.values()]}


@router.post("/sources")
def add_source(body: SourceBody) -> Dict[str, Any]:
    p = Path(body.path).expanduser()
    if not p.exists():
        raise HTTPException(status_code=400, detail="path does not exist")
    source_registry.add(Source(path=str(p), enabled=body.enabled, debounce_ms=body.debounce_ms))
    if body.enabled:
        watch_manager.start_for(p, debounce_ms=body.debounce_ms)
    return {"status": "ok"}


@router.delete("/sources")
def remove_source(path: str) -> Dict[str, Any]:
    ok = source_registry.remove(path)
    if not ok:
        raise HTTPException(status_code=404, detail="not found")
    try:
        watch_manager.stop_for(Path(path))
    except Exception:
        pass
    return {"status": "ok"}


@router.get("/sources/candidates")
def source_candidates() -> Dict[str, Any]:
    return {"items": [str(p) for p in get_default_source_candidates()]}


@router.get("/status")
def status() -> Dict[str, Any]:
    watchers = watch_manager.list_active()
    return {
        "watching_count": sum(1 for w in watchers if w.get("running")),
        "watchers": watchers,
    }


# Destinations
class DestinationBody(BaseModel):
    path: str
    target_dir: str = ""
    name: Optional[str] = None
    icon: Optional[str] = None
    name_format: Optional[str] = None


@router.get("/destinations")
def list_destinations() -> Dict[str, Any]:
    import os
    items = db.get().list_destinations()
    for it in items:
        it["exists"] = os.path.isdir(it["path"])
    return {"items": items}


@router.post("/destinations")
def add_destination(body: DestinationBody) -> Dict[str, Any]:
    rec = db.get().add_destination(path=body.path, target_dir=body.target_dir, name=body.name, icon=body.icon, name_format=body.name_format)
    return {"destination": rec}


@router.delete("/destinations")
def remove_destination(path: str) -> Dict[str, Any]:
    ok = db.get().delete_destination(path)
    if not ok:
        raise HTTPException(status_code=404, detail="not found")
    return {"status": "ok"}


# Routes
class RouteAddBody(BaseModel):
    source_path: str
    dest_path: str
    priority: int = 1
    active: bool = True


@router.get("/routes")
def list_routes(source_path: Optional[str] = None, dest_path: Optional[str] = None) -> Dict[str, Any]:
    routes = db.get().list_routes(source_path=source_path)
    if dest_path:
        routes = [r for r in routes if r.get("dest_path") == dest_path]
    # Attach minimal destination info
    dsts = {d["path"]: d for d in db.get().list_destinations()}
    out = []
    for r in routes:
        d = dsts.get(r["dest_path"]) or {"path": r["dest_path"], "target_dir": "assets/images"}
        out.append({**r, "destination": {"path": d["path"], "target_dir": d.get("target_dir", "assets/images"), "name": d.get("name")}})
    return {"items": out}


@router.post("/routes")
def add_route(body: RouteAddBody) -> Dict[str, Any]:
    # Ensure destination exists in DB for UI discoverability
    if not db.get().get_destination(body.dest_path):
        db.get().add_destination(path=body.dest_path, target_dir="")
    rec = db.get().add_route(source_path=body.source_path, dest_path=body.dest_path, priority=body.priority, active=body.active)
    return {"route": rec}


@router.get("/files/{sid}")
def get_file(sid: str) -> FileResponse:
    rec = db.get().get(sid)
    if not rec:
        raise HTTPException(status_code=404, detail="not found")
    path = rec.get("dest_path") or rec.get("source_path")
    if not path:
        raise HTTPException(status_code=404, detail="file not available")
    try:
        return FileResponse(path, filename=path.split("/")[-1])
    except Exception:
        raise HTTPException(status_code=404, detail="file not found on disk")


@router.patch("/routes/{rid}")
def update_route(rid: str, priority: Optional[int] = None, active: Optional[bool] = None) -> Dict[str, Any]:
    ok = db.get().update_route(rid, priority=priority, active=active)
    if not ok:
        raise HTTPException(status_code=404, detail="not found")
    return {"status": "ok"}


@router.delete("/routes/{rid}")
def delete_route(rid: str) -> Dict[str, Any]:
    ok = db.get().delete_route(rid)
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
