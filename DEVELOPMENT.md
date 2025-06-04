# Development & Production Management Guide

This guide explains how to manage both development and production versions of the Orei Control Panel application.

## 🏗️ Architecture Overview

### Environment Separation
```
Production Environment:
├── Location: /opt/orei-control
├── Branch: main
├── Port: 5000 (internal) → 80 (nginx proxy)
├── Service: systemd (orei-control.service)
└── Hardware: /dev/serial0 (GPIO)

Development Environment:
├── Location: ~/orei-control-dev
├── Branch: develop
├── Port: 8080 (direct access)
├── Service: Flask dev server
└── Hardware: /dev/ttyUSB0 (USB adapter)
```

### Branch Strategy
- **`main`** - Production-ready releases
- **`develop`** - Integration branch for features
- **`feature/*`** - Individual feature development
- **`hotfix/*`** - Critical production fixes

## 🚀 Quick Start

### Setup Development Environment
```bash
# In your current directory (where you're developing)
./dev-setup.sh
```

### Setup Production Environment
```bash
# On production system
./setup.sh
```

## 📋 Daily Development Workflow

### 1. Start New Feature
```bash
cd ~/orei-control-dev
./new-feature.sh my-awesome-feature
```

### 2. Develop & Test
```bash
# Start development server (auto-reloads on changes)
./start-dev.sh

# In another terminal, run tests
./test-dev.sh
```

### 3. Commit & Push Feature
```bash
git add .
git commit -m "Add awesome feature with improved functionality"
git push -u origin feature/my-awesome-feature
```

### 4. Create Pull Request
- Go to GitHub
- Create PR from `feature/my-awesome-feature` → `develop`
- Review and merge

### 5. Deploy to Production
```bash
# Test develop branch first
cd ~/orei-control-dev
git checkout develop
git pull origin develop
./start-dev.sh  # Test thoroughly

# Create release to main
git checkout main
git merge develop
git push origin main

# Deploy to production
./deploy-production.sh
```

## 🛠️ Available Scripts

### Development Scripts
| Script | Purpose |
|--------|---------|
| `dev-setup.sh` | Create complete dev environment |
| `start-dev.sh` | Start development server on port 8080 |
| `stop-dev.sh` | Stop development server |
| `test-dev.sh` | Run all development tests |
| `new-feature.sh` | Create new feature branch |

### Production Scripts
| Script | Purpose |
|--------|---------|
| `setup.sh` | Install production environment |
| `deploy-production.sh` | Safe production deployment |
| `check-status.sh` | Check production system status |
| `restart-service.sh` | Restart production service |
| `update-app.sh` | Update production app |

## 🔒 Safety Features

### Development Safety
- ✅ Separate directory and virtual environment
- ✅ Different port (8080 vs 80)
- ✅ Development-specific configuration
- ✅ Auto-reload for rapid iteration
- ✅ Non-destructive to production

### Production Safety
- ✅ Automatic backups before deployment
- ✅ Rollback capability on failure
- ✅ Service health checking
- ✅ Dependency conflict detection
- ✅ Zero-downtime deployment process

## 🎯 Deployment Strategies

### Option 1: Single Pi (Current Setup)
```
Development: ~/orei-control-dev (port 8080)
Production:  /opt/orei-control (port 80 via nginx)
```

**Pros:**
- Single device management
- Resource efficient
- Simple setup

**Cons:**
- Can't test and run production simultaneously
- Hardware conflicts possible

### Option 2: Dual Pi Setup (Recommended for Critical Use)
```
Pi 1: Production only (/opt/orei-control, main branch)
Pi 2: Development only (~/orei-control-dev, develop branch)
```

**Pros:**
- Zero production risk during development
- Parallel testing possible
- Real hardware testing without downtime

**Cons:**
- Requires additional hardware
- More complex synchronization

## 🧪 Testing Strategy

### Development Testing
```bash
./test-dev.sh
```
- Serial port communication test
- Roku discovery test
- Application startup test
- Syntax validation

### Production Testing
```bash
./check-status.sh
```
- Service status
- Network connectivity
- Hardware communication
- Application response

### Manual Testing Checklist
- [ ] Power control (on/off)
- [ ] Display mode changes
- [ ] Window input assignment
- [ ] Audio control and volume
- [ ] Roku device discovery
- [ ] Remote control functionality
- [ ] Theme switching
- [ ] Responsive design (mobile/tablet)

## 🔧 Configuration Management

### Development Config (`app_config_dev.json`)
```json
{
    "serial_port": "/dev/ttyUSB0",
    "debug_mode": true,
    "development": true
}
```

### Production Config (`app_config.json`)
```json
{
    "serial_port": "/dev/serial0"
}
```

## 🚨 Emergency Procedures

### Rollback Production
```bash
cd /opt/orei-control
./deploy-production.sh  # Will auto-rollback on failure

# Manual rollback
sudo systemctl stop orei-control.service
sudo cp -r /opt/orei-control-backups/backup_YYYYMMDD_HHMMSS/* /opt/orei-control/
sudo systemctl start orei-control.service
```

### Fix Development Issues
```bash
cd ~/orei-control-dev
git reset --hard origin/develop  # Reset to last known good state
./start-dev.sh
```

### Debug Production Issues
```bash
# Check service logs
sudo journalctl -u orei-control.service -f

# Check application logs
tail -f /opt/orei-control/gunicorn.log

# Test application response
curl -I http://localhost:5000
```

## 📈 Monitoring & Maintenance

### Daily Checks
- Check service status: `./check-status.sh`
- Monitor logs for errors
- Verify hardware connectivity

### Weekly Maintenance
- Clean old backups (automated in deploy script)
- Update system packages: `sudo apt update && sudo apt upgrade`
- Review development branch for pending features

### Monthly Tasks
- Full hardware testing
- Performance review
- Security updates
- Documentation updates

## 🎓 Best Practices

### Git Workflow
1. Always work in feature branches
2. Keep commits small and focused
3. Write descriptive commit messages
4. Test thoroughly before merging
5. Use pull requests for code review

### Development Safety
1. Never develop directly on main branch
2. Always test with hardware before production
3. Use development environment for experiments
4. Backup important configurations
5. Document breaking changes

### Production Deployment
1. Test in development first
2. Deploy during low-usage periods
3. Monitor immediately after deployment
4. Have rollback plan ready
5. Test all functionality post-deployment

## 📞 Troubleshooting

### Common Issues

**Development server won't start:**
```bash
pkill -f "python.*app.py"
pkill -f "gunicorn.*8080"
./start-dev.sh
```

**Production deployment fails:**
- Check backup directory exists
- Verify git repository is clean
- Check network connectivity
- Review service logs

**Serial port conflicts:**
- Use different ports for dev vs prod
- Check port permissions: `ls -la /dev/tty*`
- Add user to dialout group: `sudo usermod -a -G dialout $USER`

**Nginx proxy issues:**
- Check nginx configuration: `sudo nginx -t`
- Restart nginx: `sudo systemctl restart nginx`
- Verify gunicorn is on port 5000: `netstat -tlnp | grep 5000`

For more help, see the main README.md troubleshooting section. 