#!/bin/bash
# Restart the Orei Control Panel service and show status

echo "🔄 Restarting Orei UHD-401MV Control Service..."

# Stop the service
echo "Stopping service..."
sudo systemctl stop orei-control.service

# Wait a moment
sleep 2

# Start the service
echo "Starting service..."
sudo systemctl start orei-control.service

# Wait for startup
echo "Waiting for service to initialize..."
sleep 3

# Show status
echo ""
echo "=== Service Status ==="
if sudo systemctl is-active --quiet orei-control.service; then
    echo "✅ Service restarted successfully"
    sudo systemctl status orei-control.service --no-pager | head -10
else
    echo "❌ Service failed to start"
    sudo systemctl status orei-control.service --no-pager
fi

echo ""
echo "=== Recent Logs ==="
sudo journalctl -u orei-control.service -n 5 --no-pager

echo ""
echo "=== Network Access ==="
IP=$(hostname -I | cut -d' ' -f1 | xargs)
if [ -n "$IP" ]; then
    echo "🌐 Web interface should be available at: http://$IP"
else
    echo "⚠️  Could not determine IP address"
fi 