# Repository Guidelines

## Project Structure & Module Organization
- Runtime code under `src/shotrouter/`: `server.py` (FastAPI app), `api/routes.py`, `watcher.py`, `routing.py`, `db.py`, `config.py`, `cli.py`.
- UI served from `src/shotrouter/ui_static/` (SPA `index.html`, `assets/app.js`, `assets/styles.css`).
- Tests in `tests/` (API, WS, and UI request coverage). Docs live in `docs/`.
- Screenshots routed into repos under `assets/images/` (default). Example: `assets/images/2025-01/actcli-20250115_143210-01.png`.

## Build, Test, and Development Commands
- Install (dev): `python -m venv .venv && . .venv/bin/activate && pip install -e .[tests]`.
- Run daemon (API + UI): `shotrouterd` (env: `SHOTROUTER_API_HOST`, `SHOTROUTER_API_PORT`).
- Alt run: `python -m shotrouter` (uses `server.run_server`).
- Run tests: `pytest -q`.
- Lint/format (optional): `ruff check . && ruff format .` or `black .` if installed.

## Coding Style & Naming Conventions
- Python 3.11+, 4‑space indentation, type hints for public functions. Keep docstrings consistent with `docs`/API behavior.
- File naming for routed images per `NAMING.md`: `actcli-YYYYMMDD_HHMMSS-01.png` under `assets/images/`.
- Config TOML and JSON fields use `snake_case`; HTTP paths kebab‑case only when specified in API.

## Testing Guidelines
- Tests live in `tests/` (e.g., `test_api_basic.py`, `test_api_routes.py`, `test_ws.py`).
- Name tests `test_<area>_<behavior>.py`; keep deterministic and isolated.
- Focus coverage on claim → move → rename → audit; verify final relpaths and hashes.
- Run with `pytest -q`; avoid network or external I/O in tests.

## Commit & Pull Request Guidelines
- Use Conventional Commits: `feat|fix|refactor|docs|test|chore(scope): message`. Scopes: `router`, `watcher`, `api`, `cli`, `naming`, `docs`.
- PRs must link issues/roadmap items, summarize changes vs. spec, and note config/schema updates. Include screenshots/logs for UX/ops changes.
- If spec changes are required, update the relevant doc in the same PR and call it out in the description.

## Security & Configuration Tips
- DB defaults to `~/.local/state/shotrouter/shotrouter.db` (WAL). Override with `SHOTROUTER_DB`.
- Bind API to `127.0.0.1` by default; protect non‑local clients (see `docs/security`).
- Do not upload screenshots externally by default; audit all moves in SQLite.
