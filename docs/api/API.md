# ShotRouter — Local API

Base URL: `http://127.0.0.1:8767`

## Authentication

- Localhost only by default. Optional bearer token.
- `Authorization: Bearer <token>` when enabled.

## WebSocket

- `GET /ws` — real‑time events
  - `screenshot.new` `{id, source_path, size}`
  - `scan.started` `{id}`
  - `scan.completed` `{id, findings, decision}`
  - `decision.updated` `{id, decision}`
  - `screenshot.routed` `{id, dest_path}`
  - `screenshot.quarantined` `{id, quarantine_path}`
  - `screenshot.error` `{id, message}`

## Endpoints

### Arm next screenshot

`POST /arm`

Body:
```json
{ "repo_path": "/home/alex/Projects/ActCLI", "target_dir": "assets/images" }
```

Response `200`:
```json
{ "status": "armed", "expires_at": "2025-01-13T12:30:00Z" }
```

### List screenshots

`GET /screenshots?status=inbox|routed|error&limit=50&offset=0`

Response:
```json
{ "items": [ {"id":"sr_abc123","status":"inbox","source_path":"/home/alex/Pictures/Screenshots/...png","created_at":"...","size": 12345} ] }
```

### Route screenshot(s)

`POST /route`

Body (one or many):
```json
{ "ids": ["sr_abc123"], "repo_path": "/home/alex/Projects/ActCLI", "target_dir": "assets/images" }
```

Response `200`:
```json
{ "routed": [ {"id":"sr_abc123","dest_path":"/home/alex/Projects/ActCLI/assets/images/actcli-...png"} ] }
```

### Delete screenshot record/file

`DELETE /screenshots/{id}` → removes DB record; optional `?with_file=true` to delete file on disk when safe.

### Settings

`GET /settings` → effective configuration

`POST /settings` → update global settings (sources, debounce, inbox)

## Compliance & Fleet Extensions

### Scans & Findings
- `GET /scans?status=pending|completed&limit&offset`
- `GET /findings?screenshot_id=...` → list findings

### Policies & Decisions
- `GET /policies` → effective policy
- `POST /policies` → update local policy rules
- `POST /approve` `{id, reason}` → approve a gated item
- `POST /quarantine` `{id, reason}` → force quarantine

### Targets & Analyzers
- `GET /targets` / `POST /targets`
- `GET /analyzers` → available plugins and versions

### Fleet (optional control plane)
- `POST /sync` → opt‑in metadata sync with ShotHub (when configured)

## Errors

- `409` conflict: claim failed (another process routed it)
- `422` validation
- `500` internal (logged with context)
