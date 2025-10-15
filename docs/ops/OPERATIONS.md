# ShotRouter — Operations

## Linux (systemd user service)

Service file (reference):
```
[Unit]
Description=ShotRouter Daemon
After=network.target

[Service]
ExecStart=%h/.local/bin/shotrouterd
Restart=on-failure
Environment=SHOTROUTER_CONFIG=%h/.config/shotrouter/config.toml

[Install]
WantedBy=default.target
```

Install:
```
mkdir -p ~/.config/systemd/user
# write shotrouterd.service here
systemctl --user daemon-reload
systemctl --user enable --now shotrouterd
```

## Windows

- Service wrapper via NSSM or run as a tray app
- Config in `%APPDATA%\ShotRouter\config.toml`

## macOS

- LaunchAgent plist under `~/Library/LaunchAgents/`
- Config in `~/Library/Application Support/ShotRouter/config.toml`

## Logs

- Default: `~/.local/state/shotrouter/shotrouter.log` (Linux paths vary)
- Rotated by size

## Control Plane (Optional)

- When enabled, the daemon periodically syncs metadata and pulls policies from ShotHub.
- All sync endpoints are disabled by default; enable via config and enrollment token.
