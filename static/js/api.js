// api.js - API communication layer for Orei Control Panel

import { Utils } from './utils.js';

export const API = {
    BASE_URL: '/api',
    
    // Send RS-232 command to device
    async sendCommand(command, silent = false) {
        if (!silent) {
            Utils.showLoading();
        }
        
        try {
            const response = await fetch(`${this.BASE_URL}/command`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ command: command })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Add to command history
                if (window.CommandHistory) {
                    window.CommandHistory.add(command, data.response);
                }
                return data.response;
            } else {
                Utils.showToast(`Error: ${data.error}`, 'danger');
                return null;
            }
        } catch (error) {
            Utils.showToast(`Network error: ${error.message}`, 'danger');
            return null;
        } finally {
            if (!silent) {
                Utils.hideLoading();
            }
        }
    },
    
    // Send command silently (no loading spinner)
    async sendCommandSilent(command) {
        return this.sendCommand(command, true);
    },
    
    // Get device status
    async getStatus() {
        try {
            const response = await fetch(`${this.BASE_URL}/status`);
            const data = await response.json();
            return data.success ? data : null;
        } catch (error) {
            console.error('Error getting status:', error);
            return null;
        }
    },
    
    // Get command history
    async getHistory(limit = 50) {
        try {
            const response = await fetch(`${this.BASE_URL}/history?limit=${limit}`);
            const data = await response.json();
            return data.success ? data.history : [];
        } catch (error) {
            console.error('Error getting history:', error);
            return [];
        }
    },
    
    // Clear command history
    async clearHistory() {
        try {
            const response = await fetch(`${this.BASE_URL}/history`, {
                method: 'DELETE'
            });
            const data = await response.json();
            return data.success;
        } catch (error) {
            console.error('Error clearing history:', error);
            return false;
        }
    },
    
    // Get available serial ports
    async getPorts() {
        try {
            const response = await fetch(`${this.BASE_URL}/ports`);
            const data = await response.json();
            return data.success ? data.ports : [];
        } catch (error) {
            console.error('Error getting ports:', error);
            return [];
        }
    },
    
    // Get current configuration
    async getConfig() {
        try {
            const response = await fetch(`${this.BASE_URL}/config`);
            const data = await response.json();
            return data.success ? data.config : null;
        } catch (error) {
            console.error('Error getting config:', error);
            return null;
        }
    },
    
    // Update configuration
    async updateConfig(config) {
        try {
            const response = await fetch(`${this.BASE_URL}/config`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(config)
            });
            const data = await response.json();
            
            if (!data.success) {
                Utils.showToast(`Configuration update failed: ${data.error}`, 'danger');
            }
            
            return data.success;
        } catch (error) {
            Utils.showToast(`Error updating configuration: ${error.message}`, 'danger');
            return false;
        }
    },
    
    // Device-specific power control
    async controlPower(action) {
        try {
            const response = await fetch(`${this.BASE_URL}/device/power/${action}`, {
                method: 'POST'
            });
            const data = await response.json();
            return data.success ? data : null;
        } catch (error) {
            console.error('Error controlling power:', error);
            return null;
        }
    }
};