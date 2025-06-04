# OREI UHD-401MV RS-232 Commands Reference

**Serial Port Settings:** Baud rate: 115200 (default), 57600, 38400, 19200, 9600; Data bits: 8bit; Stop bits: 1; Check bit: 0

**Command Format:** All commands end with `!` delimiter

---

## SYSTEM COMMANDS

### Read Commands (r)
| Command | Function | Example | Response |
|---------|----------|---------|----------|
| `help!` | Lists all commands | `help!` | Command list |
| `r type!` | Get device model | `r type!` | `4x1 HDMI Multiviewer` |
| `r fw version!` | Get firmware version | `r fw version!` | `MCU FW version x.xx.xx SCALER FW version x.xx.xx` |
| `r power!` | Get current power state | `r power!` | `power on` / `power off` |

### Set Commands (s)
| Command | Function | Parameters | Example | Response |
|---------|----------|------------|---------|----------|
| `power z!` | Power on/off device | z=0 (off), z=1 (on) | `power 1!` | `power on System Initializing... Initialization Finished!` |
| `reboot!` | Reboot device | None | `reboot!` | `Reboot… System Initializing... Initialization Finished!` |
| `reset!` | Reset to factory defaults | None | `reset!` | `Reset to factory defaults System Initializing...` |

---

## OUTPUT SETTINGS

### Read Commands (r)
| Command | Function | Example | Response |
|---------|----------|---------|----------|
| `r output res!` | Get output resolution | `r output res!` | `out resolution: 3840x2160p60` |
| `r output hdcp!` | Get output HDCP status | `r output hdcp!` | `output HDCP: HDCP 1.4` |
| `r output vka!` | Get video keep active pattern | `r output vka!` | `output VKA pattern: black screen` |
| `r output itc!` | Get output video mode | `r output itc!` | `output ITC: video mode` |

### Set Commands (s)
| Command | Function | Parameters | Example | Response |
|---------|----------|------------|---------|----------|
| `s output res x!` | Set output resolution | x=1-14 (see resolution list below) | `s output res 3!` | `out resolution: 3840x2160p60` |
| `s output hdcp x!` | Set output HDCP | x=1 (HDCP 1.4), x=2 (HDCP 2.2), x=3 (HDCP OFF) | `s output hdcp 2!` | `output HDCP: HDCP 1.4` |
| `s output vka x!` | Set video keep active pattern | x=1 (black screen), x=2 (blue screen) | `s output vka 1!` | `output VKA pattern: black screen` |
| `s output itc x!` | Set output video mode | x=1 (video mode), x=2 (PC mode) | `s output itc 1!` | `output ITC: video mode` |

**Output Resolution Options (x=1-14):**
1. 4096x2160p60
2. 4096x2160p50
3. 3840x2160p60
4. 3840x2160p50
5. 3840x2160p30
6. 3840x2160p25
7. 1920x1200p60RB
8. 1920x1080p60
9. 1920x1080p50
10. 1360x768p60
11. 1280x800p60
12. 1280x720p60
13. 1280x720p50
14. 1024x768p60

---

## EDID SETTINGS

### Read Commands (r)
| Command | Function | Example | Response |
|---------|----------|---------|----------|
| `r input EDID!` | Get input EDID mode | `r input EDID!` | `input EDID:4K2K60_444,Stereo Audio 2.0` |

### Set Commands (s)
| Command | Function | Parameters | Example | Response |
|---------|----------|------------|---------|----------|
| `s input EDID x!` | Set HDMI input EDID mode | x=1-18 (see EDID options below) | `s input EDID 1!` | `input EDID:4K2K60_444,Stereo Audio 2.0` |

**EDID Mode Options (x=1-18):**
1. 4K2K60_444,Stereo Audio 2.0
2. 4K2K60_444,Dolby/DTS 5.1
3. 4K2K60_444,HD Audio 7.1
4. 4K2K30_444,Stereo Audio 2.0
5. 4K2K30_444,Dolby/DTS 5.1
6. 4K2K30_444,HD Audio 7.1
7. 1080P,Stereo Audio 2.0
8. 1080P,Dolby/DTS 5.1
9. 1080P,HD Audio 7.1
10. 1920x1200,Stereo Audio 2.0
11. 1680x1050,Stereo Audio 2.0
12. 1600x1200,Stereo Audio 2.0
13. 1440x900,Stereo Audio 2.0
14. 1360x768,Stereo Audio 2.0
15. 1280x1024,Stereo Audio 2.0
16. 1024x768,Stereo Audio 2.0
17. 720p,Stereo Audio 2.0
18. Copy from HDMI out

---

## AUDIO SETTINGS

### Read Commands (r)
| Command | Function | Example | Response |
|---------|----------|---------|----------|
| `r output audio!` | Get output audio source | `r output audio!` | `output audio: follow window 1 video source` |
| `r output audio vol!` | Get output audio volume | `r output audio vol!` | `output audio volume: 30` |
| `r output audio mute!` | Get output audio mute status | `r output audio mute!` | `output audio mute: off` |

### Set Commands (s)
| Command | Function | Parameters | Example | Response |
|---------|----------|------------|---------|----------|
| `s output audio x!` | Set output audio source | x=0-4 (see audio source options below) | `s output audio 0!` | `output audio: follow window 1 selected source` |
| `s output audio vol+!` | Increase audio volume | None | `s output audio vol+!` | `output audio volume: 50` |
| `s output audio vol-!` | Decrease audio volume | None | `s output audio vol-!` | `output audio volume: 50` |
| `s output audio vol x!` | Set audio volume | x=0-100 | `s output audio vol 30!` | `output audio volume: 30` |
| `s output audio mute x!` | Set audio mute | x=0 (mute off), x=1 (mute on) | `s output audio mute 0!` | `output audio mute: off` |

