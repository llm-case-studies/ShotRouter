from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional
import time
import uuid


@dataclass
class Screenshot:
    id: str
    status: str  # 'inbox'|'routed'|'error'|'quarantined'|'gated'
    source_path: str
    size: int
    created_at: float
    dest_path: Optional[str] = None
    repo_slug: Optional[str] = None


@dataclass
class AppState:
    screenshots: Dict[str, Screenshot] = field(default_factory=dict)
    armed_repo_path: Optional[str] = None
    armed_target_dir: str = "assets/images"
    ui_static_dir: str = str(Path(__file__).parent / "ui_static")
    subscribers: List = field(default_factory=list)  # websockets

    def new_screenshot(self, source_path: str, size: int) -> Screenshot:
        sid = f"sr_{uuid.uuid4().hex[:8]}"
        sc = Screenshot(id=sid, status="inbox", source_path=source_path, size=size, created_at=time.time())
        self.screenshots[sid] = sc
        return sc

    def list_screenshots(self, status: Optional[str] = None, limit: int = 50, offset: int = 0) -> List[Screenshot]:
        items = list(self.screenshots.values())
        if status:
            items = [i for i in items if i.status == status]
        items.sort(key=lambda s: s.created_at, reverse=True)
        return items[offset: offset + limit]


_app_state: Optional[AppState] = None


def get_app_state() -> AppState:
    global _app_state
    if _app_state is None:
        _app_state = AppState()
    return _app_state

