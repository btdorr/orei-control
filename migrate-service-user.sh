#!/bin/bash
# One-time migration of an existing install to the dedicated `orei` service user.
# Run as the admin user (with sudo) on the Pi:  /opt/orei-control/migrate-service-user.sh
#
# Creates the orei system user (groups: dialout, plugdev, for serial access),
# installs the limited sudoers rules, hands /opt/orei-control to orei, and
# switches orei-control.service to run as orei. Safe to re-run.
#
# Stops before touching the service if orei cannot open the configured serial port.

set -euo pipefail

APP_DIR="/opt/orei-control"
UNIT="/etc/systemd/system/orei-control.service"
SUDOERS_SRC="$APP_DIR/orei-control.sudoers"
SUDOERS_DST="/etc/sudoers.d/orei-control"
ADMIN="${SUDO_USER:-$USER}"
TS="$(date +%Y%m%d_%H%M%S)"

[ -d "$APP_DIR" ] || { echo "$APP_DIR not found"; exit 1; }
[ -f "$SUDOERS_SRC" ] || { echo "$SUDOERS_SRC not found. Update the app first."; exit 1; }

echo "1. Service user"
if ! id orei >/dev/null 2>&1; then
    sudo useradd --system --home-dir /var/lib/orei --create-home --shell /usr/sbin/nologin orei
fi
for g in dialout plugdev; do
    getent group "$g" >/dev/null && sudo usermod -a -G "$g" orei
done
id orei

echo "2. Serial access check as orei"
PORT="$(python3 -c "import json;print(json.load(open('$APP_DIR/app_config.json')).get('serial_port','/dev/serial0'))" 2>/dev/null || echo /dev/serial0)"
# Permission check only: open without the exclusive lock (the running service holds it) and close.
if sudo -u orei "$APP_DIR/venv/bin/python" -c "import serial; serial.Serial('$PORT', 115200, timeout=1).close()"; then
    echo "   orei can open $PORT"
else
    echo "   orei cannot open $PORT. Fix the device group or udev rule, then re-run. No changes made to the service."
    exit 1
fi

echo "3. Sudoers"
tmp="$(mktemp)"
cp "$SUDOERS_SRC" "$tmp"
sudo visudo -cf "$tmp"
sudo install -m 0440 -o root -g root "$tmp" "$SUDOERS_DST"
rm -f "$tmp"

echo "4. Ownership"
sudo chown -R orei:orei "$APP_DIR"
# Let the admin run read-only git commands in the checkout
git config --global --get-all safe.directory 2>/dev/null | grep -qx "$APP_DIR" \
    || git config --global --add safe.directory "$APP_DIR"

echo "5. Service unit"
sudo cp "$UNIT" "$UNIT.bak-$TS"
sudo sed -i -e 's/^User=.*/User=orei/' "$UNIT"
grep -q '^Group=' "$UNIT" && sudo sed -i 's/^Group=.*/Group=orei/' "$UNIT" || sudo sed -i 's/^User=orei$/User=orei\nGroup=orei/' "$UNIT"
grep -E '^(User|Group)=' "$UNIT"
sudo systemctl daemon-reload
sudo systemctl restart orei-control.service

echo "6. Health check"
for i in $(seq 1 30); do
    sleep 1
    if curl -fsS -m 3 -o /dev/null http://localhost:5000/api/version; then
        echo "   healthy after ${i}s"
        ps -o user=,args= -C gunicorn | head -1
        curl -s http://localhost:5000/api/status; echo
        echo "Done. Unit backup: $UNIT.bak-$TS"
        exit 0
    fi
done
echo "Service not healthy. Restore with:"
echo "  sudo cp $UNIT.bak-$TS $UNIT && sudo chown -R $ADMIN:$ADMIN $APP_DIR && sudo systemctl daemon-reload && sudo systemctl restart orei-control.service"
exit 1
