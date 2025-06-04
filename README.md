# Orei UHD-404MV Control Panel

A simplified web-based control interface for the Orei UHD-404MV HDMI Multiviewer via RS-232 communication.

## Features

- **Power Control**: Turn the device on/off
- **Display Modes**: Single, PIP, PBP, Triple, and Quad screen modes
- **Audio Control**: Volume, mute, and source selection
- **Output Settings**: Resolution and HDCP configuration
- **Visual Display**: Interactive diagram showing current layout
- **Command History**: Track all RS-232 commands and responses
- **Rate Limiting**: Prevents overwhelming the RS-232 interface

## Recent Improvements

### Code Simplification
- Removed duplicate display diagram implementations
- Consolidated event handling into organized modules
- Simplified Flask backend by removing unused endpoints
- Cleaned up HTML structure and removed redundant sections

### Performance Optimizations
- Added command rate limiting (300ms minimum between requests)
- Sequential command execution instead of parallel requests
- Increased auto-refresh interval to 10 seconds
- Better error handling and response parsing

### RS-232 Communication

**Connection Settings:**
- Baud rate: 115200
- Data bits: 8  
- Stop bits: 1
- Parity: None
- Port: `/dev/serial0`

**Working Commands (ASCII Format):**
- `r power!` - Check power status (returns "power on" or "power off")
- `r multiview!` - Get current display mode (returns "single screen", "PIP", etc.)
- `r output audio!` - Get output audio source  
- `r output audio vol!` - Get output audio volume
- `r output audio mute!` - Get output audio mute status
- `r output res!` - Get output resolution
- `r output hdcp!` - Get output HDCP status
- `r window 1 in!` - Get window 1's selected input
- `power 0!` - Turn device off
- `power 1!` - Turn device on
- `s multiview x!` - Set display mode (x=1-5: single, PIP, PBP, triple, quad)
- `s output audio vol x!` - Set audio volume (x=0-100)
- `s output audio mute x!` - Set audio mute (x=0 off, x=1 on)
- `s window x in y!` - Set window x to input y (x=1-4, y=1-4)

**Previously Invalid Commands (Now Fixed):**
- ~~`r volume!`~~ → Use `r output audio vol!`
- ~~`r mute!`~~ → Use `r output audio mute!`
- ~~`r resolution!`~~ → Use `r output res!`
- ~~`r hdcp!`~~ → Use `r output hdcp!`
- ~~`r audio!`~~ → Use `r output audio!`
- ~~`r window1!`~~ → Use `r window 1 in!`

**Official Protocol:**
According to Orei documentation, the UHD-401MV should use hexadecimal commands like:
- `EB 90001200 ff 32000001020300000000000` (Single mode)
- `EB 90001200 ff 32010001020300000000000` (PIP mode)

However, your device appears to respond to ASCII commands, suggesting either:
1. Custom firmware
2. Different model/variant
3. Bridge/converter in the communication path

**Rate Limiting & Queuing:**
- Minimum 300ms between commands
- Sequential command execution to prevent RS-232 overload
- Command queuing system with timeout handling
- Enhanced error recovery mechanisms
- Reduced command history buffer (50 entries max)

## File Structure

```
├── app.py                          # Flask backend (simplified)
├── static/
│   ├── index.html                  # Main UI (cleaned up)
│   ├── styles.css                  # CSS with display diagram styles
│   └── js/
│       ├── app.js                  # Main app with organized event handling
│       └── modules/
│           ├── api.js              # API client with rate limiting
│           ├── device-control.js   # Device control logic
│           ├── ui-utils.js         # UI utilities
│           └── theme.js            # Theme management
├── requirements.txt
└── README.md
```

## Installation

1. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Start the Flask server:
   ```bash
   # Development
   python app.py
   
   # Production with gunicorn
   source venv/bin/activate
   gunicorn --bind 0.0.0.0:5000 --workers 2 --timeout 120 app:app
   ```

3. Access the web interface at `http://localhost:5000`

## Configuration

### Serial Port Settings
- **Port**: `/dev/serial0` (Raspberry Pi default)
- **Baud Rate**: 115200
- **Timeout**: 2 seconds
- **Command Delay**: 200ms between commands

### Rate Limiting
- **Minimum Request Interval**: 300ms
- **Auto-refresh Interval**: 10 seconds
- **Command History Limit**: 50 entries

## Usage

1. **Power Control**: Use the power button to turn the device on/off
2. **Display Mode**: Select from 5 different display layouts
3. **Window Selection**: Click on windows in the diagram to assign HDMI inputs
4. **Audio Control**: Adjust volume, mute, and select audio source
5. **Debug Console**: Send custom RS-232 commands for testing

## Troubleshooting

### Common Issues

1. **"No response" in command history**
   - Caused by sending commands too quickly
   - The rate limiting system now prevents this
   - Allow 300ms minimum between commands

2. **Connection errors**
   - Check serial port permissions: `sudo usermod -a -G dialout $USER`
   - Verify device is connected to correct port
   - Restart the Flask application

3. **Slow response times**
   - Normal with rate limiting enabled
   - Ensures reliable RS-232 communication
   - Commands are queued and processed sequentially

## Development

The codebase has been simplified for easier maintenance:

- **Modular JavaScript**: Each feature is in its own module
- **Rate-limited API**: Prevents RS-232 overload
- **Clean HTML**: Single output settings section
- **Simplified Flask**: Only essential endpoints
- **Better Error Handling**: Graceful failure recovery

For development, you can adjust the rate limiting intervals in `static/js/modules/api.js`.
