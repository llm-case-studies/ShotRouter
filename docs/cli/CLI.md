# ShotRouter — CLI (Developer Convenience)

Binary names: `shotrouterd` (daemon) and `shotrouter` (CLI). Below defines the CLI UX — no implementation yet. The UI is primary; CLI is optional.

## Global

- `shotrouter start` — start daemon in foreground
- `shotrouter stop` — stop daemon
- `shotrouter status` — show PID, sources watched, routes active
- `shotrouter settings` — show effective config

## Routes

- `shotrouter arm <repo_path>`
  - Arm next screenshot for the repo; reads `<repo>/actcli.toml` for `[screenshot]`.
  - Examples:
    - `shotrouter arm .`
    - `shotrouter arm /home/alex/Projects/ActCLI`

- `shotrouter sticky <repo_path> [--ttl 30m]` (phase 2)
  - Route all new screenshots to this repo until cleared or TTL expires.

- `shotrouter clear` — clear armed/sticky routes

## Inbox & Routed

- `shotrouter list [--status inbox|routed|error] [--limit 50]` — list items
- `shotrouter route <id> <repo_path>` — route one item from inbox
- `shotrouter delete <id> [--with-file]` — delete record (and file if specified)

## Sources

- `shotrouter sources` — list watched paths and debounce settings
- `shotrouter sources add <path>` — add a new source path
- `shotrouter sources rm <path>` — remove a source path

## Output

- Use human‑friendly tables by default; `--json` for machine output
