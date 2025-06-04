// main.js - Main entry point for Orei Control Panel

import { ThemeManager } from './theme.js';
import { API } from './api.js';
import { DeviceControl } from './device.js';
import { DisplayManager } from './display.js';
import { AudioControl } from './audio.js';
import { CommandHistory } from './commands.js';
import { Utils } from './utils.js';
import { RokuControl } from './roku.js';

// Global application state
window.oreiApp = {
    currentMode: 1,
    selectedWindow: null,
    autoRefreshInterval: null,
    windowInputs: {1: 1, 2: 2, 3: 3, 4: 4}
};

// Initialize application
async function initialize() {
    try {
        // Initialize theme system
        ThemeManager.init();
        
        // Initialize command history
        CommandHistory.init();
        
        // Initialize display controls
        DisplayManager.init();
        
        // Initialize audio controls
        AudioControl.init();
        
        // Initialize Roku controls
        RokuControl.init();
        
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
    Utils,
    RokuControl,
    getState: () => window.oreiApp,
    sendCommand: (cmd) => API.sendCommand(cmd)
};