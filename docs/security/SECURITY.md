# ShotRouter — Security & Privacy

- Local‑only by default: API binds 127.0.0.1; no outbound network.
- Optional API token for non‑local clients (e.g., remote VSCode).
- No background uploads; files stay on disk where you put them.
- Audit trail captures:
  - original path, final path
  - size & SHA‑256
  - timestamps for detection, claim, move, hash
- Crash safety: orphaned claim files recovered on restart.
- Deletion is explicit; if `--with-file` is used, file is removed and audit notes it.
- Retention policies: inbox purge after N days (configurable), alerts for stale items.

Threats mitigated:
- Race conditions → atomic claim rename before move
- Multi‑instance risk → PID + OS mutex
- Cross‑volume copies → verify size; optional hash verify before delete

## Analyzer Plugins & Sandboxing

- Analyzers run with timeouts, memory limits, and no network by default.
- Discoverable via Python entry points; configured allow‑list.
- Redaction/transformers must write to temp paths and declare outputs.
- Logs and findings are stored locally; sensitive strings may be hashed or truncated.

## Control Plane (Optional)

- When enabled, devices enroll with ShotHub via TLS and device tokens.
- Sync scope is metadata (hashes, counts, anonymized findings) — screenshots never leave the device unless an explicit export is performed.
- Policies can be pulled down and cached locally; routing continues offline.
