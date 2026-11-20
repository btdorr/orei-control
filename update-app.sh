#!/bin/bash
# Update the Orei Control Panel to the latest commit on $UPDATE_BRANCH, the
# branch named in .update-branch, or main.
#
# Run from the web UI (POST /api/system/update starts it as the transient
# systemd unit orei-update, so restarting the service does not kill it) or
# over SSH as ./update-app.sh.
#
# Steps: refuse if tracked files have local changes, fast-forward to
# origin/$UPDATE_BRANCH, install requirements only if they changed, restart
# the service, health check. If anything fails after the code changes, it
# resets to the previous commit and restarts again.
#
# Writes progress to update.log and the result to update-status.json.
# Exit codes: 0 updated or already up to date, 1 failed with no changes,
# 2 failed and rolled back, 3 rollback failed.

# Everything runs inside main() so bash has parsed the whole script before
# git rewrites this file on disk.
main() {
    set -u
    export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

    APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    # Branch to follow: UPDATE_BRANCH env (SSH use), else .update-branch file
    # (staging tests; the UI update cannot pass env through sudo), else main
    BRANCH="${UPDATE_BRANCH:-$(cat "$APP_DIR/.update-branch" 2>/dev/null || true)}"
    BRANCH="${BRANCH:-main}"
    SERVICE="orei-control.service"
    HEALTH_URL="http://localhost:5000/api/version"
    LOG="$APP_DIR/update.log"
    STATUS="$APP_DIR/update-status.json"
    OLD=""
    NEW=""
    STARTED="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

    cd "$APP_DIR" || exit 1

    exec 9>"$APP_DIR/.update.lock"
    if ! flock -n 9; then
        echo "Another update is already running"
        exit 1
    fi

    : > "$LOG"
    exec > >(tee -a "$LOG") 2>&1

    write_status running "Update started"
    echo "Updating $APP_DIR from origin/$BRANCH"

    local current
    current="$(git branch --show-current)"
    if [ "$current" != "$BRANCH" ]; then
        fail_unchanged "Checked out branch is '$current', expected '$BRANCH'"
    fi

    if ! git diff --quiet || ! git diff --cached --quiet; then
        git status --short --untracked-files=no
        fail_unchanged "Tracked files have local changes. Commit or discard them first"
    fi

    OLD="$(git rev-parse HEAD)"
    echo "Fetching origin/$BRANCH..."
    if ! git fetch origin "$BRANCH"; then
        fail_unchanged "git fetch failed"
    fi
    NEW="$(git rev-parse "origin/$BRANCH")"

    if [ "$OLD" = "$NEW" ]; then
        echo "Already up to date at $(short "$OLD")"
        write_status up_to_date "Already up to date"
        exit 0
    fi

    echo "Updating $(short "$OLD") -> $(short "$NEW")"
    git log --oneline "$OLD..$NEW"
    if ! git merge --ff-only "origin/$BRANCH"; then
        fail_unchanged "Fast-forward failed. Local branch has diverged from origin/$BRANCH"
    fi

    if ! git diff --quiet "$OLD" "$NEW" -- requirements.txt; then
        echo "requirements.txt changed, installing dependencies..."
        if ! venv/bin/pip install -r requirements.txt; then
            rollback "Dependency install failed"
        fi
    else
        echo "requirements.txt unchanged, skipping dependency install"
    fi

    if ! restart_and_check; then
        rollback "Service did not become healthy after restart"
    fi

    echo "Update complete: now at $(short "$NEW")"
    write_status success "Updated to $(short "$NEW")"
    exit 0
}

short() { git rev-parse --short "$1"; }

write_status() {
    # $1 state, $2 message. States: running, up_to_date, success, failed, rolled_back, rollback_failed
    local msg="${2//\"/\'}"
    printf '{"state": "%s", "message": "%s", "from": "%s", "to": "%s", "branch": "%s", "started": "%s", "updated": "%s"}\n' \
        "$1" "$msg" "$OLD" "$NEW" "$BRANCH" "$STARTED" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$STATUS.tmp"
    mv "$STATUS.tmp" "$STATUS"
}

fail_unchanged() {
    echo "FAILED: $1"
    write_status failed "$1"
    exit 1
}

restart_and_check() {
    echo "Restarting $SERVICE..."
    sudo -n systemctl restart "$SERVICE" || return 1
    local i
    for i in $(seq 1 30); do
        sleep 1
        if systemctl is-active --quiet "$SERVICE" && curl -fsS -m 3 -o /dev/null "$HEALTH_URL"; then
            echo "Health check passed after ${i}s"
            return 0
        fi
    done
    echo "Health check failed after 30s"
    sudo -n journalctl -u "$SERVICE" -n 20 --no-pager || true
    return 1
}

rollback() {
    echo "FAILED: $1"
    echo "Rolling back to $(short "$OLD")..."
    write_status running "$1. Rolling back"
    if git reset --hard "$OLD" \
        && { git diff --quiet "$OLD" "$NEW" -- requirements.txt || venv/bin/pip install -r requirements.txt; } \
        && restart_and_check; then
        echo "Rolled back to $(short "$OLD")"
        write_status rolled_back "$1. Rolled back to $(short "$OLD")"
        exit 2
    fi
    echo "ROLLBACK FAILED. Manual recovery needed (see /opt/orei-control-backups)"
    write_status rollback_failed "$1. Rollback also failed"
    exit 3
}

main "$@"
