#!/bin/bash
# Deploy the latest main branch to this install over SSH.
#
# Takes a full backup of /opt/orei-control, then runs update-app.sh, the same
# updater the web UI uses. update-app.sh handles the fast-forward, dependency
# install, restart, health check, and git rollback on failure.

APP_DIR="/opt/orei-control"
BACKUP_DIR="/opt/orei-control-backups"
KEEP_BACKUPS=5

if [ ! -d "$APP_DIR" ]; then
    echo "Production directory $APP_DIR not found. Run setup.sh first."
    exit 1
fi

backup_name="backup_$(date +%Y%m%d_%H%M%S)"
echo "Creating backup: ${BACKUP_DIR}/${backup_name}"
sudo mkdir -p "$BACKUP_DIR"
if ! sudo cp -a "$APP_DIR" "${BACKUP_DIR}/${backup_name}"; then
    echo "Backup failed. Not deploying."
    exit 1
fi
sudo find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d -name "backup_*" | sort -r | tail -n +$((KEEP_BACKUPS + 1)) | sudo xargs -r rm -rf

"$APP_DIR/update-app.sh"
rc=$?

case $rc in
    0) echo "Deploy finished." ;;
    2) echo "Deploy failed and was rolled back. See $APP_DIR/update.log" ;;
    3) echo "Deploy failed and rollback failed. Restore manually:"
       echo "  sudo systemctl stop orei-control.service"
       echo "  sudo rm -rf $APP_DIR && sudo cp -a ${BACKUP_DIR}/${backup_name} $APP_DIR"
       echo "  sudo systemctl start orei-control.service" ;;
    *) echo "Deploy failed before changing anything. See $APP_DIR/update.log" ;;
esac
exit $rc
