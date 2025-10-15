# ShotRouter — Architecture (UI‑first, Compliance‑ready)

## Overview

```
+--------------------+        FS events        +------------------+
|  OS Screenshot(s)  |  ───────────────────→  |  ShotRouter Daem |
|  (GNOME/Win/macOS) |                        |  (single instance)|
+--------------------+                        +------------------+
            |                                        |
            | move/rename + audit                    | REST/WS (UI‑first)
            v                                        v
      Repo/doc target dir                    SPA UI  |  (CLI later)
    (e.g., assets/images)
```

- Single daemon (ShotManager per machine) watches one or more sources and routes screenshots to multiple targets (repos/doc stores). Audit trail in SQLite.
- API (FastAPI) + WebSocket powers the local SPA. CLI is secondary (developer convenience).

### What changed
- UI‑first workflow (Inbox → Scan → Decision → Route).
- Compliance pipeline with pluggable analyzers before routing; policy engine gates actions.
- Optional fleet monitoring via a control plane (“ShotHub”) for corporate settings.

## Components

- Watcher: platform file events (watchdog)
  - Linux: inotify
  - macOS: FSEvents
  - Windows: ReadDirectoryChangesW
- Router:
  - Debounce until file is stable
  - Atomic claim (rename in place)
  - Scan pipeline (analyzers) → policy decision (approve/gate/quarantine)
  - Move/rename to destination; compute hashes; audit everything
- Storage:
  - SQLite DB for metadata/audit
  - Optional thumb cache (~/.cache/shotrouter/thumbs)
- API Service:
  - FastAPI REST + WebSocket
  - Core endpoints: /arm, /screenshots, /route, /delete, /settings
  - Compliance endpoints: /scans, /findings, /policies, /approve, /quarantine, /targets, /analyzers
- UI:
  - Inbox (new/unrouted), Routed, By Source, By Repo
  - Quick actions; toast on events

## Atomic Claim Algorithm

Goal: ensure exactly one process owns a new screenshot before moving it.

1) Watcher sees file create (path `p`).
2) Debounce: wait for stable size or “close” event.
3) Attempt atomic rename in place:
   - from `p` → `p + .actcli-claim-<pid>-<ts>` in same directory.
   - If rename succeeds, we own it; else another process moved it (bail).
4) Move claimed file to destination (may be cross-volume → copy+verify+delete).
5) Rename to final name (see naming rules) and write audit.

Notes:
- On systems where rename across volumes isn’t atomic, we only rename in place for claim; subsequent move uses copy+verify+delete.
- If the OS opens a temporary file then renames to final name (common), our debounce waits until the last rename.

## Single Instance Lock

- PID file + OS mutex (platform dependent) to ensure only one daemon runs.
- API refuses to start if lock held.

## Data Flow (Arm Next)

1) Repo tool calls `POST /arm` with a target repo path (and target_dir/name_format if needed).
2) Daemon records an “armed” route with expiry (one-shot).
3) Next new screenshot is claimed and routed to that repo; route cleared.
4) UI/CLI receives WS event with final path.

## Data Flow (Sticky Route)

1) UI/CLI sets `POST /routes` with `type=sticky`, target repo, optional TTL.
2) Daemon routes all new screenshots to that target until route removed or TTL expires.
3) Inbox remains for unmatched or rule-ignored items.

## Cross-Platform Sources

- Linux (initial): `~/Pictures/Screenshots` by default (configurable); add more via config.
- Windows: `%USERPROFILE%/Pictures/Screenshots` and `%OneDrive%/Pictures/Screenshots`.
- macOS: read `defaults read com.apple.screencapture location` to get location (fallback to `~/Desktop`).

## Error Handling

- If claim fails → ignore (another process moved it) and log at debug.
- If move fails (locked, permission) → retry with backoff; on final failure, keep in inbox and mark error.
- If hash mismatch after copy+verify → retry copy; alert in UI if unrecoverable.

## Performance

- Debounce: default 400ms; configurable per source
- Moves rename in same filesystem when possible; else copy with stream chunks and fsync
- Hashing: delayed, offloaded to thread pool; not on hot path for UI updates

## Reliability & Crash Safety

- All operations recorded with state transitions (new → claimed → moved → hashed)
- On restart, scan for `.actcli-claim*` orphan files and recover/continue
- SQLite WAL mode; periodic vacuum

## Security & Privacy

- Local loopback API only by default; token for non‑local clients (optional)
- No external uploads unless configured; analyzer plugins run sandboxed and offline by default
- Access control for UI/CLI; explicit user approval flows for gated items

## Compliance Pipeline

1) After claim, the daemon runs registered Analyzer plugins on the file.
2) Aggregated Findings are evaluated by the Policy Engine.
3) Decision outcomes:
   - approved → proceed to route
   - gated → require manual approve with reason
   - quarantined → move to quarantine store; notify

Plugin interface (concept): `analyze(file_path, metadata) -> { findings:[{type, severity, span|bbox?}], version }`.
Plugins are discovered via Python entry points `shotrouter.plugins` and execute with timeouts, resource limits, and no network by default.

## Control Plane (ShotHub, optional)

- Distribute org/division policies; enroll devices; aggregate anonymized metrics/audits.
- Privacy first: by default only metadata/hashes and findings summaries sync; original images never leave the device.

## Packaging

- Python package with entrypoints:
  - `shotrouterd` (daemon/API)
  - `shotrouter` (CLI)
- System services:
  - Linux: systemd user service (e.g., `~/.config/systemd/user/shotrouterd.service`)
  - Windows: NSSM/Win service wrapper; or tray app
  - macOS: LaunchAgent plist
