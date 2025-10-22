#!/bin/bash
# install-service.sh - Install ShotRouter as a systemd user service

set -e

SERVICE_NAME="shotrouter"
SERVICE_FILE="$HOME/.config/systemd/user/${SERVICE_NAME}.service"
VENV_PATH="$(cd "$(dirname "$0")" && pwd)/.venv"
EXEC_PATH="$VENV_PATH/bin/shotrouterd"

# Ensure systemd user directory exists
mkdir -p "$HOME/.config/systemd/user"

# Check if shotrouterd is installed
if [ ! -f "$EXEC_PATH" ]; then
    echo "Error: shotrouterd not found at $EXEC_PATH"
    echo "Please run 'pip install -e .' first from the project directory"
    exit 1
fi

# Create systemd service file
cat > "$SERVICE_FILE" << EOF
[Unit]
Description=ShotRouter - Screenshot Router Daemon
After=network.target

[Service]
Type=simple
ExecStart=$EXEC_PATH
Restart=on-failure
RestartSec=5s
StandardOutput=journal
StandardError=journal

# Environment
Environment="PATH=$VENV_PATH/bin:/usr/local/bin:/usr/bin:/bin"

[Install]
WantedBy=default.target
EOF

echo "✓ Service file created at $SERVICE_FILE"

# Reload systemd user daemon
systemctl --user daemon-reload
echo "✓ Systemd user daemon reloaded"

# Enable and start the service
systemctl --user enable "$SERVICE_NAME.service"
echo "✓ Service enabled (will start on login)"

systemctl --user start "$SERVICE_NAME.service"
echo "✓ Service started"

# Show status
echo ""
echo "ShotRouter service installed successfully!"
echo ""
echo "Useful commands:"
echo "  systemctl --user status $SERVICE_NAME    # Check status"
echo "  systemctl --user stop $SERVICE_NAME      # Stop service"
echo "  systemctl --user restart $SERVICE_NAME   # Restart service"
echo "  journalctl --user -u $SERVICE_NAME -f    # View logs"
echo "  systemctl --user disable $SERVICE_NAME   # Disable auto-start"
echo ""

# Show current status
systemctl --user status "$SERVICE_NAME.service" --no-pager
