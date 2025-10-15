# ShotRouter — Roadmap (Updated)

## Phase 0 — Repo bootstrap (this package)
- Docs only; confirm concepts and UX

## Phase 1 — UI‑First MVP (Linux)
- Watchdog on `~/Pictures/Screenshots`; debounce + atomic claim
- Local SPA: Inbox, Routed, Targets, Settings
- Arm next; basic policy stub always approve
- SQLite metadata; WS events; notifications

## Phase 2 — Compliance Pipeline
- Analyzer plugin SDK (local LLM adapters, regex/heuristics)
- Findings UI; Policy engine (approve/gate/quarantine)
- Quarantine store; manual approve with reason

## Phase 3 — Windows/macOS
- Watchers and copy+verify+delete semantics
- Installer packaging per OS

## Phase 4 — Control Plane (Optional) & Polish
- ShotHub: device enrollment, policy distribution, metadata sync (opt‑in)
- Retention policies, stale alerts, search/tags
- Advanced routes (rules), VSCode integration, CLI for devs
