from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional

try:
    import tomllib  # Python 3.11+
except ModuleNotFoundError:  # pragma: no cover
    tomllib = None


CONFIG_ENV = "SHOTROUTER_CONFIG"
DEFAULT_CONFIG = Path.home() / ".config" / "shotrouter" / "config.toml"


@dataclass
class SourceConfig:
    path: str
    enabled: bool = True
    debounce_ms: int = 400


@dataclass
class AppConfig:
    sources: List[SourceConfig]
    debounce_ms: int = 400
    inbox_dir: Optional[str] = None


def config_path() -> Path:
    p = os.environ.get(CONFIG_ENV)
    return Path(p).expanduser() if p else DEFAULT_CONFIG


def load_config() -> AppConfig:
    p = config_path()
    if not p.exists() or tomllib is None:
        return AppConfig(sources=[])
    data = tomllib.loads(p.read_text())
    srcs = []
    for path in data.get("sources", {}).get("paths", []):
        srcs.append(SourceConfig(path=path, enabled=True, debounce_ms=data.get("debounce_ms", 400)))
    return AppConfig(sources=srcs, debounce_ms=data.get("debounce_ms", 400), inbox_dir=data.get("inbox_dir"))


def ensure_config_dir() -> None:
    cfg = config_path()
    cfg.parent.mkdir(parents=True, exist_ok=True)


def get_default_source_candidates() -> List[Path]:
    import platform

    paths: List[Path] = []
    system = platform.system()
    home = Path.home()
    if system == "Linux":
        paths += [home / "Pictures" / "Screenshots", home / "Pictures"]
    elif system == "Windows":
        user = os.environ.get("USERPROFILE")
        if user:
            up = Path(user)
            paths += [up / "Pictures" / "Screenshots"]
        one = os.environ.get("OneDrive")
        if one:
            op = Path(one)
            paths += [op / "Pictures" / "Screenshots"]
    elif system == "Darwin":
        paths += [home / "Desktop", home / "Pictures"]
    # Filter to existing directories only
    return [p for p in paths if p.exists() and p.is_dir()]

