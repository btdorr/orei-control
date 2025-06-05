#!/usr/bin/env python3
"""
Orei UHD-404MV HDMI Multiviewer Control Server
Flask-based web application for RS-232 control
"""

import json
import os
import time
import threading
import logging
import subprocess
import requests
import xml.etree.ElementTree as ET
from datetime import datetime
from flask import Flask, request, jsonify, render_template, send_from_directory
from flask_cors import CORS
import serial
import serial.tools.list_ports

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Configuration
APP_CONFIG_FILE = 'app_config.json'

class Config:
    def __init__(self):
        self.SERIAL_PORT = '/dev/serial0'  # Default Raspberry Pi serial port
        self.BAUD_RATE = 115200
        self.TIMEOUT = 2
        self.COMMAND_DELAY = 0.2  # Increased delay between commands
        self.load_config()
    
    def load_config(self):
        """Load configuration from file"""
        if os.path.exists(APP_CONFIG_FILE):
            try:
                with open(APP_CONFIG_FILE, 'r') as f:
                    config_data = json.load(f)
                    self.SERIAL_PORT = config_data.get('serial_port', self.SERIAL_PORT)
                    self.BAUD_RATE = config_data.get('baud_rate', self.BAUD_RATE)
                    logger.info(f"Loaded config: serial_port={self.SERIAL_PORT}, baud_rate={self.BAUD_RATE}")
            except (json.JSONDecodeError, IOError) as e:
                logger.warning(f"Failed to load config file: {e}")
    
    def save_config(self):
        """Save configuration to file"""
        try:
            config_data = {
                'serial_port': self.SERIAL_PORT,
                'baud_rate': self.BAUD_RATE
            }
            with open(APP_CONFIG_FILE, 'w') as f:
                json.dump(config_data, f, indent=2)
            logger.info(f"Saved config: {config_data}")
            return True
        except IOError as e:
            logger.error(f"Failed to save config file: {e}")
            return False

# Create global config instance
config = Config()

# Global variables
serial_port = None
serial_lock = threading.Lock()
command_history = []

# Roku device configuration file
ROKU_CONFIG_FILE = 'roku_devices.json'

# Load Roku device mappings
def load_roku_mappings():
    """Load Roku device mappings from JSON file"""
    if os.path.exists(ROKU_CONFIG_FILE):
        try:
            with open(ROKU_CONFIG_FILE, 'r') as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            pass
    return {}

# Save Roku device mappings
def save_roku_mappings(mappings):
    """Save Roku device mappings to JSON file"""
    try:
        with open(ROKU_CONFIG_FILE, 'w') as f:
            json.dump(mappings, f, indent=2)
        return True
    except IOError:
        return False

# Discover Roku devices on network
def discover_roku_devices():
    """Discover Roku devices using SSDP and network scanning"""
    devices = []
    logger.info("Starting Roku device discovery...")
    
    # Method 1: SSDP Discovery
    try:
        ssdp_request = (
            "M-SEARCH * HTTP/1.1\r\n"
            "HOST: 239.255.255.250:1900\r\n"
            "MAN: \"ssdp:discover\"\r\n"
            "ST: roku:ecp\r\n"
            "MX: 3\r\n\r\n"
        )
        
        # Use nc (netcat) to send SSDP discovery - try multiple netcat locations
        logger.info("Attempting SSDP discovery with netcat...")
        netcat_paths = ['/usr/bin/nc', '/bin/nc', '/usr/bin/netcat', 'nc']
        netcat_cmd = None
        
        for nc_path in netcat_paths:
            try:
                # Test if command exists
                result = subprocess.run([nc_path, '-h'], 
                                      capture_output=True, timeout=1)
                netcat_cmd = nc_path
                break
            except (FileNotFoundError, subprocess.TimeoutExpired):
                continue
        
        if netcat_cmd:
            result = subprocess.run([
                netcat_cmd, '-u', '-w', '3', 
                '239.255.255.250', '1900'
            ], input=ssdp_request, text=True, capture_output=True, timeout=5)
            
            if result.stdout:
                logger.info(f"SSDP response received: {len(result.stdout)} bytes")
                # Parse responses
                responses = result.stdout.split('\r\n\r\n')
                for response in responses:
                    if 'roku:ecp' in response and 'LOCATION:' in response:
                        for line in response.split('\r\n'):
                            if line.startswith('LOCATION:'):
                                location = line.split(':', 1)[1].strip()
                                logger.info(f"Found Roku location: {location}")
                                device_info = get_roku_device_info(location)
                                if device_info:
                                    devices.append(device_info)
                                    logger.info(f"Added Roku device: {device_info['name']} at {device_info['ip']}")
                                break
            else:
                logger.info("No SSDP responses received")
        else:
            logger.warning("Netcat command not found in any location")
            
    except (subprocess.TimeoutExpired, subprocess.CalledProcessError, FileNotFoundError) as e:
        logger.warning(f"SSDP discovery failed: {e}")
    
    # Method 2: Direct network scanning if no devices found
    if not devices:
        logger.info("SSDP discovery found no devices, trying network scan...")
        devices = scan_roku_devices_fallback()
    
    logger.info(f"Discovery completed. Found {len(devices)} Roku device(s)")
    return devices

