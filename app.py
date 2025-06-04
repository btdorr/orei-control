#!/usr/bin/env python3
"""
Orei UHD-404MV HDMI Multiviewer Control Server
Flask-based web application for RS-232 control
"""

import os
import json
import time
import threading
import logging
from datetime import datetime
from flask import Flask, request, jsonify
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
class Config:
    SERIAL_PORT = '/dev/serial0'  # Default Raspberry Pi serial port
    BAUD_RATE = 115200
    TIMEOUT = 2
    COMMAND_DELAY = 0.2  # Increased delay between commands
    
# Global variables
serial_port = None
serial_lock = threading.Lock()
command_history = []

class SerialManager:
    """Manages serial port communication with the Orei device"""
    
    def __init__(self, port=Config.SERIAL_PORT, baudrate=Config.BAUD_RATE):
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
                timeout=Config.TIMEOUT
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
                time.sleep(Config.COMMAND_DELAY)
                
                # Read response with improved timeout handling
                response_lines = []
                start_time = time.time()
                
                while (time.time() - start_time) < Config.TIMEOUT:
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
