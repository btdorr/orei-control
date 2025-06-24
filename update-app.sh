#!/bin/bash
# Update the Orei Control Panel application

# Set PATH to ensure commands are found
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

echo "📥 Updating Orei UHD-401MV Control Application..."

# Get the current directory (should be where the script is located)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR" || {
    echo "❌ Could not change to application directory: $SCRIPT_DIR"
    exit 1
}

echo "📂 Working in directory: $SCRIPT_DIR"

# Backup current configuration
echo "💾 Backing up configuration..."
if [ -f roku_devices.json ]; then
    cp roku_devices.json roku_devices.json.backup
    echo "✅ Backed up roku_devices.json"
else
    echo "ℹ️  No configuration file to backup"
fi

# Note: Service management not available in container environment
echo "ℹ️  Service management skipped (container environment)"

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

# Set permissions (where possible)
echo "🔧 Setting permissions..."
chmod +x *.py *.sh 2>/dev/null || echo "⚠️  Permission setting skipped"

# Service restart handled automatically by container orchestration
echo "ℹ️  Service restart handled automatically"

# Wait for changes to settle
sleep 2

# Check status
echo ""
echo "=== Update Complete ==="
echo "✅ Application updated successfully"

# Show version info if available
if [ -f .git/HEAD ]; then
    COMMIT=$(git rev-parse --short HEAD 2>/dev/null)
    if [ -n "$COMMIT" ]; then
        echo "📌 Current commit: $COMMIT"
    fi
fi

# Show network access
IP=$(hostname -I | cut -d' ' -f1 | head -n1)
if [ -n "$IP" ]; then
    echo "🌐 Web interface: http://$IP"
else
    echo "🌐 Web interface: http://localhost"
fi

echo ""
echo "💡 Run ./check-status.sh for detailed status information" 