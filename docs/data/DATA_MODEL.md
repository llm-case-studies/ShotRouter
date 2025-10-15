# ShotRouter — Data Model (SQLite)

## Tables

### screenshot
- id TEXT PK (e.g., `sr_<uuid8>`)
- source_path TEXT
- dest_path TEXT NULL
- status TEXT CHECK in ('new','claimed','routed','error','deleted')
- size INTEGER
- sha256 TEXT NULL
- created_at TEXT (ISO8601)
- moved_at TEXT NULL
- source_id TEXT NULL (fk→source.id)
- repo_slug TEXT NULL
- notes TEXT NULL

Indexes: created_at DESC, status, (repo_slug, moved_at DESC)

### source
- id TEXT PK
- path TEXT UNIQUE
- enabled INTEGER
- debounce_ms INTEGER

### audit
- id TEXT PK
- screenshot_id TEXT
- action TEXT CHECK in ('detect','claim','move','hash','route','delete','error')
- at TEXT (ISO8601)
- details TEXT (JSON)

### target
- id TEXT PK
- type TEXT CHECK in ('repo','docstore')
- name TEXT
- path TEXT
- active INTEGER

### analyzer
- id TEXT PK
- name TEXT UNIQUE
- version TEXT
- enabled INTEGER

### scan
- id TEXT PK
- screenshot_id TEXT
- started_at TEXT
- completed_at TEXT NULL
- status TEXT CHECK in ('pending','completed','error')

### finding
- id TEXT PK
- scan_id TEXT
- type TEXT  -- e.g., pii.email, ip.source_code
- severity TEXT CHECK in ('low','medium','high')
- details TEXT (JSON)

### policy
- id TEXT PK
- name TEXT
- rules TEXT (JSON)
- active INTEGER

### decision
- id TEXT PK
- screenshot_id TEXT
- policy_id TEXT
- outcome TEXT CHECK in ('approved','gated','quarantined')
- reason TEXT NULL
- decided_at TEXT

### quarantine
- id TEXT PK
- screenshot_id TEXT
- path TEXT
- reason TEXT
- created_at TEXT

### device (optional, control plane)
- id TEXT PK
- hostname TEXT
- enrolled_at TEXT

## State Transitions

`new → claimed → routed → hashed` (hash may occur after routed)

Extended: `claimed → scanned → (approved|gated|quarantined) → routed → hashed`.

Errors produce `status=error` with last good state recorded in audit.
