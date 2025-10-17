# ShotRouter — Configuration

Two levels of configuration. All TOML.

## Global (per machine)

Path: `~/.config/shotrouter/config.toml`

```toml
# Folders ShotRouter watches for new screenshots.
# Preferred format (richer and explicit):
[[sources.items]]
path = "~/Pictures/Screenshots"
enabled = true
debounce_ms = 400
name = "My Screens"
icon = "🖼️"

# Legacy minimal format (still accepted on read):
[sources]
paths = ["~/Pictures/Screenshots"]

# Debounce time before claiming a file (ms)
debounce_ms = 400

# Optional inbox if no route is armed
inbox_dir = "~/Screenshots-Inbox"

# API binding (defaults)
[api]
host = "127.0.0.1"
port = 8767
# token = "..."  # optional

# Analyzer plugins (optional)
[analyzers]
# Example: enable local LLM or regex scanners; off by default
# pii.enabled = false
# ip.enabled = false
# ollama.model = "llama3.1:8b"

# Policy (local defaults; may be overridden by org policies)
[policy]
# action on high severity (approve|gate|quarantine)
high = "gate"
medium = "gate"
low = "approve"
```

## Per‑repo (co-located with code)

Path: `<repo>/actcli.toml`

```toml
[screenshot]
# Where screenshots should land inside the repo
target_dir = "assets/images"

# How files should be named when moved
# Available tokens: {repo} {date} {time} {yyyy} {MM} {dd} {HH} {mm} {ss} {n}
name_format = "{repo}-{yyyy}{MM}{dd}_{HH}{mm}{ss}-{n}.png"

# Sticky routing while this repo is active (optional, default false)
always_route = false

# Optional repo‑local overrides
[policy]
# e.g., relax for public repos
high = "gate"
medium = "approve"
low = "approve"
```

## Config precedence & environment

Precedence: env vars → repo TOML → global TOML → defaults.

- `SHOTROUTER_CONFIG` — custom global config path
- `SHOTROUTER_API_HOST`, `SHOTROUTER_API_PORT`
- `SHOTROUTER_POLICY_*` to override policy keys (e.g., `SHOTROUTER_POLICY_HIGH=quarantine`)

### Source format precedence

- When both `[[sources.items]]` and `[sources].paths` exist, the `[[sources.items]]` entries take precedence; legacy `paths` are ignored to prevent duplication.
- Paths are canonicalized on write (expanduser + resolve). On Windows, paths are case-normalized.
- The app writes config atomically (tmp + replace) and uses a lightweight file lock to avoid tearing.

## Defaults

- If global config missing: use OS defaults for sources and 400ms debounce.
- If repo config missing: `assets/images` and `{repo}-{date}_{time}-{n}.png`.
