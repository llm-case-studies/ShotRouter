from __future__ import annotations

import logging
import os
import threading
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Optional

from .events import broadcast
from . import db
from .routing import route_via_route_record

log = logging.getLogger("shotrouter.watcher")

try:
    from watchfiles import watch, Change
except Exception:  # pragma: no cover - optional import in tests
    watch = None
    Change = None


def _wait_for_stable(path: Path, debounce_ms: int) -> bool:
    """Wait until file size is stable for debounce_ms. Returns False if file disappears."""
    stable_until = 0.0
    last_size = -1
    deadline = time.time() + 30  # cap wait
    while time.time() < deadline:
        try:
            size = path.stat().st_size
        except FileNotFoundError:
            return False
        if size == last_size:
            if stable_until == 0.0:
                stable_until = time.time() + debounce_ms / 1000.0
            if time.time() >= stable_until:
                return True
        else:
            last_size = size
            stable_until = 0.0
        time.sleep(0.1)
    return False


def _claim_file(path: Path) -> Optional[Path]:
    ts = int(time.time())
    claimed = path.with_name(path.name + f".sr-claim-{os.getpid()}-{ts}")
    try:
        os.rename(path, claimed)
        return claimed
    except Exception:
        return None


@dataclass
class WatcherThread:
    path: Path
    debounce_ms: int
    stop_flag: threading.Event
    thread: Optional[threading.Thread] = None

    def start(self) -> None:
        if watch is None:
            log.warning("watchfiles not available; watcher disabled for %s", self.path)
            return
        self.thread = threading.Thread(target=self._run, name=f"sr-watch:{self.path}", daemon=True)
        self.thread.start()

    def _run(self) -> None:
        try:
            for changes in watch(str(self.path), recursive=False, stop_event=self.stop_flag):
                for change, p in changes:
                    if Change is not None and change not in (Change.added,):
                        continue
                    f = Path(p)
                    if f.name.startswith('.') or f.suffix.lower() not in ('.png', '.jpg', '.jpeg', '.webp'):
                        continue
                    if not _wait_for_stable(f, self.debounce_ms):
                        continue
                    # Attempt claim (best-effort)
                    claimed = _claim_file(f) or f
                    rec = db.get().add_screenshot(str(claimed), claimed.stat().st_size)
                    broadcast("screenshot.new", {"id": rec["id"], "source_path": rec["source_path"], "size": rec["size"]})
                    # Auto-route if a route is configured for this source directory
                    try:
                        final = route_via_route_record(rec["id"], source_dir=str(self.path))
                        # route_via_route_record broadcasts routed event on success
                        if final:
                            pass
                    except Exception:
                        log.exception("Auto-route failed for %s", rec["id"])  # pragma: no cover
        except Exception as e:  # pragma: no cover - background thread
            log.exception("Watcher error on %s: %s", self.path, e)

    def stop(self) -> None:
        self.stop_flag.set()
        if self.thread and self.thread.is_alive():
            self.thread.join(timeout=1.0)


class WatchManager:
    def __init__(self) -> None:
        self._watchers: Dict[str, WatcherThread] = {}

    def start_for(self, path: Path, debounce_ms: int = 400) -> None:
        key = str(path)
        if key in self._watchers:
            return
        wt = WatcherThread(path=path, debounce_ms=debounce_ms, stop_flag=threading.Event())
        self._watchers[key] = wt
        wt.start()

    def stop_for(self, path: Path) -> None:
        key = str(path)
        wt = self._watchers.pop(key, None)
        if wt:
            wt.stop()

    def stop_all(self) -> None:
        for wt in list(self._watchers.values()):
            wt.stop()
        self._watchers.clear()

    def list_active(self):
        items = []
        for key, wt in self._watchers.items():
            items.append({
                "path": key,
                "debounce_ms": wt.debounce_ms,
                "running": bool(wt.thread and wt.thread.is_alive()),
            })
        return items


manager = WatchManager()
