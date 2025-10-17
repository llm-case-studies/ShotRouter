from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional
import platform
import time
import tempfile

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
    name: Optional[str] = None
    icon: Optional[str] = None


@dataclass
class AppConfig:
    sources: List[SourceConfig]
    debounce_ms: int = 400
    inbox_dir: Optional[str] = None


def config_path() -> Path:
    p = os.environ.get(CONFIG_ENV)
    return Path(p).expanduser() if p else DEFAULT_CONFIG


def _coerce_bool(v: object, default: bool = True) -> bool:
    if isinstance(v, bool):
        return v
    if isinstance(v, str):
        return v.lower() in ("1", "true", "yes", "on")
    return default


def load_config() -> AppConfig:
    p = config_path()
    if not p.exists() or tomllib is None:
        return AppConfig(sources=[])
    data = tomllib.loads(p.read_text())

    # Global settings
    debounce = int(data.get("debounce_ms", 400))
    inbox_dir = data.get("inbox_dir")

    srcs: List[SourceConfig] = []
    sources_tbl = data.get("sources", {}) or {}

    # Preferred long-term format: [[sources.items]]
    items = sources_tbl.get("items")
    if isinstance(items, list) and items:
        for it in items:
            if not isinstance(it, dict):
                continue
            path = it.get("path")
            if not path:
                continue
            srcs.append(
                SourceConfig(
                    path=str(path),
                    enabled=_coerce_bool(it.get("enabled"), True),
                    debounce_ms=int(it.get("debounce_ms", debounce)),
                    name=it.get("name"),
                    icon=it.get("icon"),
                )
            )
    else:
        # Back-compat minimal format: [sources] paths=[...] and optional debounce_ms
        for path in sources_tbl.get("paths", []):
            srcs.append(SourceConfig(path=str(path), enabled=True, debounce_ms=debounce))

    return AppConfig(sources=srcs, debounce_ms=debounce, inbox_dir=inbox_dir)


def ensure_config_dir() -> None:
    cfg = config_path()
    cfg.parent.mkdir(parents=True, exist_ok=True)


def _toml_quote(s: str) -> str:
    return s.replace("\\", "\\\\").replace("\"", "\\\"")


def save_config(cfg: AppConfig) -> None:
    """Persist configuration in the richer [[sources.items]] format.

    Writes global keys (debounce_ms, inbox_dir) and table array for sources.
    """
    ensure_config_dir()
    lines: List[str] = []
    lines.append(f"debounce_ms = {int(cfg.debounce_ms)}")
    if cfg.inbox_dir:
        lines.append(f"inbox_dir = \"{_toml_quote(cfg.inbox_dir)}\"")
    if cfg.sources:
        # Deduplicate by canonical path
        dedup: dict[str, SourceConfig] = {}
        for s in cfg.sources:
            dedup[_canonicalize_path(s.path)] = s
        for s in dedup.values():
            lines.append("")
            lines.append("[[sources.items]]")
            lines.append(f"path = \"{_toml_quote(s.path)}\"")
            lines.append(f"enabled = {'true' if s.enabled else 'false'}")
            lines.append(f"debounce_ms = {int(s.debounce_ms)}")
            if s.name is not None:
                lines.append(f"name = \"{_toml_quote(s.name)}\"")
            if s.icon is not None:
                lines.append(f"icon = \"{_toml_quote(s.icon)}\"")
    content = "\n".join(lines) + "\n"
    path = config_path()
    # Atomic write with a simple lock
    lock = path.with_suffix(path.suffix + ".lock")
    acquired = False
    for _ in range(100):  # ~1s total wait
        try:
            fd = os.open(str(lock), os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o644)
            os.close(fd)
            acquired = True
            break
        except FileExistsError:
            time.sleep(0.01)
    try:
        tmp = path.with_suffix(path.suffix + ".tmp")
        tmp.write_text(content)
        os.replace(tmp, path)
    finally:
        if acquired and lock.exists():
            try:
                lock.unlink()
            except Exception:
                pass


def _canonicalize_path(p: str) -> str:
    pp = Path(p).expanduser()
    try:
        pp = pp.resolve(strict=False)
    except Exception:
        pass
    s = str(pp)
    if platform.system() == "Windows":
        return s.lower()
    return s


def canonicalize_path(p: str) -> str:
    """Public helper to normalize paths for config/registry/DB comparisons."""
    return _canonicalize_path(p)


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