**Audio Source Options (x=0-4):**
- 0: Follow window 1 selected source
- 1: HDMI 1 input audio
- 2: HDMI 2 input audio
- 3: HDMI 3 input audio
- 4: HDMI 4 input audio

---

## SINGLE SCREEN MODE

### Read Commands (r)
| Command | Function | Example | Response |
|---------|----------|---------|----------|
| `r auto switch!` | Get auto switch feature status | `r auto switch!` | `auto switch off` |
| `r in source!` | Get selected input source | `r in source!` | `HDMI 1` |

### Set Commands (s)
| Command | Function | Parameters | Example | Response |
|---------|----------|------------|---------|----------|
| `s auto switch x!` | Enable/disable auto switch | x=0 (disable), x=1 (enable) | `s auto switch 0!` | `auto switch off` |
| `s in source x!` | Route input source to output | x=1-4 (HDMI 1-4) | `s in source 1!` | `HDMI 1` |

---

## MULTI-VIEWER MODE SETTINGS

### Read Commands (r)
| Command | Function | Example | Response |
|---------|----------|---------|----------|
| `r multiview!` | Get multi-viewer display mode | `r multiview!` | `single screen` |
| `r window x in!` | Get window's selected input | `r window 1 in!` | `window 1 select HDMI 1` |

### Set Commands (s)
| Command | Function | Parameters | Example | Response |
|---------|----------|------------|---------|----------|
| `s multiview x!` | Set multi-viewer display mode | x=1-5 (see multiview modes below) | `s multiview 1!` | `single screen` |
| `s window x in y!` | Select input for display window | x=1-4 (window), y=1-4 (HDMI input) | `s window 1 in 1!` | `window 1 select HDMI 1` |

**Multiview Mode Options (x=1-5):**
1. Single screen
2. PIP
3. PBP
4. Triple screen
5. Quad screen

---

## PIP (PICTURE-IN-PICTURE) SETTINGS

### Read Commands (r)
| Command | Function | Example | Response |
|---------|----------|---------|----------|
| `r PIP position!` | Get PIP window position | `r PIP position!` | `PIP on right top` |
| `r PIP size!` | Get PIP window size | `r PIP size!` | `PIP size: large` |

### Set Commands (s)
| Command | Function | Parameters | Example | Response |
|---------|----------|------------|---------|----------|
| `s PIP position x!` | Set PIP window position | x=1-4 (see PIP position options below) | `s PIP position 3!` | `PIP on right top` |
| `s PIP size x!` | Set PIP window size | x=1-3 (see PIP size options below) | `s PIP size 3!` | `PIP size: large` |

**PIP Position Options (x=1-4):**
1. Left Top
2. Left Bottom
3. Right Top
4. Right Bottom

**PIP Size Options (x=1-3):**
1. Small
2. Middle
3. Large

---

## PBP (PICTURE-BY-PICTURE) SETTINGS

### Read Commands (r)
| Command | Function | Example | Response |
|---------|----------|---------|----------|
| `r PBP mode!` | Get PBP display mode | `r PBP mode!` | `PBP mode 1` |
| `r PBP aspect!` | Get PBP aspect ratio | `r PBP aspect!` | `PBP aspect: full screen` |

### Set Commands (s)
| Command | Function | Parameters | Example | Response |
|---------|----------|------------|---------|----------|
| `s PBP mode x!` | Set PBP display mode | x=1-2 (PBP mode 1/2) | `s PBP mode 1!` | `PBP mode 1` |
| `s PBP aspect x!` | Set PBP aspect ratio | x=1 (full screen), x=2 (16:9) | `s PBP aspect 1!` | `PBP aspect: full screen` |

---

## TRIPLE SCREEN SETTINGS

### Read Commands (r)
| Command | Function | Example | Response |
|---------|----------|---------|----------|
| `r triple mode!` | Get triple display mode | `r triple mode!` | `triple mode 1` |
| `r triple aspect!` | Get triple aspect ratio | `r triple aspect!` | `triple aspect: full screen` |

### Set Commands (s)
| Command | Function | Parameters | Example | Response |
|---------|----------|------------|---------|----------|
| `s triple mode x!` | Set triple display mode | x=1-2 (triple mode 1/2) | `s triple mode 1!` | `triple mode 1` |
| `s triple aspect x!` | Set triple aspect ratio | x=1 (full screen), x=2 (16:9) | `s triple aspect 1!` | `triple aspect: full screen` |

---

## QUAD SCREEN SETTINGS

### Read Commands (r)
| Command | Function | Example | Response |
|---------|----------|---------|----------|
| `r quad mode!` | Get quad display mode | `r quad mode!` | `quad mode 1` |
| `r quad aspect!` | Get quad aspect ratio | `r quad aspect!` | `quad aspect: full screen` |

### Set Commands (s)
| Command | Function | Parameters | Example | Response |
|---------|----------|------------|---------|----------|
| `s quad mode x!` | Set quad display mode | x=1-2 (quad mode 1/2) | `s quad mode 1!` | `quad mode 1` |
| `s quad aspect x!` | Set quad aspect ratio | x=1 (full screen), x=2 (16:9) | `s quad aspect 1!` | `quad aspect: full screen` |

---

## NOTES
- All commands must end with `!` delimiter
- Parameter format: x = Parameter 1; y = Parameter 2
- Default baud rate is 115200
- Commands are case-sensitive
- Use a 3-pin phoenix connector cable to connect RS-232 port to PC