# Architecture

## Overview

- **Backend**: Flask in one file, `app.py`. In production it runs under gunicorn (1 worker, 4 threads) on `127.0.0.1:5000` behind nginx on port 80, as `orei-control.service`.
- **Frontend**: vanilla ES modules with no build step. `static/next/` is the main UI. `static/index.html` and `static/js/` are the classic UI at `/classic`.
- **Matrix**: RS-232 through `SerialManager`. One command at a time under a lock. A reply ends after 100ms of silence (2 second cap).
- **Rokus**: HTTP ECP on port 8060 through `requests`.

The UI does not poll. It reads the matrix on load, on the refresh button, and after each change.

## Files

```
app.py                  Flask backend and API
static/next/            Main UI
  index.html
  next.css
  js/main.js            Startup
  js/store.js           Shared state, layouts, saved UI state
  js/device.js          Orei protocol: reads and changes
  js/views.js           TV drawing, layouts, inputs, sound, remote
  js/roku.js            Roku mappings and keys
  js/settings.js        Settings panel
  js/api.js, notice.js, icons.js
static/index.html, static/js/, static/styles.css   Classic UI
rs-232_commands.md      Orei protocol reference
setup.sh                Fresh install to /opt/orei-control
update-app.sh           Updater used by the UI and deploy-production.sh
deploy-production.sh    Full backup, then update-app.sh
orei-control.sudoers    Exact sudo rights of the orei user
migrate-service-user.sh One-time move to the orei user
test-serial.py, test-roku.py   Hardware checks (need real devices)
version.json            Written by CI
```

## Serial

- The port is opened with `exclusive=True`. The lock, history, and handle are per process, so the service must stay at 1 gunicorn worker.
- A serial error marks the port disconnected. The next command reopens it.
- The last 50 commands and replies are kept in memory for the command log.

## First paint

The page embeds `ui_state.json` and `branding.json` when it is served, so it opens showing the last known layout, inputs, and name. It then reads the matrix and corrects anything that changed. Commands run one at a time, so the UI reads window inputs before slower settings.

## Security

- **No login, by design.** Anyone who can reach port 80 (LAN, or a tailnet for remote installs) controls the matrix, the Rokus, and shutdown, restart, and updates.
- No CORS, so other websites cannot call the API from a visitor's browser.
- The service runs as `orei`, which has no login shell and is in the `dialout` and `plugdev` groups. Its sudo rights are the exact lines in `orei-control.sudoers`, with no wildcards.
- Server-side validation:
  - Roku mappings: HDMI 1 to 4, private IPv4 only, short strings.
  - Key names, app IDs, and hold time.
  - Branding: length limits.
  - Serial port: must be a port the Pi lists.
- Text from devices or the API is escaped before it is shown.
- The dev server never enables the Werkzeug debugger.

## Updates

**Update** in Settings and `deploy-production.sh` both run `update-app.sh`. It:

1. Refuses to run if tracked files changed or the checked-out branch is not `main` (or the branch in `.update-branch`).
2. Fast-forwards to `origin/main`. It never merges or rebases.
3. Runs `pip install` only if `requirements.txt` changed.
4. Restarts the service and checks `/api/version` for 30 seconds.
5. On failure, resets to the previous commit and restarts again.

The UI starts it as a separate systemd unit so the restart does not stop it. Progress goes to `update.log` and the result to `update-status.json`. The page reloads once `/api/version` reports the new commit.

## Versioning

A GitHub Action writes `version.json` on every push to `main` and commits it with `[skip ci]`. The major version is set by hand in `.github/workflows/auto-version.yml`. The minor version goes up every 10 commits and the patch is the remainder. Pull before pushing to `main` again.
