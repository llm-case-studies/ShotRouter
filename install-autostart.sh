#!/bin/bash
# install-autostart.sh - Install ShotRouter as a desktop autostart application

set -e

AUTOSTART_DIR="$HOME/.config/autostart"
DESKTOP_FILE="$AUTOSTART_DIR/shotrouter.desktop"
VENV_PATH="$(cd "$(dirname "$0")" && pwd)/.venv"
EXEC_PATH="$VENV_PATH/bin/shotrouterd"

# Ensure autostart directory exists
mkdir -p "$AUTOSTART_DIR"

# Check if shotrouterd is installed
if [ ! -f "$EXEC_PATH" ]; then
    echo "Error: shotrouterd not found at $EXEC_PATH"
    echo "Please run 'pip install -e .' first from the project directory"
    exit 1
fi

# Create desktop entry
cat > "$DESKTOP_FILE" << EOF
[Desktop Entry]
Type=Application
Name=ShotRouter
Comment=Screenshot Router Daemon
Exec=$EXEC_PATH
Terminal=false
Hidden=false
X-GNOME-Autostart-enabled=true
StartupNotify=false
Categories=Utility;
EOF

echo "✓ Desktop entry created at $DESKTOP_FILE"
echo ""
echo "ShotRouter will now start automatically on desktop login!"
echo ""
echo "To remove autostart:"
echo "  rm $DESKTOP_FILE"
echo ""
echo "To start now (without waiting for next login):"
echo "  shotrouterd &"
echo ""
