#!/bin/bash

# Production Deployment Script for Orei Control Panel
# This script safely deploys the main branch to production

set -e  # Exit on any error

APP_DIR="/opt/orei-control"
SERVICE_NAME="orei-control.service"
BACKUP_DIR="/opt/orei-control-backups"

echo "🚀 Starting Production Deployment..."
echo "======================================"

# Check if running as correct user
if [ "$USER" != "dorrway" ]; then
    echo "❌ This script should be run as user 'dorrway'"
    exit 1
fi

# Create backup directory
sudo mkdir -p "$BACKUP_DIR"

# Function to create backup
create_backup() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_name="backup_${timestamp}"
    
    echo "📦 Creating backup: $backup_name"
    sudo cp -r "$APP_DIR" "${BACKUP_DIR}/${backup_name}"
    echo "✅ Backup created at ${BACKUP_DIR}/${backup_name}"
}

# Function to rollback
rollback() {
    echo "🔄 Rolling back to previous version..."
    local latest_backup=$(sudo ls -t "$BACKUP_DIR" | head -1)
    if [ -n "$latest_backup" ]; then
        sudo systemctl stop "$SERVICE_NAME"
        sudo rm -rf "$APP_DIR"
        sudo cp -r "${BACKUP_DIR}/${latest_backup}" "$APP_DIR"
        sudo chown -R dorrway:dorrway "$APP_DIR"
        sudo systemctl start "$SERVICE_NAME"
        echo "✅ Rollback completed"
    else
        echo "❌ No backup found for rollback"
        exit 1
    fi
}

# Check if we're in production directory
if [ ! -d "$APP_DIR" ]; then
    echo "❌ Production directory $APP_DIR not found"
    echo "   Run setup.sh first to install production environment"
    exit 1
fi

# Check service status before deployment
if ! sudo systemctl is-active --quiet "$SERVICE_NAME"; then
    echo "⚠️  Service $SERVICE_NAME is not running"
    read -p "Continue with deployment? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Create backup
create_backup

# Change to production directory
cd "$APP_DIR"

# Check current branch
current_branch=$(git branch --show-current)
echo "📋 Current branch: $current_branch"

# Fetch latest changes
echo "📥 Fetching latest changes..."
git fetch origin

# Check if main branch has updates
if git diff --quiet HEAD origin/main; then
    echo "ℹ️  No updates available on main branch"
    read -p "Continue deployment anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "✅ Deployment cancelled - no changes needed"
        exit 0
    fi
fi

# Switch to main branch and pull latest
echo "🔄 Switching to main branch..."
git checkout main
git pull origin main

# Check if there are any new dependencies
if git diff HEAD~1 requirements.txt --quiet; then
    echo "📦 No new Python dependencies"
else
    echo "📦 Installing updated Python dependencies..."
    source venv/bin/activate
    pip install -r requirements.txt
fi

# Stop service for update
echo "⏹️  Stopping service..."
sudo systemctl stop "$SERVICE_NAME"

# Start service
echo "▶️  Starting service..."
sudo systemctl start "$SERVICE_NAME"

# Wait a moment for service to start
sleep 3

# Check if service started successfully
if sudo systemctl is-active --quiet "$SERVICE_NAME"; then
    echo "✅ Service started successfully"
    
    # Test if application is responding
    echo "🧪 Testing application response..."
    if curl -f -s http://localhost:5000 > /dev/null; then
        echo "✅ Application is responding correctly"
        echo ""
        echo "🎉 Production Deployment Successful!"
        echo "======================================"
        echo "📊 Status:"
        echo "   Branch: $(git branch --show-current)"
        echo "   Commit: $(git rev-parse --short HEAD)"
        echo "   Service: ✅ Running"
        echo "   URL: http://$(hostname -I | cut -d' ' -f1)"
        echo ""
        
        # Clean up old backups (keep last 5)
        echo "🧹 Cleaning up old backups..."
        sudo find "$BACKUP_DIR" -type d -name "backup_*" | sort -r | tail -n +6 | sudo xargs rm -rf
        echo "✅ Kept last 5 backups"
        
    else
        echo "❌ Application not responding - rolling back..."
        rollback
        exit 1
    fi
else
    echo "❌ Service failed to start - rolling back..."
    rollback
    exit 1
fi

echo ""
echo "💡 Next steps:"
echo "   - Monitor logs: sudo journalctl -u $SERVICE_NAME -f"
echo "   - Check status: ./check-status.sh"
echo "   - Test functionality with actual hardware" 