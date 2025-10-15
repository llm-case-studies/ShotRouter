# Repository Guidelines

## Project Structure & Module Organization
- This repository is a design package (no code). Core docs live at the root:
  - `ARCHITECTURE.md`, `SPEC.md`, `API.md`, `DATA_MODEL.md`, `TESTING.md`, `SECURITY.md`.
  - UX and ops: `UI.md`, `OPERATIONS.md`, `INTEGRATIONS.md`, `ROADMAP.md`.
  - Conventions: `NAMING.md`, `CONFIG.md`.
- Target runtime (when implemented elsewhere): Python daemon + FastAPI API, SQLite storage, CLI and optional UI. Screenshots route into `assets/images/` inside the armed repo.

## Build, Test, and Development Commands
- This repo has no build. Use any Markdown preview/lint locally.
- If implementing ShotRouter from these specs (example commands):
  - Run API: `uvicorn shotrouter.api:app --reload` (FastAPI local dev).
  - Tests: `pytest -q` (unit/integration per `TESTING.md`).
  - Lint/format: `ruff check . && ruff format .` (or `black .`).

## Coding Style & Naming Conventions
- Code style (for implementations): Python 3.11+, 4‑space indentation, type hints required; keep public APIs documented in docstrings matching `API.md`.
- Filenames routed per `NAMING.md` (e.g., `actcli-YYYYMMDD_HHMMSS-01.png`) and stored under `assets/images/` (optionally date subfolders).
- Keep config TOML keys and JSON fields snake_case; HTTP paths kebab-case only if explicitly specified in `API.md`.

## Testing Guidelines
- Follow `TESTING.md`: unit tests for naming, debounce, claim; integration tests for watcher/router; API tests for REST/WS ordering.
- Aim for coverage on critical paths (claim → move → rename → audit). Name tests `test_<area>_<behavior>.py`.
- Provide fixtures for source/inbox and repo destinations; verify final relpaths and hashes.

## Commit & Pull Request Guidelines
- Prefer Conventional Commits (feat, fix, refactor, docs, test, chore). Scope examples: `router`, `watcher`, `api`, `cli`, `naming`, `docs`.
- PRs must: link issues/roadmap items, summarize changes vs. spec, note config or schema updates, and include screenshots/logs for UX/ops changes.
- If a spec change is needed, update the relevant doc in the same PR and call it out in the description.

## Security & Configuration Tips
- Keep local API bound to `127.0.0.1` by default; token‑protect non‑local clients (see `SECURITY.md`).
- Never upload screenshots externally by default; audit all moves in SQLite as specified.
