# feat: Persist Sources + Routed Split View + Reordering

## Summary
Implements Task 1 (persist sources to config.toml) and Task 2 (Collections/Routed split view with detail pane), plus basic route reordering controls. Improves test determinism by hydrating sources during app init (no watcher side‑effects in tests).

## Changes
- config/api
  - Persist sources via `save_config()` with canonical paths; `create_app()` hydrates registry from config.
  - Add `PATCH /api/settings` (persist `debounce_ms`, `inbox_dir`); `GET /api/settings` includes effective values + restart note.
  - Canonicalization (expanduser + resolve; case‑normalize on Windows), dedupe by canonical path.
  - Atomic config writes (tmp + replace) with a lightweight lock.
- ui
  - Collections → Routed: table + detail pane (Right/Below toggle), Route column, Open Route button.
  - Routes list and Source/Destination route tables: Up/Down controls (PATCH priority) + Enable/Disable/Clone/Remove.
- docs
  - Add AGENTS.md contributor guide.
  - Update docs for `[[sources.items]]` format + precedence and `PATCH /settings`.
- tests
  - New `tests/test_api_sources_persist.py`: persistence across restart, name/icon read, normalization/dup handling, error cases, settings patch.

## Acceptance Criteria Mapping
- Persist Sources:
  - /api/sources POST/DELETE reflect in config.toml. ✔
  - New app init lists configured sources without watchers. ✔
- Collections/Routed split view:
  - Route column and “Open Route” navigates to detail. ✔
  - Detail pane with Right/Below toggle, preview works. ✔
- Route reorder:
  - Up/Down controls patch priority; order reflects in /api/routes. ✔

## Config/Schema Updates
- Global config now prefers `[[sources.items]]` with `path`, `enabled`, `debounce_ms`, optional `name`, `icon`. Legacy `[sources].paths` still read, ignored when `items` present.
- New `PATCH /api/settings` endpoint.

## Screenshots
- Please add screenshots/GIF of:
  - Collections → Routed (Route column + detail pane; both layouts)
  - Route detail with “Routed Items”
  - Source and Destination route tables with Up/Down controls

## How to Test Locally
- Setup: `. .venv/bin/activate && pip install -e .[tests]`
- Run: `shotrouterd` then open http://127.0.0.1:8767
- Tests: `pytest -q` or `pytest -q tests/test_api_sources_persist.py`

## Notes
- Debounce changes apply on restart (callout returned by GET /api/settings).
- Watchers still start in `run_server()` only; tests use `create_app()` for deterministic behavior.

