# Installation and configuration

## Hardware

- Raspberry Pi with Raspberry Pi OS.
- RS-232 link to the Orei UHD-401MV: the Pi's GPIO UART (`/dev/serial0`) through a level shifter, or a USB serial adapter (`/dev/ttyUSB0`).
- Rokus on the same network as the Pi.

## Automated setup

```bash
git clone https://github.com/btdorr/orei-control.git
cd orei-control
./setup.sh
```

`setup.sh` installs to `/opt/orei-control`, creates the virtual environment, and creates the `orei` service user and its sudoers rules. It also installs the systemd unit and the nginx proxy, and enables the UART (`enable_uart=1`, reboot required). The app is then at `http://<pi-address>` on port 80.

Installs that ran as the admin user move to the `orei` user once with `/opt/orei-control/migrate-service-user.sh`.

## Manual run

```bash
sudo apt update && sudo apt install -y python3-pip python3-venv netcat-openbsd nmap
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

python app.py                                                     # port 5000, app_config.json
OREI_CONFIG=app_config_dev.json python app.py --port 8080 --debug  # dev port, auto-reload
```

A manual install also needs the UART enabled and the user in the `dialout` group for serial access.

Production runs `gunicorn --bind 127.0.0.1:5000 --workers 1 --threads 4 app:app` behind nginx. Keep 1 worker: the serial port is opened exclusively by one process.

## Runtime files

These live in the app directory (`/opt/orei-control` on an install). They are gitignored, so updates never overwrite them. On installs they are owned by `orei`, so edit them with `sudo -u orei`.

| File | Contents | Set from |
| --- | --- | --- |
| `app_config.json` | `serial_port`, `baud_rate`, `roku_hold_seconds` | Settings > Matrix, Settings > Rokus |
| `roku_devices.json` | Roku name, IP, model, and serial for each HDMI input | Settings > Rokus |
| `branding.json` | Page `title` and `subtitle` | Settings > Name |
| `ui_state.json` | Last known layout, inputs, and sound, used for the first paint | Written by the UI. Safe to delete. |
| `update.log`, `update-status.json` | Last update's progress and result | The updater |
| `.update-branch` | Branch the updater follows instead of `main` (staging tests only) | By hand |

Set `OREI_CONFIG` to use a different config file name.

### Serial settings
- Port `/dev/serial0` or `/dev/ttyUSB0`. Settings only offers ports the Pi reports.
- 115200 baud, 8 data bits, 1 stop bit, no parity.
- A reply ends after 100ms of silence, with a 2 second cap.

### Branding
The title and subtitle are easiest to change in Settings > Name. To set them by file:

```bash
cd /opt/orei-control
sudo -u orei cp branding.example.json branding.json
sudo -u orei nano branding.json
```

```json
{
  "title": "Den Video Wall",
  "subtitle": "Game day controller"
}
```

- Refresh the page to see changes. No restart is needed.
- A missing key uses the default: "Orei UHD-401MV Control Panel" and "HDMI Multiviewer RS-232 Control Interface".
- Text is shown as typed. HTML is not rendered.
- If the file is not valid JSON, the defaults are used and a warning is logged.

### Roku long press
`roku_hold_seconds` (0.5 to 5, default 1) is how long the Roku sees OK held when someone holds OK on the remote. Settings > Rokus changes it without a restart.

## Network

- Roku control uses TCP 8060 (ECP). Discovery uses SSDP on UDP 1900, then falls back to scanning the subnet for port 8060 with `nc`.
- Roku mappings must use private IPv4 addresses. If Rokus move to another subnet, find them again in Settings.
- There is no login. Anyone who can reach port 80 can control everything. Keep it off the public internet. See [Architecture](architecture.md#security).
