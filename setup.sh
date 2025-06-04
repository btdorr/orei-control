#!/bin/bash
# Setup script for Orei UHD-401MV Control Application
# Run this script from within the application repository directory

echo "======================================"
echo "Orei UHD-401MV Control Setup Script"
echo "======================================"

# Check if we're in the right directory
if [ ! -f "app.py" ] || [ ! -f "requirements.txt" ]; then
    echo "❌ Error: This script must be run from the application repository directory"
    echo "   Make sure you're in the directory containing app.py and requirements.txt"
    exit 1
fi

# Check if running on Raspberry Pi
if [ ! -f /proc/device-tree/model ]; then
    echo "⚠️  Warning: This doesn't appear to be a Raspberry Pi"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Update system
echo "📦 Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y

# Install required packages
echo "📦 Installing required system packages..."
sudo apt-get install -y python3 python3-pip python3-venv nginx netcat-openbsd nmap

# Configure serial port on Raspberry Pi
echo "🔧 Configuring serial port..."
# Disable serial console
sudo systemctl stop serial-getty@ttyS0.service 2>/dev/null || true
sudo systemctl disable serial-getty@ttyS0.service 2>/dev/null || true

# Enable UART in boot config
BOOT_CONFIG="/boot/config.txt"
if [ -f "/boot/firmware/config.txt" ]; then
    BOOT_CONFIG="/boot/firmware/config.txt"
fi

if [ -f "$BOOT_CONFIG" ]; then
    if ! grep -q "enable_uart=1" "$BOOT_CONFIG"; then
        echo "enable_uart=1" | sudo tee -a "$BOOT_CONFIG"
        echo "✅ Serial port enabled in boot config"
        REBOOT_REQUIRED=true
    else
        echo "✅ Serial port already enabled"
    fi
else
    echo "⚠️  Could not find boot config file - serial port configuration may be needed manually"
fi

# Set up application in /opt/orei-control
APP_DIR="/opt/orei-control"
echo "📁 Setting up application directory at $APP_DIR..."

# Create directory and copy files
sudo mkdir -p "$APP_DIR"
sudo cp -r . "$APP_DIR/"
sudo chown -R $USER:$USER "$APP_DIR"

cd "$APP_DIR"

# Create Python virtual environment
echo "🐍 Creating Python virtual environment..."
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
echo "📦 Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Add user to dialout group for serial port access
echo "👤 Adding user to dialout group for serial port access..."
sudo usermod -a -G dialout $USER

# Create systemd service
echo "⚙️  Creating systemd service..."
sudo tee /etc/systemd/system/orei-control.service > /dev/null << EOF
[Unit]
Description=Orei UHD-401MV Control Service
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$APP_DIR
Environment="PATH=$APP_DIR/venv/bin"
ExecStart=$APP_DIR/venv/bin/gunicorn --bind 0.0.0.0:5000 --workers 2 --timeout 120 app:app
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Configure Nginx reverse proxy
echo "🌐 Configuring Nginx..."
sudo tee /etc/nginx/sites-available/orei-control > /dev/null << 'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    
    client_max_body_size 10M;
    
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
        proxy_connect_timeout 120s;
        proxy_send_timeout 120s;
    }
    
    # Static files optimization
    location /static/ {
        proxy_pass http://127.0.0.1:5000;
        expires 1h;
        add_header Cache-Control "public, no-transform";
    }
}
EOF

# Enable Nginx site
sudo ln -sf /etc/nginx/sites-available/orei-control /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test and restart Nginx
if sudo nginx -t; then
    sudo systemctl restart nginx
    echo "✅ Nginx configured successfully"
else
    echo "❌ Nginx configuration error"
    exit 1
fi

# Enable and start the service
echo "🚀 Starting services..."
sudo systemctl daemon-reload
sudo systemctl enable orei-control.service
sudo systemctl start orei-control.service

# Create utility scripts
echo "🛠️  Setting up utility scripts..."

# Make utility scripts executable (they are already in the repository)
chmod +x check-status.sh
chmod +x restart-service.sh 
chmod +x update-app.sh

# Make test scripts executable (they are already in the repository)
echo "🧪 Setting up test scripts..."
chmod +x test-serial.py
chmod +x test-roku.py

# Final status check
echo ""
echo "======================================"
echo "🎉 Installation Complete!"
echo "======================================"
echo ""

# Get IP address
IP_ADDRESS=$(hostname -I | cut -d' ' -f1 | xargs)
echo "🌐 Access the web interface at:"
echo "   http://$IP_ADDRESS"
echo ""

echo "🛠️  Utility commands:"
echo "   Check status:    ./check-status.sh"
echo "   Restart service: ./restart-service.sh"
echo "   Update app:      ./update-app.sh"
echo "   Test serial:     ./test-serial.py"
echo "   Test Roku:       ./test-roku.py"
echo "   View logs:       sudo journalctl -u orei-control.service -f"
echo ""

# Show current status
echo "📊 Current status:"
if sudo systemctl is-active --quiet orei-control.service; then
    echo "   ✅ Service is running"
else
    echo "   ❌ Service is not running"
    echo "   Check logs with: sudo journalctl -u orei-control.service"
fi

if sudo systemctl is-active --quiet nginx; then
    echo "   ✅ Nginx is running"
else
    echo "   ❌ Nginx is not running"
fi

# Check serial ports
if ls /dev/serial* /dev/ttyS* /dev/ttyAMA* /dev/ttyUSB* &>/dev/null; then
    echo "   ✅ Serial ports available"
else
    echo "   ⚠️  No serial ports found"
fi

if [ "$REBOOT_REQUIRED" = true ]; then
    echo ""
    echo "⚠️  REBOOT REQUIRED to enable serial port"
    echo "   Run: sudo reboot"
fi

echo ""
echo "📖 Next steps:"
echo "   1. Connect RS-232 cable to GPIO pins 8&10 (or USB adapter)"
echo "   2. Power on the Orei UHD-401MV device"  
echo "   3. Access the web interface and click 'Refresh'"
echo "   4. Configure Roku devices if needed"
echo ""
echo "💡 For troubleshooting, run: ./check-status.sh"
