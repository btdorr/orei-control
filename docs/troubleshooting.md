# Troubleshooting

## "Can't reach the matrix"

- Check that the Orei has power and the serial cable is connected.
- Check Settings > Matrix: the serial port must match the cable (`/dev/serial0` for GPIO, `/dev/ttyUSB0` for a USB adapter).
- Only one process can open the port. If a dev server is running on the same Pi, stop it or stop the service.
- From the Pi: `python test-serial.py /dev/ttyUSB0`.

Right after a restart, Settings may show "Not connected" until the first command opens the port.

## Rokus not found

- The Rokus must be on the same subnet as the Pi.
- `netcat-openbsd` must be installed: `sudo apt install netcat-openbsd`.
- Routers that block multicast stop SSDP. The subnet scan fallback still works.
- From the Pi: `python test-roku.py`, or `nmap -p 8060 --open 192.168.1.0/24`.

## A Roku does not respond

- Check that the Roku is on and its IP has not changed. If it has, find it again in Settings > Rokus.
- From the Pi: `curl http://<roku-ip>:8060/query/device-info`.

## Holding OK does not open the app's menu

Raise Settings > Rokus > **OK long-press hold** and try again.

## Wrong layout, inputs, or volume

Someone may have used the Orei's own remote. Press the refresh button at the top right.

## Page looks wrong after an update

Reload the page. nginx tells browsers to recheck every file, so one reload is enough.

## Logs and status

```bash
sudo journalctl -u orei-control.service -f
./check-status.sh
cat /opt/orei-control/update.log
```

The command log in Settings > Troubleshooting shows each RS-232 command and reply. You can send a raw command from there, such as `r power!` or `r multiview!`.
