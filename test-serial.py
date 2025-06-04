#!/usr/bin/env python3
"""Test serial communication with Orei UHD-401MV device"""

import serial
import sys
import time
import os

def test_port(port):
    """Test serial communication on a specific port"""
    try:
        print(f"Testing {port}...")
        
        if not os.path.exists(port):
            print(f"  ❌ Port {port} does not exist")
            return False
            
        with serial.Serial(port, 115200, timeout=2) as ser:
            print(f"  ✅ Port opened successfully")
            
            # Clear any existing data
            ser.reset_input_buffer()
            ser.reset_output_buffer()
            
            # Test commands
            test_commands = [
                'r power!',
                'r multiview!', 
                'r output audio vol!'
            ]
            
            for cmd in test_commands:
                print(f"  → Sending: {cmd}")
                ser.write(cmd.encode('ascii'))
                time.sleep(0.2)
                
                response = ser.readline().decode('ascii', errors='ignore').strip()
                if response:
                    print(f"  ← Response: {response}")
                else:
                    print(f"  ← No response")
                
                time.sleep(0.3)  # Wait between commands
                
        return True
        
    except PermissionError:
        print(f"  ❌ Permission denied - try: sudo usermod -a -G dialout $USER")
        return False
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def main():
    """Main test function"""
    print("🔌 Testing Serial Communication with Orei UHD-401MV")
    print("=" * 50)
    
    # Default ports to test
    default_ports = ['/dev/serial0', '/dev/ttyUSB0', '/dev/ttyAMA0']
    
    # Use command line argument if provided
    if len(sys.argv) > 1:
        ports_to_test = [sys.argv[1]]
        print(f"Testing specific port: {sys.argv[1]}")
    else:
        ports_to_test = default_ports
        print("Testing common serial ports...")
    
    print()
    
    success = False
    for port in ports_to_test:
        if test_port(port):
            success = True
            print(f"✅ {port} is working!")
            break
        print()
    
    print("=" * 50)
    if success:
        print("✅ Serial communication is working")
        print("\n💡 Tips:")
        print("   - Make sure the Orei device is powered on")
        print("   - Check that RS-232 cable is properly connected")
        print("   - Try sending commands through the web interface")
    else:
        print("❌ No working serial ports found")
        print("\n🔧 Troubleshooting:")
        print("   - Check cable connections")
        print("   - Verify user is in dialout group: groups $USER")
        print("   - List available ports: ls -la /dev/tty* | grep -E '(USB|AMA|serial)'")
        print("   - Check boot config: grep enable_uart /boot/config.txt")
        print("   - Reboot may be required after enabling UART")
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main()) 