# Fallback Roku discovery method
def scan_roku_devices_fallback():
    """Fallback method to scan for Roku devices"""
    devices = []
    logger.info("Starting network scan for Roku devices...")
    
    try:
        # Get local network range - try multiple ip command locations
        ip_paths = ['/usr/sbin/ip', '/sbin/ip', '/bin/ip', 'ip']
        ip_cmd = None
        
        for ip_path in ip_paths:
            try:
                # Test if command exists
                result = subprocess.run([ip_path, 'help'], 
                                      capture_output=True, timeout=1)
                ip_cmd = ip_path
                break
            except (FileNotFoundError, subprocess.TimeoutExpired):
                continue
        
        if ip_cmd:
            result = subprocess.run([ip_cmd, 'route', 'show', 'default'], 
                                  capture_output=True, text=True, timeout=5)
            if result.returncode == 0:
                # Extract gateway IP to determine network range
                gateway = result.stdout.split()[2] if len(result.stdout.split()) > 2 else None
                if gateway:
                    network_base = '.'.join(gateway.split('.')[:-1])
                    logger.info(f"Scanning network range: {network_base}.1-254")
                    
                    # Use threading for faster scanning
                    import threading
                    from concurrent.futures import ThreadPoolExecutor, as_completed
                    
                    def check_ip(ip):
                        return check_roku_device(ip)
                    
                    # Scan common IP range for Roku devices
                    with ThreadPoolExecutor(max_workers=20) as executor:
                        futures = []
                        for i in range(1, 255):
                            ip = f"{network_base}.{i}"
                            future = executor.submit(check_ip, ip)
                            futures.append(future)
                        
                        for future in as_completed(futures):
                            try:
                                device_info = future.result(timeout=1)
                                if device_info:
                                    devices.append(device_info)
                                    logger.info(f"Found Roku device via scan: {device_info['name']} at {device_info['ip']}")
                                    if len(devices) >= 10:  # Limit to prevent long scans
                                        break
                            except Exception as e:
                                continue
                else:
                    logger.warning("Could not determine network range from default route")
            else:
                logger.warning(f"ip route command failed: {result.stderr}")
        else:
            logger.warning("ip command not found, trying fallback method...")
            # Fallback: try common network ranges
            common_ranges = ['192.168.1', '192.168.0', '192.168.33', '10.0.0', '172.16.0']
            for network_base in common_ranges:
                logger.info(f"Trying network range: {network_base}.1-254")
                # Quick scan of first 50 IPs in each range
                for i in range(1, 51):
                    ip = f"{network_base}.{i}"
                    device_info = check_roku_device(ip)
                    if device_info:
                        devices.append(device_info)
                        logger.info(f"Found Roku device via fallback scan: {device_info['name']} at {device_info['ip']}")
                        # Continue scanning this range if we found something
                        for j in range(51, 255):
                            ip = f"{network_base}.{j}"
                            device_info = check_roku_device(ip)
                            if device_info:
                                devices.append(device_info)
                                logger.info(f"Found Roku device via fallback scan: {device_info['name']} at {device_info['ip']}")
                        break  # Found devices in this range, stop trying other ranges
                if devices:  # If we found devices, stop trying other ranges
                    break
                    
    except Exception as e:
        logger.error(f"Network scan failed: {e}")
    
    logger.info(f"Network scan completed. Found {len(devices)} device(s)")
    return devices

