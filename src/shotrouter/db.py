from __future__ import annotations

import os
import sqlite3
import threading
import time
import uuid
from dataclasses import dataclass
from typing import Any, Dict, List, Optional


@dataclass
class Database:
    path: str
    conn: sqlite3.Connection
    lock: threading.Lock

    def _exec(self, sql: str, params: tuple = ()) -> sqlite3.Cursor:
        with self.lock:
            cur = self.conn.execute(sql, params)
            self.conn.commit()
            return cur

    def _query(self, sql: str, params: tuple = ()) -> List[sqlite3.Row]:
        with self.lock:
            cur = self.conn.execute(sql, params)
            return cur.fetchall()

    def create_schema(self) -> None:
        self._exec(
            """
            CREATE TABLE IF NOT EXISTS screenshot (
                id TEXT PRIMARY KEY,
                source_path TEXT NOT NULL,
                dest_path TEXT,
                status TEXT NOT NULL,
                size INTEGER NOT NULL,
                sha256 TEXT,
                created_at REAL NOT NULL,
                moved_at REAL,
                repo_slug TEXT,
                notes TEXT
            );
            """
        )
        self._exec("CREATE INDEX IF NOT EXISTS idx_screenshot_status ON screenshot(status);")
        self._exec("CREATE INDEX IF NOT EXISTS idx_screenshot_created ON screenshot(created_at DESC);")

        # Destinations (targets)
        self._exec(
            """
            CREATE TABLE IF NOT EXISTS destination (
                id TEXT PRIMARY KEY,
                path TEXT UNIQUE NOT NULL,
                target_dir TEXT DEFAULT 'assets/images',
                name TEXT,
                icon TEXT,
                name_format TEXT,
                created_at REAL
            );
            """
        )
        # Routes (source path -> destination path)
        self._exec(
            """
            CREATE TABLE IF NOT EXISTS route (
                id TEXT PRIMARY KEY,
                source_path TEXT NOT NULL,
                dest_path TEXT NOT NULL,
                priority INTEGER NOT NULL,
                active INTEGER NOT NULL DEFAULT 1,
                created_at REAL
            );
            """
        )
        self._exec("CREATE INDEX IF NOT EXISTS idx_route_source ON route(source_path, priority);")

    def add_screenshot(self, source_path: str, size: int) -> Dict[str, Any]:
        sid = f"sr_{uuid.uuid4().hex[:8]}"
        now = time.time()
        self._exec(
            "INSERT INTO screenshot (id, source_path, status, size, created_at) VALUES (?, ?, 'inbox', ?, ?)",
            (sid, source_path, size, now),
        )
        return {"id": sid, "status": "inbox", "source_path": source_path, "size": size, "created_at": now}

    def list_screenshots(self, status: Optional[str], limit: int, offset: int) -> List[Dict[str, Any]]:
        if status:
            rows = self._query(
                "SELECT id, status, source_path, dest_path, size, created_at, moved_at FROM screenshot WHERE status = ? ORDER BY created_at DESC LIMIT ? OFFSET ?",
                (status, limit, offset),
            )
        else:
            rows = self._query(
                "SELECT id, status, source_path, dest_path, size, created_at, moved_at FROM screenshot ORDER BY created_at DESC LIMIT ? OFFSET ?",
                (limit, offset),
            )
        return [dict(row) for row in rows]

    def get(self, sid: str) -> Optional[Dict[str, Any]]:
        rows = self._query(
            "SELECT id, status, source_path, dest_path, size, created_at FROM screenshot WHERE id = ?",
            (sid,),
        )
        return dict(rows[0]) if rows else None

    def route(self, sid: str, dest_path: str) -> bool:
        now = time.time()
        cur = self._exec(
            "UPDATE screenshot SET status='routed', dest_path=?, moved_at=? WHERE id=?",
            (dest_path, now, sid),
        )
        return cur.rowcount > 0

    def quarantine(self, sid: str) -> bool:
        cur = self._exec("UPDATE screenshot SET status='quarantined' WHERE id=?", (sid,))
        return cur.rowcount > 0

    def delete(self, sid: str) -> bool:
        cur = self._exec("DELETE FROM screenshot WHERE id=?", (sid,))
        return cur.rowcount > 0

    # Destinations
    def add_destination(self, path: str, target_dir: str = "assets/images", name: Optional[str] = None, icon: Optional[str] = None, name_format: Optional[str] = None) -> Dict[str, Any]:
        did = f"dst_{uuid.uuid4().hex[:8]}"
        now = time.time()
        self._exec(
            "INSERT OR IGNORE INTO destination (id, path, target_dir, name, icon, name_format, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (did, path, target_dir, name, icon, name_format, now),
        )
        row = self._query("SELECT id, path, target_dir, name, icon, name_format FROM destination WHERE path=?", (path,))
        return dict(row[0]) if row else {"id": did, "path": path, "target_dir": target_dir, "name": name, "icon": icon, "name_format": name_format}

    def list_destinations(self) -> List[Dict[str, Any]]:
        rows = self._query("SELECT id, path, target_dir, name, icon, name_format FROM destination ORDER BY created_at DESC")
        return [dict(r) for r in rows]

    def delete_destination(self, path: str) -> bool:
        cur = self._exec("DELETE FROM destination WHERE path=?", (path,))
        return cur.rowcount > 0

    def get_destination(self, path: str) -> Optional[Dict[str, Any]]:
        rows = self._query("SELECT id, path, target_dir, name, icon, name_format FROM destination WHERE path=?", (path,))
        return dict(rows[0]) if rows else None

    # Routes
    def add_route(self, source_path: str, dest_path: str, priority: int = 1, active: bool = True) -> Dict[str, Any]:
        rid = f"rt_{uuid.uuid4().hex[:8]}"
        now = time.time()
        self._exec(
            "INSERT INTO route (id, source_path, dest_path, priority, active, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (rid, source_path, dest_path, priority, 1 if active else 0, now),
        )
        return {"id": rid, "source_path": source_path, "dest_path": dest_path, "priority": priority, "active": active}

    def list_routes(self, source_path: Optional[str] = None) -> List[Dict[str, Any]]:
        if source_path:
            rows = self._query("SELECT id, source_path, dest_path, priority, active FROM route WHERE source_path=? ORDER BY priority ASC, created_at ASC", (source_path,))
        else:
            rows = self._query("SELECT id, source_path, dest_path, priority, active FROM route ORDER BY source_path, priority ASC")
        return [dict(r) for r in rows]

    def update_route(self, rid: str, priority: Optional[int] = None, active: Optional[bool] = None) -> bool:
        updates = []
        params = []
        if priority is not None:
            updates.append("priority = ?")
            params.append(priority)
        if active is not None:
            updates.append("active = ?")
            params.append(1 if active else 0)
        if not updates:
            return False
        params.append(rid)
        sql = f"UPDATE route SET {', '.join(updates)} WHERE id = ?"
        cur = self._exec(sql, tuple(params))
        return cur.rowcount > 0

    def get_route(self, rid: str) -> Optional[Dict[str, Any]]:
        rows = self._query("SELECT id, source_path, dest_path, priority, active FROM route WHERE id=?", (rid,))
        return dict(rows[0]) if rows else None

    def list_screenshots_for_route(self, source_prefix: str, dest_prefix: str, limit: int = 200, offset: int = 0) -> List[Dict[str, Any]]:
        rows = self._query(
            """
            SELECT id, status, source_path, dest_path, size, created_at, moved_at
            FROM screenshot
            WHERE status='routed' AND source_path LIKE ? AND dest_path LIKE ?
            ORDER BY COALESCE(moved_at, created_at) DESC
            LIMIT ? OFFSET ?
            """,
            (f"{source_prefix}%", f"{dest_prefix}%", limit, offset),
        )
        return [dict(r) for r in rows]

    def delete_route(self, rid: str) -> bool:
        cur = self._exec("DELETE FROM route WHERE id=?", (rid,))
        return cur.rowcount > 0


_db: Optional[Database] = None


def _connect(path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    with conn:
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA synchronous=NORMAL;")
        conn.execute("PRAGMA foreign_keys=ON;")
    return conn


def init(db_path: Optional[str] = None) -> Database:
    global _db
    if _db is not None:
        return _db
    path = db_path or os.environ.get("SHOTROUTER_DB") or ":memory:"
    if path != ":memory:" and path.startswith("~"):
        path = os.path.expanduser(path)
    conn = _connect(path)
    _db = Database(path=path, conn=conn, lock=threading.Lock())
    _db.create_schema()
    return _db


def get() -> Database:
    if _db is None:
        return init(None)
    return _db
