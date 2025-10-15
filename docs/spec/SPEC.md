# ShotRouter — Product Spec (Updated)

## User Stories

- As a user, I press Print Screen as usual; the screenshot appears in Inbox and is routed with policy checks.
- As a user, I can arm the next screenshot for my current repo via the UI (CLI optional).
- As a compliance lead, I can enforce policies (gate/quarantine) based on analyzer findings before routing.
- As an org admin (optional), I can monitor devices and distribute policies.

## Functional Requirements

- FR1: Watch one or more OS screenshot folders (configurable sources).
- FR2: Detect new files, wait until stable, and claim atomically before moving.
- FR3: Route the next screenshot to an armed repo target_dir; clear arm after routing.
- FR4: If no arm, place the screenshot in an inbox folder or leave in place (configurable).
- FR5: Rename on move using a predictable scheme (see NAMING.md).
- FR6: Record audit metadata (hash, source, dest, timestamps) in SQLite.
- FR7: Provide a local API and a UI‑first SPA to review, approve, or quarantine, then route.
- FR8: Analyzer plugin pipeline to produce findings; policy engine to decide approve/gate/quarantine.
- FR9: CLI verbs (secondary) to arm, list, route, settings.
- FR10: Support Linux (initial), then Windows/macOS.

## Non‑Functional Requirements

- NFR1: Must not block or slow capture; work after file is closed.
- NFR2: Resilient to crashes; safe restarts.
- NFR3: Local‑only by default; no external network calls. Plugins sandboxed.
- NFR4: CPU/memory footprint low; no heavy polling.

## Config

- Global: `~/.config/shotrouter/config.toml`
- Per repo: `<repo>/actcli.toml` (optional `[screenshot]` section)
 - Policy and analyzers configurable (see CONFIG.md)

## CLI (see CLI.md)

- `shotrouter arm <path>` — arm next screenshot for repo at <path>
- `shotrouter list` — list recent screenshots (inbox + routed)
- `shotrouter route <id> <repo>` — move one from inbox to repo
- `shotrouter settings` — print active config

## API (see API.md)

- POST /arm — arm next screenshot
- GET /screenshots — list inbox/routed items
- POST /route — route one/many items
- DELETE /screenshots/{id} — delete item
- GET /settings — current config
- WS /events — new/scan/decision/routed/quarantined
- Compliance endpoints: scans, findings, policies, approve/quarantine, targets, analyzers

## UI (see UI.md)

- Inbox, Findings, Quarantine, Routed, Targets, Settings
- Toasts on route/detect errors; gating banners and approve/quarantine flows

## File System Behavior

- Debounce policy: size unchanged for X ms OR file closed event; configurable per source
- Claim rename: `photo.png` → `photo.png.actcli-claim-<pid>-<ts>` in same dir
- Move: same volume → rename; cross volume → copy+verify+delete
- Name final: `repo-YYYYMMDD_HHMMSS-01.png`

## Edge Cases

- Duplicate names — increment suffix `-02`, `-03`, …
- Locked files — retry with exponential backoff; surface error in UI
- Huge files — hash asynchronously; show progress in UI (optional)
 - Long scans — enforce timeouts; show pending scan state and allow manual override (admin setting)

## Security & Compliance

- Local loopback only; optional token auth
- Audit table write on every state change
- Analyzer sandboxing and policy gates
- Retention rules: inbox purge after N days; warnings on old items

## Telemetry

- Off by default
- Optional local counts: routed, deleted, errors
 - Optional metadata sync to control plane (opt‑in)

## Internationalization

- UI text extracted and localizable (future)

## Out of Scope (v1)

- Cloud sync, OCR, PII redaction (beyond simple analyzers), multi‑user coordination
