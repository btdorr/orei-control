// device.js - Device control functions for Orei Control Panel

import { API } from './api.js';
import { Utils } from './utils.js';
import { DisplayManager } from './display.js';
import { AudioControl } from './audio.js';

export const DeviceControl = {
    // Initialize device control
    async initialize() {
        // Check serial communication and power status
        const isConnected = await this.checkSerialCommunication();
        const isOn = isConnected ? await this.checkPowerStatus() : false;
        this.setupEventListeners();
        
        // If device is connected and on, do full refresh (but pass the known power status)
        if (isConnected && isOn) {
            await this.refreshAll(isOn);
        }
    },
    
    // Set up event listeners
    setupEventListeners() {
        // Power button
        const powerBtn = document.getElementById('powerBtn');
        if (powerBtn) {
            powerBtn.addEventListener('click', () => this.togglePower());
        }
        
        // Refresh button
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshAll());
        }
        
        // Display mode selector (both simple and advanced)
        const displayMode = document.getElementById('displayMode');
        const displayModeAdvanced = document.getElementById('displayModeAdvanced');
        
        if (displayMode) {
            displayMode.addEventListener('change', async (e) => {
                await this.setDisplayMode(e.target.value);
                // Sync with advanced selector
                if (displayModeAdvanced) displayModeAdvanced.value = e.target.value;
            });
        }
        
        if (displayModeAdvanced) {
            displayModeAdvanced.addEventListener('change', async (e) => {
                await this.setDisplayMode(e.target.value);
                // Sync with simple selector
                if (displayMode) displayMode.value = e.target.value;
            });
        }
        
        // Output settings
        const outputRes = document.getElementById('outputResolution');
        if (outputRes) {
            outputRes.addEventListener('change', (e) => {
                API.sendCommand(`s output res ${e.target.value}!`);
            });
        }
        
        const outputHDCP = document.getElementById('outputHDCP');
        if (outputHDCP) {
            outputHDCP.addEventListener('change', (e) => {
                API.sendCommand(`s output hdcp ${e.target.value}!`);
            });
        }
        
        // Mode-specific settings
        this.setupModeSettingsListeners();
    },
    
    // Set up mode-specific settings listeners
    setupModeSettingsListeners() {
        // PIP settings
        const pipPosition = document.getElementById('pipPosition');
        if (pipPosition) {
            pipPosition.addEventListener('change', (e) => {
                API.sendCommand(`s PIP position ${e.target.value}!`);
                DisplayManager.updateDiagram();
            });
        }
        
        const pipSize = document.getElementById('pipSize');
        if (pipSize) {
            pipSize.addEventListener('change', (e) => {
                API.sendCommand(`s PIP size ${e.target.value}!`);
                DisplayManager.updateDiagram();
            });
        }
        
        // PBP settings
        const pbpMode = document.getElementById('pbpMode');
        if (pbpMode) {
            pbpMode.addEventListener('change', (e) => {
                API.sendCommand(`s PBP mode ${e.target.value}!`);
                DisplayManager.updateDiagram();
            });
        }
        
        const pbpAspect = document.getElementById('pbpAspect');
        if (pbpAspect) {
            pbpAspect.addEventListener('change', (e) => {
                API.sendCommand(`s PBP aspect ${e.target.value}!`);
            });
        }
        
        // Triple settings
        const tripleMode = document.getElementById('tripleMode');
        if (tripleMode) {
            tripleMode.addEventListener('change', (e) => {
                API.sendCommand(`s triple mode ${e.target.value}!`);
                DisplayManager.updateDiagram();
            });
        }
        
        const tripleAspect = document.getElementById('tripleAspect');
        if (tripleAspect) {
            tripleAspect.addEventListener('change', (e) => {
                API.sendCommand(`s triple aspect ${e.target.value}!`);
            });
        }
        
        // Quad settings
        const quadMode = document.getElementById('quadMode');
        if (quadMode) {
            quadMode.addEventListener('change', (e) => {
                API.sendCommand(`s quad mode ${e.target.value}!`);
                DisplayManager.updateDiagram();
            });
        }
        
        const quadAspect = document.getElementById('quadAspect');
        if (quadAspect) {
            quadAspect.addEventListener('change', (e) => {
                API.sendCommand(`s quad aspect ${e.target.value}!`);
            });
        }
    },
    
    // Check serial communication status
    async checkSerialCommunication() {
        try {
            const response = await API.sendCommand('r power!');
            if (response) {
                this.updateConnectionStatus(true);
                return true;
            } else {
                // If no response, try once more after a short delay
                await new Promise(resolve => setTimeout(resolve, 1000));
                const retryResponse = await API.sendCommand('r power!');
                if (retryResponse) {
                    this.updateConnectionStatus(true);
                    return true;
                }
            }
        } catch (error) {
            console.error('Error checking serial communication:', error);
        }
        
        // Default to offline if we can't communicate
        this.updateConnectionStatus(false);
        return false;
    },

    // Check power status
    async checkPowerStatus() {
        try {
            const response = await API.sendCommand('r power!');
            if (response) {
                const isOn = response.includes('power on');
                this.updatePowerControls(isOn);
                return isOn;
            } else {
                // If no response, try once more after a short delay
                await new Promise(resolve => setTimeout(resolve, 1000));
                const retryResponse = await API.sendCommand('r power!');
                if (retryResponse) {
                    const isOn = retryResponse.includes('power on');
                    this.updatePowerControls(isOn);
                    return isOn;
                }
            }
        } catch (error) {
            console.error('Error checking power status:', error);
        }
        
        // Update power controls to unknown state if can't determine status
        this.updatePowerControls(null);
        return false;
    },
    
    // Update connection status indicator (based on serial communication)
    updateConnectionStatus(isConnected) {
        const indicator = document.getElementById('powerIndicator');
        const status = document.getElementById('powerStatus');
        
        if (isConnected) {
            if (indicator) {
                indicator.classList.remove('status-off');
                indicator.classList.add('status-on');
            }
            if (status) status.textContent = 'Online';
            
            // Enable all controls when connected
            document.querySelectorAll('select, input, button').forEach(el => {
                el.disabled = false;
            });
        } else {
            if (indicator) {
                indicator.classList.remove('status-on');
                indicator.classList.add('status-off');
            }
            if (status) status.textContent = 'Offline';
            
            // Define elements that should always remain enabled when offline
            const alwaysEnabledIds = [
                'powerBtn',              // Power control
                'refreshBtn',            // Refresh button
                'sendDebugCmd',          // Debug command input
                'shutdownMenuItem',      // System shutdown
                'restartMenuItem',       // System restart
                'systemDropdown',        // System menu dropdown
                'advanced-tab',          // Advanced settings tab
                'remote-tab',            // Remote control tab
                'themeDropdown',         // Theme selector
                'serialPortSelect',      // Serial port configuration
                'refreshPortsBtn',       // Refresh serial ports
                'serialBaudSelect',      // Serial baud rate
                'testSerialBtn',         // Test serial connection
                'saveSerialBtn',         // Save serial configuration
                'configureRokuBtn'       // Configure Roku devices
            ];
            
            // Disable device controls but keep system/configuration controls enabled
            document.querySelectorAll('select, input, button').forEach(el => {
                if (!alwaysEnabledIds.includes(el.id) && 
                    !el.closest('[data-bs-toggle="dropdown"]') && // Keep dropdown toggles enabled
                    !el.closest('.dropdown-item') && // Keep dropdown items enabled
                    !el.classList.contains('nav-link')) { // Keep tab navigation enabled
                    el.disabled = true;
                }
            });
        }
    },

    // Update power controls (separate from connection status)
    updatePowerControls(isOn) {
        const powerBtn = document.getElementById('powerBtn');
        
        if (isOn === true) {
            if (powerBtn) {
                powerBtn.innerHTML = '<i class="bi bi-power"></i> Power Off';
                powerBtn.classList.remove('btn-success');
                powerBtn.classList.add('btn-danger');
                powerBtn.disabled = false;
            }
        } else if (isOn === false) {
            if (powerBtn) {
                powerBtn.innerHTML = '<i class="bi bi-power"></i> Power On';
                powerBtn.classList.remove('btn-danger');
                powerBtn.classList.add('btn-success');
                powerBtn.disabled = false;
            }
        } else {
            // Unknown power state (null)
            if (powerBtn) {
                powerBtn.innerHTML = '<i class="bi bi-power"></i> Power (Unknown)';
                powerBtn.classList.remove('btn-danger', 'btn-success');
                powerBtn.classList.add('btn-secondary');
                powerBtn.disabled = false;
            }
        }
    },
    
    // Toggle power
    async togglePower() {
        const response = await API.sendCommand('r power!');
        const isOn = response && response.includes('power on');
        await API.sendCommand(isOn ? 'power 0!' : 'power 1!');
        
        // Wait for device to change state
        setTimeout(() => {
            this.checkSerialCommunication();
            this.checkPowerStatus();
            if (!isOn) {
                // If turning on, refresh everything after initialization
                setTimeout(() => this.refreshAll(), 3000);
            }
        }, 2000);
    },
    
    // Get current display mode
    async getDisplayMode() {
        const response = await API.sendCommandSilent('r multiview!');
        if (response) {
            if (response.includes('single screen')) return 1;
            if (response.includes('PIP')) return 2;
            if (response.includes('PBP')) return 3;
            if (response.includes('triple')) return 4;
            if (response.includes('quad')) return 5;
        }
        return 1;
    },
    
    // Set display mode
    async setDisplayMode(mode) {
        await API.sendCommand(`s multiview ${mode}!`);
        window.oreiApp.currentMode = parseInt(mode);
        await DisplayManager.updateModeSettings();
        
        // Get window inputs for new mode, then update diagram
        await DisplayManager.getWindowInputs();
        
        // Update window input controls after window inputs are loaded
        DisplayManager.updateWindowInputControls();
        
        DisplayManager.updateDiagram();
        
        // Trigger display mode changed event for Roku remotes
        document.dispatchEvent(new CustomEvent('displayModeChanged', {
            detail: { mode: parseInt(mode) }
        }));
    },
    
    // Refresh all settings
    async refreshAll(isOn) {
        // Show a non-blocking notification instead of full spinner
        Utils.showToast('Refreshing device settings...', 'info', 3000);
        
        // Check serial communication first
        const isConnected = await this.checkSerialCommunication();
        
        // If power status not provided, check it (only if connected)
        if (typeof isOn === 'undefined') {
            isOn = isConnected ? await this.checkPowerStatus() : false;
        }
        
        if (isOn) {
            // Get current mode
            window.oreiApp.currentMode = await this.getDisplayMode();
            const displayMode = document.getElementById('displayMode');
            const displayModeAdvanced = document.getElementById('displayModeAdvanced');
            if (displayMode) displayMode.value = window.oreiApp.currentMode;
            if (displayModeAdvanced) displayModeAdvanced.value = window.oreiApp.currentMode;
            
            // Update mode settings and query device for current values
            await DisplayManager.updateModeSettings();
            
            // Get window inputs
            await DisplayManager.getWindowInputs();
            
            // Update window input controls after window inputs are loaded
            DisplayManager.updateWindowInputControls();
            
            // Now update the diagram after windowInputs are loaded
            DisplayManager.updateDiagram();
            
            // Load audio settings
            await AudioControl.loadSettings();
            
            // Get output settings
            await this.loadOutputSettings();
            
            // Show completion message
            Utils.showToast('Device settings refreshed successfully', 'success');
            
            // Dispatch event to notify that device settings have been refreshed
            document.dispatchEvent(new CustomEvent('deviceSettingsRefreshed'));
        }
    },
    
    // Load output settings
    async loadOutputSettings() {
        // Send commands sequentially to avoid RS-232 communication issues
        const resResponse = await API.sendCommandSilent('r output res!');
        await new Promise(resolve => setTimeout(resolve, 200)); // Small delay between commands
        
        const hdcpResponse = await API.sendCommandSilent('r output hdcp!');
        
        // Get resolution
        if (resResponse) {
            const outputRes = document.getElementById('outputResolution');
            if (outputRes) {
                const value = Utils.getResolutionValue(resResponse);
                if (value) outputRes.value = value;
            }
        }
        
        // Get HDCP
        if (hdcpResponse) {
            const outputHDCP = document.getElementById('outputHDCP');
            if (outputHDCP) {
                if (hdcpResponse.includes('HDCP 2.2')) outputHDCP.value = '2';
                else if (hdcpResponse.includes('HDCP 1.4')) outputHDCP.value = '1';
                else if (hdcpResponse.includes('HDCP OFF')) outputHDCP.value = '3';
            }
        }
    },
    
    // Check device status (for auto-refresh)
    async checkStatus() {
        const isOn = await this.checkPowerStatus();
        if (isOn) {
            // Only refresh mode if device is on
            const newMode = await this.getDisplayMode();
            if (newMode !== window.oreiApp.currentMode) {
                window.oreiApp.currentMode = newMode;
                const displayMode = document.getElementById('displayMode');
                const displayModeAdvanced = document.getElementById('displayModeAdvanced');
                if (displayMode) displayMode.value = window.oreiApp.currentMode;
                if (displayModeAdvanced) displayModeAdvanced.value = window.oreiApp.currentMode;
                await DisplayManager.updateModeSettings();
                await DisplayManager.getWindowInputs();
                
                // Update window input controls after window inputs are loaded
                DisplayManager.updateWindowInputControls();
                
                DisplayManager.updateDiagram();
            }
        }
    },

    // Setup serial port configuration
    setupSerialConfig() {
        this.loadSerialConfig();
        
        // Set up event listeners for serial configuration
        const refreshPortsBtn = document.getElementById('refreshPortsBtn');
        if (refreshPortsBtn) {
            refreshPortsBtn.addEventListener('click', () => this.loadSerialConfig());
        }
        
        const serialPortSelect = document.getElementById('serialPortSelect');
        if (serialPortSelect) {
            serialPortSelect.addEventListener('change', (e) => {
                const updateBtn = document.getElementById('updateSerialPortBtn');
                if (updateBtn) {
                    updateBtn.disabled = !e.target.value || e.target.value === this.currentSerialPort;
                }
            });
        }
        
        const updateSerialPortBtn = document.getElementById('updateSerialPortBtn');
        if (updateSerialPortBtn) {
            updateSerialPortBtn.addEventListener('click', () => this.updateSerialPort());
        }
    },

    // Load serial port configuration
    async loadSerialConfig() {
        try {
            const response = await fetch('/api/config/serial');
            const data = await response.json();
            
            if (data.success) {
                this.currentSerialPort = data.current_port;
                
                // Update UI
                const currentPortSpan = document.getElementById('currentSerialPort');
                if (currentPortSpan) currentPortSpan.textContent = data.current_port;
                
                const statusBadge = document.getElementById('serialConnectionStatus');
                if (statusBadge) {
                    statusBadge.textContent = data.connected ? 'Connected' : 'Disconnected';
                    statusBadge.className = `badge ${data.connected ? 'bg-success' : 'bg-danger'}`;
                }
                
                // Populate available ports
                const selectElement = document.getElementById('serialPortSelect');
                if (selectElement) {
                    selectElement.innerHTML = '';
                    
                    if (data.available_ports && data.available_ports.length > 0) {
                        data.available_ports.forEach(port => {
                            const option = document.createElement('option');
                            option.value = port.device;
                            option.textContent = `${port.device} - ${port.description}`;
                            selectElement.appendChild(option);
                        });
                        selectElement.value = data.current_port;
                    } else {
                        selectElement.innerHTML = '<option value="">No serial ports found</option>';
                    }
                }
                
                // Update button state
                const updateBtn = document.getElementById('updateSerialPortBtn');
                if (updateBtn) {
                    updateBtn.disabled = true;
                }
            }
        } catch (error) {
            console.error('Failed to load serial configuration:', error);
            Utils.showToast('Failed to load serial port configuration', 'error');
        }
    },

    // Update serial port
    async updateSerialPort() {
        const selectElement = document.getElementById('serialPortSelect');
        if (!selectElement || !selectElement.value) return;
        
        const newPort = selectElement.value;
        
        try {
            Utils.showToast('Updating serial port...', 'info');
            
            const response = await fetch('/api/config/serial', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    port: newPort
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                Utils.showToast(`Serial port updated to ${newPort}`, 'success');
                
                // Reload configuration to update UI
                await this.loadSerialConfig();
                
                // If connection successful, refresh device status
                if (data.connected) {
                    setTimeout(() => {
                        this.checkPowerStatus();
                    }, 1000);
                }
            } else {
                Utils.showToast(data.error || 'Failed to update serial port', 'error');
            }
        } catch (error) {
            console.error('Failed to update serial port:', error);
            Utils.showToast('Failed to update serial port', 'error');
        }
    }
};

export const DeviceManager = {
    // Initialize device controls
    init() {
        // Call setupSerialConfig on DeviceControl
        DeviceControl.setupSerialConfig();
    }
};