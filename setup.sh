#!/bin/bash
# Setup script for Orei UHD-404MV Control Application
# Run this on your Raspberry Pi to install and configure the application

echo "======================================"
echo "Orei UHD-404MV Control Setup Script"
echo "======================================"

# Check if running on Raspberry Pi
if [ ! -f /proc/device-tree/model ]; then
    echo "Warning: This doesn't appear to be a Raspberry Pi"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Update system
echo "Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y

# Install required packages
echo "Installing required packages..."
sudo apt-get install -y python3 python3-pip python3-venv git nginx

# Enable serial port on Raspberry Pi
echo "Configuring serial port..."
# Disable serial console
sudo systemctl stop serial-getty@ttyS0.service
sudo systemctl disable serial-getty@ttyS0.service

# Enable serial port in boot config
if ! grep -q "enable_uart=1" /boot/config.txt; then
    echo "enable_uart=1" | sudo tee -a /boot/config.txt
    echo "Serial port enabled in boot config. Reboot required."
    REBOOT_REQUIRED=true
fi

# Create application directory
APP_DIR="/opt/orei-control"
echo "Creating application directory at $APP_DIR..."
sudo mkdir -p $APP_DIR
sudo chown $USER:$USER $APP_DIR

# Copy application files
echo "Setting up application files..."
cd $APP_DIR

# Create Python virtual environment
echo "Creating Python virtual environment..."
python3 -m venv venv
source venv/bin/activate

# Create requirements.txt
cat > requirements.txt << 'EOF'
Flask==3.0.0
flask-cors==4.0.0
pyserial==3.5
gunicorn==21.2.0
EOF

# Install Python dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt

# Create the Flask application file
echo "Creating Flask application..."
cat > app.py << 'PYTHON_EOF'
# [Insert the Flask application code here]
# This would be the content from the flask-rs232-backend artifact
PYTHON_EOF

# Create static directory and HTML file
mkdir -p static
cat > static/index.html << 'HTML_EOF'
# [Insert the HTML content here]
# This would be the content from the orei-multiviewer-app artifact
HTML_EOF

# Update Flask app to serve static files
cat >> app.py << 'PYTHON_EOF'

# Add route to serve the HTML interface
@app.route('/')
def index():
    """Serve the main HTML interface"""
    return app.send_static_file('index.html')
PYTHON_EOF

# Create systemd service
echo "Creating systemd service..."
sudo tee /etc/systemd/system/orei-control.service > /dev/null << EOF
[Unit]
Description=Orei HDMI Multiviewer Control Service
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$APP_DIR
Environment="PATH=$APP_DIR/venv/bin"
ExecStart=$APP_DIR/venv/bin/gunicorn --bind 0.0.0.0:5000 --workers 2 --timeout 120 app:app
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Configure Nginx
echo "Configuring Nginx..."
sudo tee /etc/nginx/sites-available/orei-control > /dev/null << 'EOF'
server {
    listen 80;
    server_name _;
    
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
        proxy_connect_timeout 120s;
    }
    
    location /api {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
        proxy_connect_timeout 120s;
    }
}
EOF

# Enable Nginx site
sudo ln -sf /etc/nginx/sites-available/orei-control /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx

# Add user to dialout group for serial port access
echo "Adding user to dialout group..."
sudo usermod -a -G dialout $USER

# Enable and start service
echo "Enabling and starting service..."
sudo systemctl daemon-reload
sudo systemctl enable orei-control.service
sudo systemctl start orei-control.service

# Create helper scripts
echo "Creating helper scripts..."

# Create status script
cat > check-status.sh << 'EOF'
#!/bin/bash
echo "Orei Control Service Status:"
sudo systemctl status orei-control.service
echo ""
echo "Serial Ports:"
ls -la /dev/serial* /dev/ttyS* /dev/ttyAMA* 2>/dev/null
echo ""
echo "Service Logs (last 20 lines):"
sudo journalctl -u orei-control.service -n 20
EOF
chmod +x check-status.sh

# Create restart script
cat > restart-service.sh << 'EOF'
#!/bin/bash
echo "Restarting Orei Control Service..."
sudo systemctl restart orei-control.service
echo "Service restarted. Checking status..."
sleep 2
sudo systemctl status orei-control.service
EOF
chmod +x restart-service.sh

# Create manual test script
cat > test-serial.py << 'EOF'
#!/usr/bin/env python3
import serial
import sys

try:
    port = sys.argv[1] if len(sys.argv) > 1 else '/dev/serial0'
    print(f"Testing serial port: {port}")
    
    with serial.Serial(port, 115200, timeout=2) as ser:
        print("Sending 'r power!' command...")
        ser.write(b'r power!')
        response = ser.readline().decode('ascii', errors='ignore').strip()
        print(f"Response: {response}")
        
except Exception as e:
    print(f"Error: {e}")
EOF
chmod +x test-serial.py

echo ""
echo "======================================"
echo "Installation Complete!"
echo "======================================"
echo ""
echo "The Orei Control application has been installed."
echo ""
echo "Access the web interface at: http://$(hostname -I | cut -d' ' -f1)"
echo ""
echo "Useful commands:"
echo "  - Check status: ./check-status.sh"
echo "  - Restart service: ./restart-service.sh"
echo "  - View logs: sudo journalctl -u orei-control.service -f"
echo "  - Test serial: ./test-serial.py"
echo ""

if [ "$REBOOT_REQUIRED" = true ]; then
    echo "IMPORTANT: A reboot is required to enable the serial port."
    echo "Please run: sudo reboot"
fi

echo ""
echo "Note: Make sure your RS-232 cable is connected to the GPIO serial pins"
echo "or USB-to-serial adapter before using the application."
