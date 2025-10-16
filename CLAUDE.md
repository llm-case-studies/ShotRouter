# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ShotRouter is a system-wide screenshot router that watches OS screenshot folders and routes new screenshots into the right repo or doc store with predictable naming and full audit trails. The project is UI-first (local SPA on 127.0.0.1) with an optional CLI for developers.

## Development Commands

### Running the server
```bash
# Run the daemon/API server (default: http://127.0.0.1:8767)
shotrouterd

# Or with custom host/port
shotrouterd --host 127.0.0.1 --port 8767

# For development with auto-reload
uvicorn shotrouter.server:create_app --factory --reload --host 127.0.0.1 --port 8767
```

### Using the CLI
```bash
# Arm next screenshot for a repo
shotrouter arm /path/to/repo --target_dir assets/images

# List recent screenshots
shotrouter list
```

### Running tests
```bash
# Install test dependencies
pip install -e ".[tests]"

# Run all tests
pytest

# Run specific test file
pytest tests/test_api_basic.py

# Run with verbose output
pytest -v

# Run quietly (summary only)
pytest -q
```

### Installation
```bash
# Install in development mode
pip install -e .

# Install with test dependencies
pip install -e ".[tests]"
```

## Architecture & Key Concepts

### Core Components

1. **WatchManager** (`src/shotrouter/watcher.py`)
   - Uses `watchfiles` library for cross-platform file watching
   - Watches configured source directories for new screenshots
   - Implements debounce logic (default 400ms) to wait for file stability
   - Claims files atomically using rename: `file.png` → `file.png.sr-claim-{pid}-{ts}`
   - Broadcasts `screenshot.new` events via WebSocket

2. **Database** (`src/shotrouter/db.py`)
   - SQLite with WAL mode for concurrency
   - Schema: screenshot table tracks id, source_path, dest_path, status, size, sha256, timestamps
   - Status transitions: inbox → routed/quarantined
   - Default: durable DB at `~/.local/state/shotrouter/shotrouter.db` for server, in-memory for tests
   - Environment variable `SHOTROUTER_DB` overrides default

3. **API Service** (`src/shotrouter/api/routes.py`, `src/shotrouter/server.py`)
   - FastAPI application with REST endpoints and WebSocket support
   - API docs at `/api/docs` (Swagger) and `/api/redoc` (ReDoc)
   - Core endpoints: `/api/arm`, `/api/screenshots`, `/api/route`, `/api/settings`
   - Sources API: `/api/sources` (add/remove/list watched directories)
   - Compliance endpoints (stubs): `/api/scans`, `/api/findings`, `/api/approve`, `/api/quarantine`
   - Status endpoint: `/api/status` shows active watchers

4. **Event System** (`src/shotrouter/events.py`, `src/shotrouter/api/ws.py`)
   - WebSocket at `/ws` for real-time updates
   - Events: `screenshot.new`, `screenshot.routed`, `screenshot.quarantined`, `screenshot.deleted`

### Data Flow

**Arm Next workflow:**
1. Call `POST /api/arm` with target repo path
2. Daemon records armed route (one-shot with expiry)
3. Next new screenshot is claimed and routed to that repo
4. UI/CLI receives WebSocket event with final path

**Watcher workflow:**
1. Watcher detects new file in source directory
2. Wait for file stability (debounce)
3. Atomic claim via rename (best-effort)
4. Add to database with status='inbox'
5. Broadcast `screenshot.new` event

**Routing workflow:**
1. UI/user calls `POST /api/route` with screenshot IDs
2. Database updates status to 'routed' and sets dest_path
3. Broadcast `screenshot.routed` event

### File Organization

```
src/shotrouter/
├── __init__.py
├── __main__.py          # Daemon entrypoint (shotrouterd)
├── cli.py               # CLI entrypoint (shotrouter)
├── server.py            # FastAPI app creation & server startup
├── db.py                # SQLite database interface
├── watcher.py           # WatchManager & file claiming logic
├── events.py            # WebSocket event broadcasting
├── state.py             # Application state singleton
├── config.py            # Configuration loading
├── sources.py           # Source registry
└── api/
    ├── routes.py        # REST endpoints
    └── ws.py            # WebSocket endpoint

tests/
├── test_api_basic.py    # Basic API endpoint tests
├── test_api_more.py     # Additional API tests
└── test_ws.py           # WebSocket tests
```

## Important Patterns

### Database Usage
- Tests use in-memory DB by default (`:memory:`)
- Server uses durable DB at `~/.local/state/shotrouter/shotrouter.db`
- Override with `SHOTROUTER_DB` environment variable
- Always use `db.get()` to access the singleton instance
- Thread-safe with locks around all operations

### Atomic File Claiming
The claim algorithm ensures exactly one process owns a screenshot:
1. Watcher sees file create event
2. Debounce until file size is stable
3. Atomic rename in same directory: `file.png` → `file.png.sr-claim-{pid}-{ts}`
4. If rename succeeds, we own it; else another process claimed it (bail)
5. Move to destination and rename to final name

### Testing
- Use `TestClient` from `fastapi.testclient` for API tests
- Each test gets fresh app instance via `create_app()`
- Use `/api/dev/simulate_new` endpoint to inject screenshots without watcher
- Tests should verify both API responses and database state changes

### WebSocket Events
- Broadcast events after database updates
- Event format: `{"type": "event.name", "data": {...}}`
- Standard events: `screenshot.new`, `screenshot.routed`, `screenshot.quarantined`, `screenshot.deleted`

## Cross-Platform Considerations

Default screenshot source directories:
- Linux: `~/Pictures/Screenshots`
- Windows: `%USERPROFILE%/Pictures/Screenshots`, `%OneDrive%/Pictures/Screenshots`
- macOS: Read from `defaults read com.apple.screencapture location` (fallback: `~/Desktop`)

The `get_default_source_candidates()` function in `config.py` returns platform-appropriate paths.

## Documentation Structure

The `docs/` directory contains comprehensive design documentation:
- `docs/architecture/ARCHITECTURE.md` - Component design and algorithms
- `docs/spec/SPEC.md` - Product requirements
- `docs/api/API.md` - HTTP/WebSocket API contract
- `docs/data/DATA_MODEL.md` - SQLite schema
- `docs/testing/TESTING.md` - Test strategy
- `docs/security/SECURITY.md` - Privacy and compliance
- `docs/ui/UI.md` - UI wireframes
- `docs/config/CONFIG.md` - Configuration format (TOML)
- `docs/cli/CLI.md` - CLI command reference

Refer to these docs when implementing new features or making architectural changes.

## Compliance Pipeline (Planned)

Future versions will include:
1. Analyzer plugins that scan screenshots after claim
2. Policy engine evaluates findings → decision (approved/gated/quarantined)
3. Gated items require manual approval with reason
4. Quarantined items moved to separate store

Current implementation has stub endpoints (`/api/scans`, `/api/findings`, `/api/approve`, `/api/quarantine`) ready for future integration.
