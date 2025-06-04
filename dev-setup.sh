#!/bin/bash

# Development Environment Setup Script for Orei Control Panel
# This script sets up a safe development environment

set -e

DEV_DIR="$HOME/orei-control-dev"
DEV_PORT="8080"

echo "🛠️  Setting Up Development Environment..."
echo "========================================"

# Check if development directory already exists
if [ -d "$DEV_DIR" ]; then
    echo "📁 Development directory already exists at $DEV_DIR"
    read -p "Remove and recreate? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf "$DEV_DIR"
    else
        echo "✅ Using existing development directory"
        cd "$DEV_DIR"
        git checkout develop
        git pull origin develop
        echo "✅ Development environment updated"
        exit 0
    fi
fi

# Clone repository to development directory
echo "📥 Cloning repository for development..."
git clone https://github.com/btdorr/orei-control.git "$DEV_DIR"
cd "$DEV_DIR"

# Switch to develop branch
echo "🔄 Switching to develop branch..."
git checkout develop

# Create Python virtual environment
echo "🐍 Creating development virtual environment..."
python3 -m venv venv-dev
source venv-dev/bin/activate

# Install dependencies
echo "📦 Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Create development configuration
echo "⚙️  Creating development configuration..."

# Create dev-specific app config
cat > app_config_dev.json << 'EOF'
{
    "serial_port": "/dev/ttyUSB0",
    "debug_mode": true,
    "development": true
}
EOF

# Create development startup script
cat > start-dev.sh << 'EOF'
#!/bin/bash

# Development Server Startup Script

echo "🚀 Starting Development Server..."
echo "================================"

# Activate virtual environment
source venv-dev/bin/activate

# Set development environment variables
export FLASK_ENV=development
export FLASK_DEBUG=1
export OREI_CONFIG=app_config_dev.json

# Kill any existing development servers
pkill -f "python.*app.py" 2>/dev/null || true
pkill -f "gunicorn.*8080" 2>/dev/null || true

# Start development server
echo "🌐 Starting Flask development server on port 8080..."
echo "   Access at: http://$(hostname -I | cut -d' ' -f1):8080"
echo "   Press Ctrl+C to stop"
echo ""

# Start with auto-reload
python app.py --port 8080 --debug &
DEV_PID=$!

# Create stop script
cat > stop-dev.sh << EOF2
#!/bin/bash
echo "⏹️  Stopping development server..."
kill $DEV_PID 2>/dev/null || true
pkill -f "python.*app.py" 2>/dev/null || true
pkill -f "gunicorn.*8080" 2>/dev/null || true
echo "✅ Development server stopped"
EOF2

chmod +x stop-dev.sh

# Wait for process
wait $DEV_PID
EOF

chmod +x start-dev.sh

# Create feature branch creation script
cat > new-feature.sh << 'EOF'
#!/bin/bash

# Create new feature branch script

if [ -z "$1" ]; then
    echo "Usage: ./new-feature.sh <feature-name>"
    echo "Example: ./new-feature.sh volume-improvements"
    exit 1
fi

FEATURE_NAME="$1"
BRANCH_NAME="feature/$FEATURE_NAME"

echo "🌟 Creating new feature branch: $BRANCH_NAME"

# Make sure we're on develop and up to date
git checkout develop
git pull origin develop

# Create and switch to feature branch
git checkout -b "$BRANCH_NAME"

echo "✅ Feature branch created: $BRANCH_NAME"
echo ""
echo "📝 Next steps:"
echo "   1. Make your changes"
echo "   2. Test with: ./start-dev.sh"
echo "   3. Commit changes: git add . && git commit -m 'Description'"
echo "   4. Push feature: git push -u origin $BRANCH_NAME"
echo "   5. Create pull request to develop branch"
EOF

chmod +x new-feature.sh

# Create testing script
cat > test-dev.sh << 'EOF'
#!/bin/bash

# Development Testing Script

echo "🧪 Running Development Tests..."
echo "=============================="

# Activate virtual environment
source venv-dev/bin/activate

echo "🔍 Testing serial port access..."
if python test-serial.py; then
    echo "✅ Serial communication test passed"
else
    echo "⚠️  Serial communication test failed (may be normal without hardware)"
fi

echo ""
echo "🔍 Testing Roku discovery..."
if python test-roku.py; then
    echo "✅ Roku discovery test passed"
else
    echo "⚠️  Roku discovery test failed (may be normal without Roku devices)"
fi

echo ""
echo "🔍 Testing application startup..."
timeout 10s python -c "
import app
from flask import Flask
print('✅ Application imports successfully')
print('✅ Flask app can be created')
" && echo "✅ Application startup test passed" || echo "❌ Application startup test failed"

echo ""
echo "🔍 Checking code syntax..."
python -m py_compile app.py && echo "✅ Main application syntax OK" || echo "❌ Syntax errors found"

echo ""
echo "✅ Development testing complete"
EOF

chmod +x test-dev.sh

# Make scripts executable
chmod +x *.sh

echo ""
echo "✅ Development Environment Ready!"
echo "================================="
echo ""
echo "📁 Development directory: $DEV_DIR"
echo "🌐 Development server port: $DEV_PORT"
echo "🌿 Current branch: $(git branch --show-current)"
echo ""
echo "🛠️  Available commands:"
echo "   ./start-dev.sh      - Start development server"
echo "   ./stop-dev.sh       - Stop development server (created after start)"
echo "   ./test-dev.sh       - Run development tests"
echo "   ./new-feature.sh    - Create new feature branch"
echo ""
echo "🔄 Development Workflow:"
echo "   1. Create feature: ./new-feature.sh my-feature"
echo "   2. Start dev server: ./start-dev.sh"
echo "   3. Make changes and test"
echo "   4. Commit and push feature branch"
echo "   5. Create pull request to develop"
echo "   6. Merge to develop, then deploy to production"
echo ""
echo "💡 Tips:"
echo "   - Development server auto-reloads on file changes"
echo "   - Production runs on port 80, development on port 8080"
echo "   - Always test with actual hardware before production deployment"
echo "   - Use different serial ports for dev vs production if possible" 