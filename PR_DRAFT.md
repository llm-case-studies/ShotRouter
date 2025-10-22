# feat: Persist Sources + Routed Split View + Reordering + Daemon Setup

## Summary
Implements Task 1 (persist sources to config.toml) and Task 2 (Collections/Routed split view with detail pane), plus basic route reordering controls. Adds production-ready daemon/service installation scripts for Linux. Improves test determinism by hydrating sources during app init (no watcher side‑effects in tests).

## Changes
- **config/api**
  - Persist sources via `save_config()` with canonical paths; `create_app()` hydrates registry from config.
  - Add `PATCH /api/settings` (persist `debounce_ms`, `inbox_dir`); `GET /api/settings` includes effective values + restart note.
  - Canonicalization (expanduser + resolve; case‑normalize on Windows), dedupe by canonical path.
  - Atomic config writes (tmp + replace) with a lightweight lock.
- **ui**
  - Collections → Routed: table + detail pane (Right/Below toggle), Route column, Open Route button.
  - Routes list and Source/Destination route tables: Up/Down controls (PATCH priority) + Enable/Disable/Clone/Remove.
- **daemon/service setup**
  - Add `install-service.sh` for systemd user service (auto-restart, logging via journalctl).
  - Add `install-autostart.sh` for desktop autostart entry (cross-DE compatible).
  - Add `uninstall-service.sh` for clean removal.
  - Add `docs/setup/DAEMON_SETUP.md` with complete setup guide.
  - Update README.md with Quick Start section.
- **docs**
  - Add AGENTS.md contributor guide.
  - Update docs for `[[sources.items]]` format + precedence and `PATCH /settings`.
- **tests**
  - New `tests/test_api_sources_persist.py`: persistence across restart, name/icon read, normalization/dup handling, error cases, settings patch.
  - Fix test isolation: use `tmp_path` fixtures, reset app state between tests.
  - Fix `db.get_route()` to include `name` field.
  - All 21 tests passing.

## Acceptance Criteria Mapping
- **Persist Sources:**
  - /api/sources POST/DELETE reflect in config.toml. ✔
  - New app init lists configured sources without watchers. ✔
- **Collections/Routed split view:**
  - Route column and "Open Route" navigates to detail. ✔
  - Detail pane with Right/Below toggle, preview works. ✔
- **Route reorder:**
  - Up/Down controls patch priority; order reflects in /api/routes. ✔
- **Daemon Setup (New):**
  - systemd user service installation script works. ✔
  - Desktop autostart installation script works. ✔
  - Documentation covers all setup methods. ✔

## Config/Schema Updates
- Global config now prefers `[[sources.items]]` with `path`, `enabled`, `debounce_ms`, optional `name`, `icon`. Legacy `[sources].paths` still read, ignored when `items` present.
- New `PATCH /api/settings` endpoint.
- Database: `db.get_route()` now returns `name` field.

## Screenshots / Demo
To test the new features:
1. **UI Features:**
   - Collections → Routed view with Route column
   - Detail pane (Right/Below toggle)
   - Route detail with "Routed Items"
   - Source and Destination route tables with Up/Down controls

2. **Daemon Setup:**
   ```bash
   # Test systemd service
   ./install-service.sh
   systemctl --user status shotrouter
   journalctl --user -u shotrouter -f

   # Test desktop autostart
   ./install-autostart.sh
   ls -la ~/.config/autostart/shotrouter.desktop
   ```

## How to Test Locally
```bash
# Setup
. .venv/bin/activate && pip install -e .[tests]

# Run tests
pytest -q  # All 21 tests should pass

# Test daemon manually
shotrouterd  # Then open http://127.0.0.1:8767

# Test systemd service
./install-service.sh
systemctl --user status shotrouter
journalctl --user -u shotrouter -f

# Test desktop autostart
./install-autostart.sh
cat ~/.config/autostart/shotrouter.desktop
```

## Notes
- Debounce changes apply on restart (callout returned by GET /api/settings).
- Watchers still start in `run_server()` only; tests use `create_app()` for deterministic behavior.
- Daemon setup scripts are Linux-specific (systemd); future PRs will add macOS (launchd) and Windows (Task Scheduler) support.
- Installation scripts use the project's `.venv` path; relocating the project requires reinstalling the service.

