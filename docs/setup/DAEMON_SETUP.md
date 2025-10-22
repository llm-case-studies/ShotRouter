# ShotRouter Daemon Setup

This guide shows how to set up ShotRouter to run automatically on your system.

## Quick Start

After installing ShotRouter, choose one of the following options:

### Option 1: systemd User Service (Recommended for Linux)

**Best for:** Users who want automatic restart on crashes and better logging.

```bash
# From the ShotRouter project directory
./install-service.sh
```

This installs ShotRouter as a systemd user service that:
- Starts automatically on login
- Restarts automatically if it crashes
- Logs to systemd journal
- Can be controlled with `systemctl --user` commands

**Useful commands:**
```bash
# Check status
systemctl --user status shotrouter

# View logs
journalctl --user -u shotrouter -f

# Stop/start/restart
systemctl --user stop shotrouter
systemctl --user start shotrouter
systemctl --user restart shotrouter

# Disable auto-start
systemctl --user disable shotrouter

# Uninstall
./uninstall-service.sh
```

### Option 2: Desktop Autostart Entry

**Best for:** Simple setup, works across different desktop environments.

```bash
# From the ShotRouter project directory
./install-autostart.sh
```

This creates a `.desktop` file in `~/.config/autostart/` that starts ShotRouter when you log into your desktop session.

**To remove:**
```bash
rm ~/.config/autostart/shotrouter.desktop
```

## Manual Start

If you don't want automatic startup, you can run ShotRouter manually:

```bash
# Start in foreground (see logs)
shotrouterd

# Start in background
shotrouterd &

# Or with custom host/port
shotrouterd --host 127.0.0.1 --port 8767
```

## Verifying Installation

After starting ShotRouter, verify it's running:

1. **Check the web UI:**
   ```bash
   # Open in your browser
   xdg-open http://127.0.0.1:8767
   ```

2. **Check the API:**
   ```bash
   curl http://127.0.0.1:8767/api/status
   ```

3. **Check the process:**
   ```bash
   ps aux | grep shotrouterd
   ```

## Troubleshooting

### Service won't start

**Check logs:**
```bash
journalctl --user -u shotrouter -n 50
```

**Common issues:**
- Virtual environment not activated during install
- Port 8767 already in use
- Database file permissions

### Desktop autostart not working

**Check if file exists:**
```bash
ls -la ~/.config/autostart/shotrouter.desktop
```

**Test manually:**
```bash
shotrouterd
```

If manual start works but autostart doesn't, check your desktop environment's autostart settings.

### Port already in use

If port 8767 is already in use, you can change it:

**For systemd service:** Edit `~/.config/systemd/user/shotrouter.service` and change the `ExecStart` line:
```ini
ExecStart=/path/to/.venv/bin/shotrouterd --port 8768
```

Then reload:
```bash
systemctl --user daemon-reload
systemctl --user restart shotrouter
```

**For desktop autostart:** Edit `~/.config/autostart/shotrouter.desktop` and change the `Exec` line:
```desktop
Exec=/path/to/.venv/bin/shotrouterd --port 8768
```

## Environment Variables

You can set environment variables in the systemd service file:

Edit `~/.config/systemd/user/shotrouter.service` and add to the `[Service]` section:

```ini
[Service]
Environment="SHOTROUTER_DB=/custom/path/shotrouter.db"
Environment="SHOTROUTER_API_HOST=127.0.0.1"
Environment="SHOTROUTER_API_PORT=8767"
```

## Uninstalling

### Remove systemd service
```bash
./uninstall-service.sh
```

### Remove desktop autostart
```bash
rm ~/.config/autostart/shotrouter.desktop
```

### Remove application data
```bash
# Remove database and config
rm -rf ~/.local/state/shotrouter/
rm -rf ~/.config/shotrouter/
```

## Platform-Specific Notes

### Linux (systemd)
- Service runs as your user (no root required)
- Logs available via `journalctl --user -u shotrouter`
- Service file location: `~/.config/systemd/user/shotrouter.service`

### Linux (non-systemd distros)
Use the desktop autostart method instead.

### macOS (Future)
Will use `launchd` with a `.plist` file in `~/Library/LaunchAgents/`.

### Windows (Future)
Will use Windows Task Scheduler or NSSM (Non-Sucking Service Manager).
