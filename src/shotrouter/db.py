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
                "SELECT id, status, source_path, dest_path, size, created_at FROM screenshot WHERE status = ? ORDER BY created_at DESC LIMIT ? OFFSET ?",
                (status, limit, offset),
            )
        else:
            rows = self._query(
                "SELECT id, status, source_path, dest_path, size, created_at FROM screenshot ORDER BY created_at DESC LIMIT ? OFFSET ?",
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