# Check if IP has Roku device
def check_roku_device(ip):
    """Check if given IP has a Roku device"""
    try:
        response = requests.get(f"http://{ip}:8060/", timeout=1)
        if response.status_code == 200 and 'roku' in response.text.lower():
            return get_roku_device_info(f"http://{ip}:8060/")
    except requests.exceptions.RequestException:
        pass
    return None

# Get Roku device information
def get_roku_device_info(location):
    """Get device information from Roku device"""
    try:
        # Extract IP from location URL
        ip = location.split('//')[1].split(':')[0]
        
        # Get device info
        response = requests.get(f"http://{ip}:8060/query/device-info", timeout=5)
        if response.status_code == 200:
            root = ET.fromstring(response.text)
            
            device_info = {
                'ip': ip,
                'name': 'Unknown Roku',
                'model': 'Unknown',
                'serial': 'Unknown'
            }
            
            # Parse device information
            for child in root:
                if child.tag == 'friendly-device-name':
                    device_info['name'] = child.text or 'Unknown Roku'
                elif child.tag == 'model-name':
                    device_info['model'] = child.text or 'Unknown'
                elif child.tag == 'serial-number':
                    device_info['serial'] = child.text or 'Unknown'
            
            return device_info
    except (requests.exceptions.RequestException, ET.ParseError):
        pass
    return None

# Serial port utilities
def get_available_serial_ports():
    """Get list of available serial ports"""
    ports = []
    
    # Add common Linux serial ports
    common_ports = [
        '/dev/serial0',   # Raspberry Pi GPIO
        '/dev/ttyAMA0',   # Raspberry Pi GPIO (alternative)
        '/dev/ttyS0',     # Standard serial port
    ]
    
    # Add USB serial ports
    for i in range(8):  # Check USB0 through USB7
        common_ports.append(f'/dev/ttyUSB{i}')
    
    # Check which ports actually exist
    for port in common_ports:
        if os.path.exists(port):
            try:
                # Try to get port info
                import serial.tools.list_ports
                port_info = next((p for p in serial.tools.list_ports.comports() if p.device == port), None)
                if port_info:
                    ports.append({
                        'device': port,
                        'description': port_info.description,
                        'manufacturer': getattr(port_info, 'manufacturer', 'Unknown')
                    })
                else:
                    # Port exists but no detailed info available
                    ports.append({
                        'device': port,
                        'description': f'Serial Port ({os.path.basename(port)})',
                        'manufacturer': 'Unknown'
                    })
            except:
                # Fallback if serial.tools.list_ports fails
                ports.append({
                    'device': port,
                    'description': f'Serial Port ({os.path.basename(port)})',
                    'manufacturer': 'Unknown'
                })
    
    return ports

# Send ECP command to Roku device
def send_roku_command(ip, command):
    """Send ECP command to Roku device"""
    try:
        url = f"http://{ip}:8060/keypress/{command}"
        response = requests.post(url, timeout=5)
        return response.status_code == 200
    except requests.exceptions.RequestException:
        return False

# Launch Roku app
def launch_roku_app(ip, app_id):
    """Launch specific app on Roku device"""
    try:
        url = f"http://{ip}:8060/launch/{app_id}"
        response = requests.post(url, timeout=5)
        return response.status_code == 200
    except requests.exceptions.RequestException:
        return False

# Get Roku apps
def get_roku_apps(ip):
    """Get list of installed apps on Roku device"""
    try:
        response = requests.get(f"http://{ip}:8060/query/apps", timeout=5)
        if response.status_code == 200:
            root = ET.fromstring(response.text)
            apps = []
            for app in root.findall('app'):
                apps.append({
                    'id': app.get('id'),
                    'name': app.text,
                    'type': app.get('type', 'appl')
                })
            return apps
    except (requests.exceptions.RequestException, ET.ParseError):
        pass
    return []

