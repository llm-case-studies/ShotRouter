# ShotRouter

System‑wide screenshot router that watches OS screenshot folders and routes new screenshots into the right repo or doc store — renamed, audited, and easy to find.

- Native Print Screen flow; no overlays changed.
- UI‑first: local SPA on 127.0.0.1 for Inbox → Approve/Quarantine → Route. CLI is optional for devs.
- Predictable names under `assets/images/`, full audit in SQLite.
- Compliance‑ready: pluggable analyzers (local LLMs, heuristics) and policy gates.
- Cross‑platform plan: Linux, Windows, macOS. Local‑only by default; no uploads.

## Quick Start

```bash
# Install
pip install -e .

# Run manually (test it out)
shotrouterd

# Open web UI
xdg-open http://127.0.0.1:8767

# Install as auto-starting service (systemd)
./install-service.sh

# Or install as desktop autostart entry
./install-autostart.sh
```

See [docs/setup/DAEMON_SETUP.md](docs/setup/DAEMON_SETUP.md) for detailed setup instructions.

## Contents

- docs/overview/WHITEPAPER.md — concept, problems, goals, principles
- docs/architecture/ARCHITECTURE.md — components, algorithms, sequences
- docs/spec/SPEC.md — product requirements and behavior
- docs/config/CONFIG.md — user and repo configuration (TOML)
- docs/api/API.md — local HTTP/WebSocket contract (FastAPI)
- docs/cli/CLI.md — command‑line verbs and UX
- docs/data/DATA_MODEL.md — SQLite schema, indices
- docs/ui/UI.md — UI wireframes and interaction design
- docs/security/SECURITY.md — privacy, trust, compliance
- docs/ops/OPERATIONS.md — run as a service on Linux/Win/macOS
- docs/integrations/INTEGRATIONS.md — VSCode, local LLMs, others
- docs/testing/TESTING.md — test strategy and fixtures
- docs/roadmap/ROADMAP.md — phases and milestones
- docs/todo/TODO.md — concrete task list
- docs/conventions/NAMING.md — filename and directory conventions
 - docs/brand/BRANDING.md — palettes, tokens, theme files (web/Textual)

## TL;DR (How it feels)

- Press Print Screen and capture as usual.
- Item appears in Inbox; analyzers run; you approve or quarantine.
- Approved items route to your target (repo/doc store) under `assets/images` with a clean name.
- Arm next from the UI for one‑shot routing; CLI `shotrouter arm .` is optional.

## Why not just change OS save folders?

- Each OS and desktop handles this differently; GNOME is often locked down, Windows/OneDrive complicates paths, macOS uses defaults that shift.
- ShotRouter leaves capture UX as‑is and solves the discovery, naming, routing, and compliance steps post‑capture.

---

See docs/overview/WHITEPAPER.md to dive in.
