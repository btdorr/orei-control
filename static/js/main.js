// main.js - Main entry point for Orei Control Panel

import { ThemeManager } from './theme.js';
import { API } from './api.js';
import { DeviceControl, DeviceManager } from './device.js';
import { DisplayManager } from './display.js';
import { AudioControl } from './audio.js';
import { CommandHistory } from './commands.js';
import { Utils } from './utils.js';
import { RokuControl } from './roku.js';
import { SystemManager } from './system.js?v=20250605091045';

// Global application state
window.oreiApp = {
    currentMode: 1,
    selectedWindow: null,
    autoRefreshInterval: null,
    windowInputs: {1: 1, 2: 2, 3: 3, 4: 4}
};

// Load and display version information
async function loadVersionInfo() {
    try {
        console.log('Loading version info...');
        const response = await fetch('/api/version');
        console.log('Version API response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Version data received:', data);
        
        if (data.success && data.version) {
            const versionElement = document.getElementById('versionInfo');
            console.log('Version element found:', !!versionElement);
            if (versionElement) {
                versionElement.textContent = `(v${data.version.version})`;
                console.log('Version updated to:', data.version.version);
            }
        } else {
            throw new Error('Invalid version data received');
        }
    } catch (error) {
        console.error('Failed to load version info:', error);
        const versionElement = document.getElementById('versionInfo');
        if (versionElement) {
            versionElement.textContent = '(v1.0.0)';
        }
    }
}

// Initialize application
async function initialize() {
    try {
        // Load version information
        await loadVersionInfo();
        
        // Initialize theme system
        ThemeManager.init();
        
        // Initialize system management
        SystemManager.init();
        
        // Initialize command history
        CommandHistory.init();
        
        // Initialize display controls
        DisplayManager.init();
        
        // Initialize audio controls
        AudioControl.init();
        
        // Initialize Roku controls
        RokuControl.init();
        
        // Initialize device manager for configuration
        DeviceManager.init();
        
        // Initialize device control and check status
        await DeviceControl.initialize();
        
        // Set up auto-refresh every 305 seconds
        // DISABLED: Auto-refresh has been disabled per user request
        // window.oreiApp.autoRefreshInterval = setInterval(async () => {
        //     await DeviceControl.checkStatus();
        // }, 30000);
        
        console.log('Orei Control Panel initialized successfully');
    } catch (error) {
        console.error('Error initializing application:', error);
        Utils.showToast('Failed to initialize application', 'danger');
    }
}

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (window.oreiApp.autoRefreshInterval) {
        clearInterval(window.oreiApp.autoRefreshInterval);
    }
});

// Start application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    // DOM is already loaded
    initialize();
}

// Export for debugging in console
window.oreiDebug = {
    API,
    DeviceControl,
    DisplayManager,
    AudioControl,
    CommandHistory,
    ThemeManager,
    SystemManager,
    Utils,
    RokuControl,
    getState: () => window.oreiApp,
    sendCommand: (cmd) => API.sendCommand(cmd)
};