class SerialManager:
    """Manages serial port communication with the Orei device"""
    
    def __init__(self, port=config.SERIAL_PORT, baudrate=config.BAUD_RATE):
        self.port = port
        self.baudrate = baudrate
        self.serial_port = None
        self.connected = False
        
    def connect(self):
        """Establish serial connection"""
        try:
            self.serial_port = serial.Serial(
                port=self.port,
                baudrate=self.baudrate,
                bytesize=serial.EIGHTBITS,
                parity=serial.PARITY_NONE,
                stopbits=serial.STOPBITS_ONE,
                timeout=config.TIMEOUT
            )
            self.connected = True
            logger.info(f"Connected to serial port {self.port} at {self.baudrate} baud")
            return True
        except Exception as e:
            logger.error(f"Failed to connect to serial port: {e}")
            self.connected = False
            return False
            
    def disconnect(self):
        """Close serial connection"""
        if self.serial_port and self.serial_port.is_open:
            self.serial_port.close()
            self.connected = False
            logger.info("Disconnected from serial port")
            
    def send_command(self, command):
        """Send command to device and return response"""
        if not self.connected:
            if not self.connect():
                return None, "Serial port not connected"
                
        # Ensure command ends with !
        if not command.endswith('!'):
            command += '!'
            
        try:
            with serial_lock:
                # Clear input buffer
                self.serial_port.reset_input_buffer()
                
                # Send command
                self.serial_port.write(command.encode('ascii'))
                logger.debug(f"Sent command: {command}")
                
                # Wait for response
                time.sleep(config.COMMAND_DELAY)
                
                # Read response with improved timeout handling
                response_lines = []
                start_time = time.time()
                
                while (time.time() - start_time) < config.TIMEOUT:
                    if self.serial_port.in_waiting:
                        try:
                            line = self.serial_port.readline().decode('ascii', errors='ignore').strip()
                            if line:
                                response_lines.append(line)
                                # Check for command completion indicators
                                if any(keyword in line.lower() for keyword in 
                                       ['on', 'off', 'hdmi', 'mode', 'screen', 'finished', 'ok']):
                                    break
                        except:
                            break
                    else:
                        time.sleep(0.01)
                
                response = ' '.join(response_lines) if response_lines else "No response"
                
                # Log command and response
                self._log_command(command, response)
                
                return response, None
                
        except Exception as e:
            error_msg = f"Serial communication error: {str(e)}"
            logger.error(error_msg)
            self.connected = False
            return None, error_msg
            
    def update_port(self, new_port):
        """Update the serial port and reconnect"""
        try:
            # Disconnect from current port
            self.disconnect()
            
            # Update port
            self.port = new_port
            
            # Try to reconnect
            success = self.connect()
            logger.info(f"Updated serial port to {new_port}, connection {'successful' if success else 'failed'}")
            return success
        except Exception as e:
            logger.error(f"Failed to update serial port: {e}")
            return False
            
    def _log_command(self, command, response):
        """Log command to history"""
        global command_history
        entry = {
            'timestamp': datetime.now().strftime('%H:%M:%S'),
            'command': command,
            'response': response if response != "No response" else "No response"
        }
        command_history.append(entry)
        # Keep only last 50 commands
        if len(command_history) > 50:
            command_history.pop(0)

# Initialize serial manager
serial_manager = SerialManager()

# Routes
@app.route('/')
def index():
    with open('static/index.html', 'r') as f:
        return f.read()

