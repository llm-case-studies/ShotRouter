# ShotRouter — Whitepaper

ShotRouter is a per‑machine screenshot manager that keeps your native capture flow intact (Print Screen → select area), then reliably routes and renames the resulting files into the right project. It solves the “where did that screenshot go?” problem while adding light compliance, audit, and retention. The primary interface is a local UI; CLI tools exist for developers.

## Problem

- OS overlays save to different places with different names; changing the default is brittle and OS‑specific.
- Developers and analysts want to stay in flow; introducing delays or modal changes hurts productivity.
- Teams need predictable names/locations for assets (docs, issues, reviews) and light audit/retention.

## Goals

- Zero change to the capture UX (overlay remains native).
- Deterministic post‑capture routing + renaming.
- Cross‑platform design (Linux, Windows, macOS).
- Local‑only by default, privacy‑preserving.
- Minimal friction: single daemon + one‑shot “arm next” control.

## Principles

- Don’t fight the OS overlay; work after capture.
- One manager per machine to prevent races and confusion.
- Atomic claim before move to ensure single ownership.
- Config lives with the repo for target paths; global config for sources.
- Fail‑safe: if routing isn’t armed, nothing breaks — screenshot lands in an inbox.

## User Experience

- Normal capture: user presses Print Screen and selects — manager quietly picks it up and routes per rules.
- One‑shot: “Arm next” from the active repo; the next screenshot is routed to that repo’s `assets/images` and renamed.
- Inbox: unclaimed shots appear in the UI list; route with one click.

## Technical Strategy

- Watch well‑known OS screenshot folders (sources) with a single daemon.
- On new file: debounce until stable; attempt atomic rename in place to claim; move + rename to destination.
- Record metadata (hash, times, source, dest) in a local SQLite DB.
- Expose local FastAPI endpoints + WebSocket events for UI and tooling.

## Compliance & Trust (ActCLI context)

- Audit trail: who moved what, when, from where to where, with hashes.
- Retention policy: warn or purge stale inbox files; optional policy per repo.
- Entirely local; never uploads outside unless configured.
- Pluggable analyzers (local LLMs/heuristics) and policy gates allow pre‑route checks.

## Phases

1) MVP (Linux): watcher, CLI (arm next), per‑repo target, rename scheme, SQLite metadata.
2) UI + API: inbox, routed list, quick actions; WS events; VSCode command.
3) Windows/macOS watchers; sticky routing; retention/alerts.
4) Rules: window title, per‑source routes; thumbnails; tags/notes. Optional fleet control plane for org policy distribution and metadata sync.

## Non‑Goals

- Replacing OS overlay or changing capture UX.
- Heavy DLP/PII scanning (could be pluggable later).

ShotRouter is boring by design: it does one thing — make screenshots discoverable, predictable, and compliant — without distracting the user.
