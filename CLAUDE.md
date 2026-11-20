# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Web control panel for the Orei UHD-401MV HDMI multiviewer (RS-232) with Roku ECP control. Runs on a Raspberry Pi. Flask backend in a single file (`app.py`), vanilla ES-module frontend in `static/`. No build step, no package manager for the frontend, no automated test suite.

## Commands

```bash
# Run (binds 0.0.0.0, default port 5000, config app_config.json)
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python app.py
OREI_CONFIG=app_config_dev.json python app.py --port 8080 --debug   # what start-dev.sh runs

# Hardware check scripts (need real devices, not unit tests)
python test-serial.py [/dev/ttyUSB0]   # probe serial ports with r power!/r multiview!
python test-roku.py                    # Roku discovery and ECP check

# Production (on the Pi)
./setup.sh                 # installs nginx, systemd unit, venv in place
./deploy-production.sh     # full backup, then update-app.sh
./restart-service.sh
./check-status.sh
sudo journalctl -u orei-control.service -f
```

Production runs `gunicorn --bind 127.0.0.1:5000 --workers 1 --threads 4 app:app` behind nginx on port 80. Port 5000 is not reachable from the network.

## Architecture

### Backend (`app.py`)
- `Config` loads `serial_port` and `baud_rate` from `app_config.json`. Roku window mappings persist in `roku_devices.json`. Both paths are relative to the working directory and are gitignored runtime state.
- `SerialManager` owns the serial connection. Every command is forced to end with `!`, sent under a global `serial_lock`, then read until a keyword (`on`, `off`, `hdmi`, `mode`, `ok`, ...) or a 2s timeout. `COMMAND_DELAY` (0.2s) is the pause before reading. Command history is an in-memory list capped at 50.
- Roku discovery tries SSDP first, then falls back to scanning the subnet with `nc` on port 8060 (`scan_roku_devices_fallback`). Roku control is HTTP ECP via `requests`.
- `/api/system/*` routes call `sudo shutdown`. `POST /api/system/update` starts `update-app.sh` with `sudo systemd-run --unit=orei-update` so it survives the service restart. The UI polls `/api/system/update/status`, then waits for `/api/version` `running_commit` to match the target. The service runs as `orei`, and its sudo rights are the exact lines in `orei-control.sudoers`. Any change to a sudo call in `app.py` or `update-app.sh` must be mirrored there, with no wildcards (a wildcard on the `systemd-run` line would allow `--uid=0`). The update unit's command line is fixed, so the branch override is the `.update-branch` file, not an env var.
- `update-app.sh` runs everything inside `main()` so bash finishes parsing before git rewrites the file. Keep that structure. It must never modify tracked files, or the next update refuses to run.
- The serial port is opened with `exclusive=True`. Lock, history, and the serial handle are per process, so the service must stay at 1 gunicorn worker. Use threads for concurrency. A second worker would fail to open the port.

### Frontend (`static/`)
- `index.html` loads Bootstrap 5 from CDN and `js/main.js` as `type="module"`. `main.js` imports every module and initializes them.
- Each module exports a singleton object (`DeviceControl`, `DisplayManager`, `AudioControl`, `RokuControl`, ...). Shared state lives on `window.oreiApp` (`currentMode`, `windowInputs`, `selectedWindow`). Some modules also register on `window` (`window.CommandHistory`, `window.RokuControl`) for cross-module calls.
- Cross-module updates use DOM `CustomEvent`s on `document`, e.g. `windowInputsChanged` from `display.js`, which drives which Roku remotes are shown.
- All device traffic goes through `api.js`, which posts raw RS-232 strings to `/api/command`. Device protocol strings (`r multiview!`, `s multiview 5!`) are built in the frontend modules. `rs-232_commands.md` is the protocol reference.
- No cache-busting query strings. nginx sends `Cache-Control: no-cache` for `/static/`, so browsers revalidate every file on load and never mix old and new modules after an update.
- Theming is CSS variables in `styles.css`. Changes must work in both light and dark themes.
- `index()` serves `static/index.html` with `__APP_TITLE__` and `__APP_SUBTITLE__` replaced from `branding.json` (HTML-escaped, defaults in `DEFAULT_BRANDING`). Opening the HTML file directly shows the raw tokens.
- `roku.js` dispatches `rokuMappingsChanged` when mappings load or change. `display.js` rebuilds window input and audio source labels from `window.RokuControl.mappings`.

## Security model

- No login, by decision. Anyone who can reach port 80 (LAN, tailnet) has full control. Do not add authentication without asking.
- No CORS. The UI is same-origin. Do not re-add `flask_cors`, which would let any website call the API from a visitor's browser.
- Strings from devices or the API (Roku names, IPs, model, serial, error messages) must not reach `innerHTML` unescaped. Use `Utils.escapeHtml` or `textContent`. `Utils.showToast` escapes its message.
- Roku inputs are validated server-side: mappings (`validate_roku_mappings`: HDMI 1-4, private IPv4, short strings), keypress names, and app IDs, because they are interpolated into ECP URLs. Serial port changes must be a port from `get_available_serial_ports()`.
- The dev server runs with the reloader but never the Werkzeug debugger (`use_debugger=False`), because it binds `0.0.0.0`.

## Gotchas

- One serial port. Whichever of the dev server and `orei-control.service` opens it first keeps it, and the other reports "Serial port not connected". Stop the service before testing dev against hardware.
- `start-dev.sh` and `stop-dev.sh` are generated by `dev-setup.sh` and are not tracked. They manage the server through `.dev-server.pid` and its process group.
- A GitHub Action bumps `version.json` and commits to `main` with `[skip ci]` on every push. Pull before pushing to `main` again. Do not edit `version.json` by hand.
- Branch flow is `feature/*` into `develop`, then `develop` into `main`. See DEVELOPMENT.md.
