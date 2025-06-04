#!/bin/bash
# Check Orei Control Panel service status and system information

echo "🔍 Orei UHD-401MV Control Panel Status Check"
echo "=" * 50

echo "=== Service Status ==="
if sudo systemctl is-active --quiet orei-control.service; then
    echo "✅ orei-control.service is running"
    sudo systemctl status orei-control.service --no-pager | head -15
else
    echo "❌ orei-control.service is not running"
    sudo systemctl status orei-control.service --no-pager | head -10
fi

echo ""
echo "=== Network Access ==="
IP=$(hostname -I | cut -d' ' -f1 | xargs)
if [ -n "$IP" ]; then
    echo "🌐 Web interface: http://$IP"
    echo "📱 Local access: http://localhost:5000"
else
    echo "⚠️  No IP address found"
fi

echo ""
echo "=== Serial Ports ==="
SERIAL_PORTS=$(ls /dev/serial* /dev/ttyS* /dev/ttyAMA* /dev/ttyUSB* 2>/dev/null)
if [ -n "$SERIAL_PORTS" ]; then
    echo "📡 Available serial ports:"
    ls -la /dev/serial* /dev/ttyS* /dev/ttyAMA* /dev/ttyUSB* 2>/dev/null | grep -v "No such file"
else
    echo "⚠️  No serial ports found"
fi

echo ""
echo "=== UART Configuration ==="
if grep -q "enable_uart=1" /boot/config.txt 2>/dev/null || grep -q "enable_uart=1" /boot/firmware/config.txt 2>/dev/null; then
    echo "✅ UART enabled in boot config"
else
    echo "❌ UART not enabled - run: echo 'enable_uart=1' | sudo tee -a /boot/config.txt"
fi

echo ""
echo "=== User Permissions ==="
if groups $USER | grep -q dialout; then
    echo "✅ User $USER is in dialout group"
else
    echo "❌ User $USER not in dialout group - run: sudo usermod -a -G dialout $USER"
fi

echo ""
echo "=== Nginx Status ==="
if sudo systemctl is-active --quiet nginx; then
    echo "✅ Nginx is running"
else
    echo "❌ Nginx is not running"
fi

echo ""
echo "=== Recent Logs ==="
echo "📋 Last 10 service log entries:"
sudo journalctl -u orei-control.service -n 10 --no-pager

echo ""
echo "=== Quick Tests ==="
echo "🔧 Run these commands for detailed testing:"
echo "   ./test-serial.py    - Test serial communication"
echo "   ./test-roku.py      - Test Roku discovery"
echo "   curl http://localhost:5000/api/status - Test API" 