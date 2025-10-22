#!/bin/bash
# uninstall-service.sh - Uninstall ShotRouter systemd user service

set -e

SERVICE_NAME="shotrouter"
SERVICE_FILE="$HOME/.config/systemd/user/${SERVICE_NAME}.service"

if [ ! -f "$SERVICE_FILE" ]; then
    echo "Service not installed (file not found: $SERVICE_FILE)"
    exit 0
fi

# Stop and disable the service
systemctl --user stop "$SERVICE_NAME.service" 2>/dev/null || true
systemctl --user disable "$SERVICE_NAME.service" 2>/dev/null || true

# Remove service file
rm -f "$SERVICE_FILE"
echo "✓ Service file removed"

# Reload systemd
systemctl --user daemon-reload
echo "✓ Systemd user daemon reloaded"

echo ""
echo "ShotRouter service uninstalled successfully!"