@app.route('/api/command', methods=['POST'])
def send_command():
    """Send RS-232 command to device"""
    try:
        data = request.get_json()
        command = data.get('command', '').strip()
        
        if not command:
            return jsonify({
                'success': False,
                'error': 'No command provided'
            }), 400
            
        response, error = serial_manager.send_command(command)
        
        if error:
            return jsonify({
                'success': False,
                'error': error
            }), 500
            
        return jsonify({
            'success': True,
            'command': command,
            'response': response
        })
        
    except Exception as e:
        logger.error(f"Error processing command: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/status', methods=['GET'])
def get_status():
    """Get current system status"""
    try:
        # Try to get power status
        response, error = serial_manager.send_command('r power!')
        power_on = False
        if response and 'power on' in response.lower():
            power_on = True
            
        return jsonify({
            'success': True,
            'connected': serial_manager.connected,
            'port': serial_manager.port,
            'power_on': power_on
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/history', methods=['GET'])
def get_history():
    """Get command history"""
    try:
        limit = min(request.args.get('limit', 25, type=int), 50)
        history = command_history[-limit:] if limit else command_history
        
        return jsonify({
            'success': True,
            'count': len(history),
            'history': history
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/history', methods=['DELETE'])
def clear_history():
    """Clear command history"""
    global command_history
    command_history = []
    return jsonify({
        'success': True,
        'message': 'Command history cleared'
    })

# Configuration API endpoints
@app.route('/api/config/serial', methods=['GET'])
def get_serial_config():
    """Get current serial port configuration"""
    try:
        available_ports = get_available_serial_ports()
        return jsonify({
            'success': True,
            'current_port': config.SERIAL_PORT,
            'connected': serial_manager.connected,
            'available_ports': available_ports
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/config/serial', methods=['POST'])
def set_serial_config():
    """Set serial port configuration"""
    try:
        data = request.get_json()
        new_port = data.get('port', '').strip()
        
        if not new_port:
            return jsonify({
                'success': False,
                'error': 'Serial port is required'
            }), 400
        
        # Check if port exists
        if not os.path.exists(new_port):
            return jsonify({
                'success': False,
                'error': f'Serial port {new_port} does not exist'
            }), 400
        
        # Update configuration
        config.SERIAL_PORT = new_port
        
        # Save configuration to file
        if not config.save_config():
            return jsonify({
                'success': False,
                'error': 'Failed to save configuration'
            }), 500
        
        # Update serial manager
        connection_success = serial_manager.update_port(new_port)
        
        return jsonify({
            'success': True,
            'message': f'Serial port updated to {new_port}',
            'connected': connection_success,
            'port': new_port
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# Roku API endpoints
@app.route('/api/roku/discover', methods=['GET'])
def roku_discover():
    """Discover Roku devices on network"""
    try:
        devices = discover_roku_devices()
        return jsonify({
            'success': True,
            'devices': devices
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/roku/mappings', methods=['GET'])
def get_roku_mappings():
    """Get current Roku device mappings"""
    try:
        mappings = load_roku_mappings()
        return jsonify({
            'success': True,
            'mappings': mappings
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/roku/mappings', methods=['POST'])
def set_roku_mappings():
    """Set Roku device mappings"""
    try:
        data = request.get_json()
        mappings = data.get('mappings', {})
        
        if save_roku_mappings(mappings):
            return jsonify({
                'success': True,
                'message': 'Roku mappings saved successfully'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to save mappings'
            }), 500
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/roku/command', methods=['POST'])
def roku_command():
    """Send command to Roku device"""
    try:
        data = request.get_json()
        hdmi_input = data.get('hdmi')
        command = data.get('command')
        
        if not hdmi_input or not command:
            return jsonify({
                'success': False,
                'error': 'HDMI input and command are required'
            }), 400
        
        # Load mappings to get IP for HDMI input
        mappings = load_roku_mappings()
        device_info = mappings.get(str(hdmi_input))
        
        if not device_info:
            return jsonify({
                'success': False,
                'error': f'No Roku device mapped to HDMI {hdmi_input}'
            }), 404
        
        ip = device_info.get('ip')
        if not ip:
            return jsonify({
                'success': False,
                'error': 'Invalid device mapping'
            }), 400
        
        # Send command
        success = send_roku_command(ip, command)
        
        return jsonify({
            'success': success,
            'message': f'Command {command} sent to HDMI {hdmi_input}' if success else 'Failed to send command'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/roku/apps/<int:hdmi>', methods=['GET'])
def get_roku_device_apps(hdmi):
    """Get apps for Roku device on specific HDMI input"""
    try:
        mappings = load_roku_mappings()
        device_info = mappings.get(str(hdmi))
        
        if not device_info:
            return jsonify({
                'success': False,
                'error': f'No Roku device mapped to HDMI {hdmi}'
            }), 404
        
        ip = device_info.get('ip')
        if not ip:
            return jsonify({
                'success': False,
                'error': 'Invalid device mapping'
            }), 400
        
        apps = get_roku_apps(ip)
        
        return jsonify({
            'success': True,
            'apps': apps
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/roku/launch', methods=['POST'])
def roku_launch_app():
    """Launch app on Roku device"""
    try:
        data = request.get_json()
        hdmi_input = data.get('hdmi')
        app_id = data.get('app_id')
        
        if not hdmi_input or not app_id:
            return jsonify({
                'success': False,
                'error': 'HDMI input and app_id are required'
            }), 400
        
        mappings = load_roku_mappings()
        device_info = mappings.get(str(hdmi_input))
        
        if not device_info:
            return jsonify({
                'success': False,
                'error': f'No Roku device mapped to HDMI {hdmi_input}'
            }), 404
        
        ip = device_info.get('ip')
        success = launch_roku_app(ip, app_id)
        
        return jsonify({
            'success': success,
            'message': f'App launched on HDMI {hdmi_input}' if success else 'Failed to launch app'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# System Management API endpoint
@app.route('/api/system/shutdown', methods=['POST'])
def system_shutdown():
    """Shutdown the Raspberry Pi system"""
    try:
        data = request.get_json()
        confirmation = data.get('confirmed', False)
        
        if not confirmation:
            return jsonify({
                'success': False,
                'error': 'Shutdown confirmation required'
            }), 400
        
        # Log the shutdown request
        logger.warning("System shutdown requested via web interface")
        
        # Send shutdown command with a 1-minute delay to allow response
        subprocess.Popen(['/usr/bin/sudo', '/usr/sbin/shutdown', '-h', '+1', 'Shutdown requested from Orei Control Panel'])
        
        return jsonify({
            'success': True,
            'message': 'System shutdown initiated. The device will power off in 1 minute.',
            'countdown': 60
        })
        
    except Exception as e:
        logger.error(f"Failed to initiate system shutdown: {e}")
        return jsonify({
            'success': False,
            'error': f'Failed to initiate shutdown: {str(e)}'
        }), 500

@app.route('/api/system/shutdown/cancel', methods=['POST'])
def cancel_shutdown():
    """Cancel a pending system shutdown"""
    try:
        # Cancel any pending shutdown
        subprocess.run(['/usr/bin/sudo', '/usr/sbin/shutdown', '-c'], check=True)
        
        logger.info("System shutdown cancelled via web interface")
        
        return jsonify({
            'success': True,
            'message': 'System shutdown cancelled'
        })
        
    except subprocess.CalledProcessError as e:
        return jsonify({
            'success': False,
            'error': 'No pending shutdown to cancel'
        }), 400
    except Exception as e:
        logger.error(f"Failed to cancel system shutdown: {e}")
        return jsonify({
            'success': False,
            'error': f'Failed to cancel shutdown: {str(e)}'
        }), 500

@app.route('/api/system/restart', methods=['POST'])
def system_restart():
    """Restart the Raspberry Pi system"""
    try:
        data = request.get_json()
        confirmation = data.get('confirmed', False)
        
        if not confirmation:
            return jsonify({
                'success': False,
                'error': 'Restart confirmation required'
            }), 400
        
        # Log the restart request
        logger.warning("System restart requested via web interface")
        
        # Send restart command with a 1-minute delay to allow response
        subprocess.Popen(['/usr/bin/sudo', '/usr/sbin/shutdown', '-r', '+1', 'Restart requested from Orei Control Panel'])
        
        return jsonify({
            'success': True,
            'message': 'System restart initiated. The device will restart in 1 minute.',
            'countdown': 60
        })
        
    except Exception as e:
        logger.error(f"Failed to initiate system restart: {e}")
        return jsonify({
            'success': False,
            'error': f'Failed to initiate restart: {str(e)}'
        }), 500

@app.route('/api/system/restart/cancel', methods=['POST'])
def cancel_restart():
    """Cancel a pending system restart"""
    try:
        # Cancel any pending restart (same as shutdown cancel)
        subprocess.run(['/usr/bin/sudo', '/usr/sbin/shutdown', '-c'], check=True)
        
        logger.info("System restart cancelled via web interface")
        
        return jsonify({
            'success': True,
            'message': 'System restart cancelled'
        })
        
    except subprocess.CalledProcessError as e:
        return jsonify({
            'success': False,
            'error': 'No pending restart to cancel'
        }), 400
    except Exception as e:
        logger.error(f"Failed to cancel system restart: {e}")
        return jsonify({
            'success': False,
            'error': f'Failed to cancel restart: {str(e)}'
        }), 500

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'success': False,
        'error': 'Endpoint not found'
    }), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        'success': False,
        'error': 'Internal server error'
    }), 500

def main():
    """Main entry point"""
    # Try to connect to serial port on startup
    if serial_manager.connect():
        logger.info("Successfully connected to Orei device")
    else:
        logger.warning("Could not connect to serial port on startup")
        
    # Run Flask app
    app.run(
        host='0.0.0.0',  # Allow external connections
        port=5000,
        debug=False  # Disable debug mode for production
    )

if __name__ == '__main__':
    main()
