#!/bin/bash
# Update the Orei Control Panel application

echo "📥 Updating Orei UHD-401MV Control Application..."

# Change to application directory
cd /opt/orei-control || {
    echo "❌ Could not change to /opt/orei-control directory"
    exit 1
}

# Backup current configuration
echo "💾 Backing up configuration..."
if [ -f roku_devices.json ]; then
    cp roku_devices.json roku_devices.json.backup
    echo "✅ Backed up roku_devices.json"
else
    echo "ℹ️  No configuration file to backup"
fi

# Stop the service
echo "🛑 Stopping service..."
sudo systemctl stop orei-control.service

# Update the code
echo "📡 Updating code from repository..."
if git status &>/dev/null; then
    # This is a git repository
    git fetch
    if git pull; then
        echo "✅ Code updated successfully"
    else
        echo "⚠️  Git pull failed - you may need to resolve conflicts manually"
    fi
else
    echo "⚠️  Not a git repository - manual update required"
fi

# Update Python dependencies
echo "📦 Updating Python dependencies..."
source venv/bin/activate || {
    echo "❌ Could not activate virtual environment"
    exit 1
}

pip install --upgrade pip
if pip install --upgrade -r requirements.txt; then
    echo "✅ Dependencies updated successfully"
else
    echo "❌ Failed to update dependencies"
    exit 1
fi

# Set permissions
echo "🔧 Setting permissions..."
chown -R $USER:$USER . 2>/dev/null || sudo chown -R $USER:$USER .
chmod +x *.py *.sh 2>/dev/null

# Restart the service
echo "🚀 Restarting service..."
sudo systemctl start orei-control.service

# Wait for startup
sleep 3

# Check status
echo ""
echo "=== Update Complete ==="
if sudo systemctl is-active --quiet orei-control.service; then
    echo "✅ Service is running after update"
    
    # Show version info if available
    if [ -f .git/HEAD ]; then
        COMMIT=$(git rev-parse --short HEAD 2>/dev/null)
        if [ -n "$COMMIT" ]; then
            echo "📌 Current commit: $COMMIT"
        fi
    fi
    
    # Show network access
    IP=$(hostname -I | cut -d' ' -f1 | xargs)
    if [ -n "$IP" ]; then
        echo "🌐 Web interface: http://$IP"
    fi
    
else
    echo "❌ Service failed to start after update"
    echo "Check logs with: sudo journalctl -u orei-control.service"
    exit 1
fi

echo ""
echo "💡 Run ./check-status.sh for detailed status information" 