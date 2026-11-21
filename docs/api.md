# API

All endpoints return JSON with a `success` field and an `error` message on failure. The UI is same-origin and there is no CORS.

## Pages

| Route | Page |
| --- | --- |
| `GET /` and `/next` | Main UI (`static/next/`) |
| `GET /classic` | Original Bootstrap UI (`static/index.html`) |

## Matrix

| Method and path | Purpose |
| --- | --- |
| `POST /api/command` | Send an RS-232 command, `{"command": "r power!"}`. `!` is added if missing. |
| `GET /api/status` | Power and connection status |
| `GET /api/history` | Recent commands and replies (`?limit=`) |
| `DELETE /api/history` | Clear the command history |
| `GET /api/config/serial` | Current port, connection state, and available ports |
| `POST /api/config/serial` | Change the port, `{"port": "/dev/ttyUSB0"}`. Must be a listed port. |

## Roku

| Method and path | Purpose |
| --- | --- |
| `GET /api/roku/discover` | Find Rokus on the network |
| `GET /api/roku/mappings` | Rokus by HDMI input |
| `POST /api/roku/mappings` | Save mappings, `{"mappings": {"1": {"ip", "name", "model", "serial"}}}` |
| `POST /api/roku/command` | Send a key, `{"hdmi": 1, "command": "Select"}`. Add `"hold": true` for a long press. |
| `GET /api/config/roku` | Long-press hold time, `{"hold_seconds": 1.0}` |
| `POST /api/config/roku` | Set it, `{"hold_seconds": 1.5}` (0.5 to 5) |
| `GET /api/roku/apps/<hdmi>` | Installed apps on that input's Roku |
| `POST /api/roku/launch` | Launch an app, `{"hdmi": 1, "app_id": "12"}` |

A long press sends ECP `keydown`, waits the hold time, then always sends `keyup`.

## UI

| Method and path | Purpose |
| --- | --- |
| `POST /api/ui-state` | Save the last known layout, inputs, and sound for the next page load |
| `POST /api/branding` | Set `{"title", "subtitle"}`. Empty restores the default. Max 80 and 120 characters. |
| `GET /api/version` | `version.json` contents and the running commit |

## System

These run `sudo` commands. The `orei` user may run only the exact lines in `orei-control.sudoers`.

| Method and path | Purpose |
| --- | --- |
| `POST /api/system/shutdown`, `/cancel` | Shut down the Pi in 1 minute, or cancel |
| `POST /api/system/restart`, `/cancel` | Reboot the Pi in 1 minute, or cancel |
| `POST /api/system/update` | Start `update-app.sh` as the systemd unit `orei-update` |
| `GET /api/system/update/status` | Update state, log, and whether it is still running |
