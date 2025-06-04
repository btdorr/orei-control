#!/usr/bin/env python3
"""Test Roku device discovery functionality"""

import subprocess
import socket
import time
import sys
import requests

def test_required_tools():
    """Test if required tools are available"""
    print("🔧 Testing required tools...")
    
    tools = {
        'nmap': ['nmap', '--version'],
        'netcat': ['nc', '-h'],
        'curl': ['curl', '--version']
    }
    
    all_available = True
    for name, cmd in tools.items():
        try:
            result = subprocess.run(cmd, capture_output=True, timeout=3)
            if result.returncode == 0:
                print(f"  ✅ {name} available")
            else:
                print(f"  ❌ {name} not working properly")
                all_available = False
        except FileNotFoundError:
            print(f"  ❌ {name} not installed")
            all_available = False
        except subprocess.TimeoutExpired:
            print(f"  ⚠️  {name} timeout")
            all_available = False
    
    return all_available

def test_ssdp_discovery():
    """Test SSDP multicast discovery for Roku devices"""
    print("\n📡 Testing SSDP discovery...")
    
    try:
        # SSDP M-SEARCH message for Roku devices
        message = (
            'M-SEARCH * HTTP/1.1\r\n'
            'HOST: 239.255.255.250:1900\r\n'
            'MAN: "ssdp:discover"\r\n'
            'ST: roku:ecp\r\n'
            'MX: 3\r\n\r\n'
        )
        
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        sock.settimeout(3)
        
        # Send multicast message
        sock.sendto(message.encode(), ('239.255.255.250', 1900))
        print("  → SSDP multicast sent")
        
        devices_found = []
        start_time = time.time()
        
        while time.time() - start_time < 3:
            try:
                response, addr = sock.recvfrom(4096)
                response_str = response.decode('utf-8', errors='ignore')
                
                if 'roku:ecp' in response_str.lower():
                    ip = addr[0]
                    if ip not in devices_found:
                        devices_found.append(ip)
                        print(f"  📺 Found Roku device at {ip}")
                        
            except socket.timeout:
                break
        
        sock.close()
        
        if not devices_found:
            print("  ℹ️  No Roku devices found via SSDP")
        
        return devices_found
        
    except Exception as e:
        print(f"  ❌ SSDP discovery failed: {e}")
        return []

def test_network_scan():
    """Test network scanning for Roku devices"""
    print("\n🌐 Testing network scanning...")
    
    try:
        # Get network range
        result = subprocess.run(['ip', 'route'], capture_output=True, text=True)
        network = None
        
        for line in result.stdout.split('\n'):
            if 'scope link' in line and not line.startswith('169.254'):
                network = line.split()[0]
                break
        
        if not network:
            print("  ❌ Could not determine network range")
            return []
        
        print(f"  → Scanning network: {network}")
        
        # Use nmap to scan for port 8060 (Roku ECP)
        cmd = ['nmap', '-p', '8060', '--open', '--host-timeout', '2s', network]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        
        devices_found = []
        current_ip = None
        
        for line in result.stdout.split('\n'):
            if 'Nmap scan report for' in line:
                current_ip = line.split()[-1].strip('()')
            elif '8060/tcp open' in line and current_ip:
                devices_found.append(current_ip)
                print(f"  📺 Found device with port 8060 open: {current_ip}")
                current_ip = None
        
        if not devices_found:
            print("  ℹ️  No devices found with port 8060 open")
            
        return devices_found
        
    except subprocess.TimeoutExpired:
        print("  ⚠️  Network scan timed out")
        return []
    except Exception as e:
        print(f"  ❌ Network scan failed: {e}")
        return []

def test_roku_device_info(ip):
    """Test getting device info from a Roku device"""
    try:
        url = f'http://{ip}:8060/query/device-info'
        response = requests.get(url, timeout=3)
        
        if response.status_code == 200:
            # Simple XML parsing for device name
            xml_content = response.text
            name = "Unknown Roku Device"
            
            if '<friendly-device-name>' in xml_content:
                start = xml_content.find('<friendly-device-name>') + len('<friendly-device-name>')
                end = xml_content.find('</friendly-device-name>')
                name = xml_content[start:end]
            elif '<user-device-name>' in xml_content:
                start = xml_content.find('<user-device-name>') + len('<user-device-name>')
                end = xml_content.find('</user-device-name>')
                name = xml_content[start:end]
            
            print(f"  📺 Device info: {name} ({ip})")
            return {'name': name, 'ip': ip}
        else:
            print(f"  ❌ HTTP {response.status_code} from {ip}")
            return None
            
    except requests.exceptions.RequestException as e:
        print(f"  ❌ Failed to get info from {ip}: {e}")
        return None

def main():
    """Main test function"""
    print("📺 Testing Roku Device Discovery")
    print("=" * 40)
    
    # Test required tools
    tools_ok = test_required_tools()
    
    if not tools_ok:
        print("\n❌ Some required tools are missing")
        print("Install with: sudo apt install nmap netcat-openbsd curl")
        return 1
    
    # Test SSDP discovery
    ssdp_devices = test_ssdp_discovery()
    
    # Test network scanning
    scan_devices = test_network_scan()
    
    # Combine results and remove duplicates
    all_devices = list(set(ssdp_devices + scan_devices))
    
    if all_devices:
        print(f"\n🎉 Found {len(all_devices)} device(s) total")
        print("\n🔍 Getting device information...")
        
        devices_info = []
        for ip in all_devices:
            info = test_roku_device_info(ip)
            if info:
                devices_info.append(info)
        
        print("\n" + "=" * 40)
        print("📋 Discovery Summary:")
        print(f"   SSDP found: {len(ssdp_devices)} device(s)")
        print(f"   Network scan found: {len(scan_devices)} device(s)")
        print(f"   Total unique devices: {len(all_devices)}")
        
        if devices_info:
            print("\n📺 Discovered Roku Devices:")
            for device in devices_info:
                print(f"   • {device['name']} - {device['ip']}")
        
        print("\n💡 These devices should appear in the web interface discovery")
        return 0
        
    else:
        print("\n❌ No Roku devices found")
        print("\n🔧 Troubleshooting:")
        print("   - Make sure Roku devices are powered on and connected to network")
        print("   - Check that devices are on the same subnet as this Pi")
        print("   - Verify router allows multicast traffic")
        print("   - Try manual check: curl http://ROKU_IP:8060/query/device-info")
        return 1

if __name__ == "__main__":
    sys.exit(main()) 