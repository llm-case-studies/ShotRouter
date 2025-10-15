from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional


@dataclass
class AppState:
    armed_repo_path: Optional[str] = None
    armed_target_dir: str = "assets/images"
    ui_static_dir: str = str(Path(__file__).parent / "ui_static")
    subscribers: List = field(default_factory=list)  # websockets



_app_state: Optional[AppState] = None


def get_app_state() -> AppState:
    global _app_state
    if _app_state is None:
        _app_state = AppState()
    return _app_state
