// device.js - Device control functions for Orei Control Panel

import { API } from './api.js';
import { Utils } from './utils.js';
import { DisplayManager } from './display.js';
import { AudioControl } from './audio.js';

export const DeviceControl = {
    // Initialize device control
    async initialize() {
        // Check power status once and store result
        const isOn = await this.checkPowerStatus();
        this.setupEventListeners();
        
        // If device is on, do full refresh (but pass the known power status)
        if (isOn) {
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
        
        // Display mode selector
        const displayMode = document.getElementById('displayMode');
        if (displayMode) {
            displayMode.addEventListener('change', async (e) => {
                await this.setDisplayMode(e.target.value);
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
    
    // Check power status
    async checkPowerStatus() {
        const response = await API.sendCommand('r power!');
        if (response) {
            const isOn = response.includes('power on');
            this.updatePowerStatus(isOn);
            return isOn;
        }
        return false;
    },
    
    // Update power status UI
    updatePowerStatus(isOn) {
        const indicator = document.getElementById('powerIndicator');
        const status = document.getElementById('powerStatus');
        const powerBtn = document.getElementById('powerBtn');
        
        if (isOn) {
            if (indicator) {
                indicator.classList.remove('status-off');
                indicator.classList.add('status-on');
            }
            if (status) status.textContent = 'Online';
            if (powerBtn) {
                powerBtn.innerHTML = '<i class="bi bi-power"></i> Power Off';
                powerBtn.classList.remove('btn-success');
                powerBtn.classList.add('btn-danger');
                powerBtn.disabled = false;
            }
            
            // Enable all controls
            document.querySelectorAll('select, input, button').forEach(el => {
                if (el.id !== 'powerBtn') el.disabled = false;
            });
        } else {
            if (indicator) {
                indicator.classList.remove('status-on');
                indicator.classList.add('status-off');
            }
            if (status) status.textContent = 'Offline';
            if (powerBtn) {
                powerBtn.innerHTML = '<i class="bi bi-power"></i> Power On';
                powerBtn.classList.remove('btn-danger');
                powerBtn.classList.add('btn-success');
                powerBtn.disabled = false;
            }
            
            // Disable all controls except power
            document.querySelectorAll('select, input, button').forEach(el => {
                if (el.id !== 'powerBtn' && el.id !== 'refreshBtn' && el.id !== 'sendDebugCmd') {
                    el.disabled = true;
                }
            });
        }
    },
    
    // Toggle power
    async togglePower() {
        const response = await API.sendCommand('r power!');
        const isOn = response && response.includes('power on');
        await API.sendCommand(isOn ? 'power 0!' : 'power 1!');
        
        // Wait for device to change state
        setTimeout(() => {
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
        DisplayManager.updateDiagram();
    },
    
    // Refresh all settings
    async refreshAll(isOn) {
        // Show a non-blocking notification instead of full spinner
        Utils.showToast('Refreshing device settings...', 'info', 3000);
        
        // If power status not provided, check it
        if (typeof isOn === 'undefined') {
            isOn = await this.checkPowerStatus();
        }
        
        if (isOn) {
            // Get current mode
            window.oreiApp.currentMode = await this.getDisplayMode();
            const displayMode = document.getElementById('displayMode');
            if (displayMode) displayMode.value = window.oreiApp.currentMode;
            
            // Update mode settings and query device for current values
            await DisplayManager.updateModeSettings();
            
            // Get window inputs
            await DisplayManager.getWindowInputs();
            
            // Now update the diagram after windowInputs are loaded
            DisplayManager.updateDiagram();
            
            // Load audio settings
            await AudioControl.loadSettings();
            
            // Get output settings
            await this.loadOutputSettings();
            
            // Show completion message
            Utils.showToast('Device settings refreshed successfully', 'success');
        }
    },
    
    // Load output settings
    async loadOutputSettings() {
        const [resResponse, hdcpResponse] = await Promise.all([
            API.sendCommandSilent('r output res!'),
            API.sendCommandSilent('r output hdcp!')
        ]);
        
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
                if (displayMode) displayMode.value = window.oreiApp.currentMode;
                await DisplayManager.updateModeSettings();
                await DisplayManager.getWindowInputs();
                DisplayManager.updateDiagram();
            }
        }
    }
};