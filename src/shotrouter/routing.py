from __future__ import annotations

import os
import shutil
import time
from typing import Optional

from . import db
from .events import broadcast


def _original_ext(source_path: str) -> str:
    name = os.path.basename(source_path)
    # Handle claim suffix e.g., file.png.sr-claim-...
    if '.sr-claim-' in name:
        before = name.split('.sr-claim-')[0]
        _, ext = os.path.splitext(before)
        return ext or '.png'
    _, ext = os.path.splitext(name)
    return ext or '.png'


def _ensure_dir(path: str) -> None:
    os.makedirs(path, exist_ok=True)


def route_to(sid: str, dest_root: str, target_dir: Optional[str] = None) -> Optional[str]:
    """Move screenshot file for sid to dest_root[/target_dir]/<sid>.<ext>.
    Returns final path or None on failure.
    """
    rec = db.get().get(sid)
    if not rec:
        return None
    src = rec["source_path"]
    ext = _original_ext(src)
    root = dest_root.rstrip("/")
    sub = (target_dir or "").strip("/")
    dest_dir = os.path.join(root, sub) if sub else root
    _ensure_dir(dest_dir)
    final = os.path.join(dest_dir, f"{sid}{ext}")
    try:
        shutil.move(src, final)
    except Exception:
        return None
    # Update DB and broadcast
    if db.get().route(sid, final):
        broadcast("screenshot.routed", {"id": sid, "dest_path": final})
    return final


def route_via_route_record(sid: str, source_dir: str) -> Optional[str]:
    """Route using first active route for source_dir if any.
    Returns final path or None if no route applied.
    """
    routes = db.get().list_routes(source_path=source_dir)
    if not routes:
        return None
    r0 = routes[0]
    dst = db.get().get_destination(r0["dest_path"]) or {"path": r0["dest_path"], "target_dir": ""}
    return route_to(sid, dest_root=dst["path"], target_dir=dst.get("target_dir") or "")
