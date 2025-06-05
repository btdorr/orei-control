// system.js - System management functionality

import { API } from './api.js';
import { Utils } from './utils.js';

export class SystemManager {
    static modals = {
        shutdown: null,
        restart: null
    };
    
    static timers = {
        shutdown: null,
        restart: null
    };
    
    static init() {
        console.log('SystemManager.init() called');
        SystemManager.setupEventListeners();
        SystemManager.timers.shutdown = null;
        SystemManager.timers.restart = null;
        console.log('SystemManager initialization complete');
    }
    
    static setupEventListeners() {
        console.log('SystemManager.setupEventListeners() called');
        
        // System menu item click
        const shutdownMenuItem = document.getElementById('shutdownMenuItem');
        console.log('shutdownMenuItem found:', !!shutdownMenuItem);
        if (shutdownMenuItem) {
            shutdownMenuItem.addEventListener('click', (e) => {
                console.log('Shutdown menu item clicked');
                e.preventDefault();
                SystemManager.showShutdownModal();
            });
        }
        
        // Restart menu item click
        const restartMenuItem = document.getElementById('restartMenuItem');
        console.log('restartMenuItem found:', !!restartMenuItem);
        if (restartMenuItem) {
            restartMenuItem.addEventListener('click', (e) => {
                console.log('Restart menu item clicked');
                e.preventDefault();
                SystemManager.showRestartModal();
            });
        }
        
        // Modal event listeners
        const confirmBtn = document.getElementById('confirmShutdownBtn');
        const cancelBtn = document.getElementById('cancelShutdownBtn');
        const confirmRestartBtn = document.getElementById('confirmRestartBtn');
        const cancelRestartBtn = document.getElementById('cancelRestartBtn');
        
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                SystemManager.initiateShutdown();
            });
        }
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                SystemManager.cancelShutdown();
            });
        }
        
        if (confirmRestartBtn) {
            confirmRestartBtn.addEventListener('click', () => {
                SystemManager.initiateRestart();
            });
        }
        
        if (cancelRestartBtn) {
            cancelRestartBtn.addEventListener('click', () => {
                SystemManager.cancelRestart();
            });
        }
        
        // Modal close events
        const shutdownModal = document.getElementById('shutdownModal');
        console.log('shutdownModal element found:', !!shutdownModal);
        if (shutdownModal) {
            try {
                SystemManager.modals.shutdown = new bootstrap.Modal(shutdownModal);
                console.log('Bootstrap shutdownModal created:', SystemManager.modals.shutdown);
                shutdownModal.addEventListener('hidden.bs.modal', () => {
                    SystemManager.resetShutdownModal();
                });
            } catch (error) {
                console.error('Error creating shutdown modal:', error);
            }
        }
        
        const restartModal = document.getElementById('restartModal');
        console.log('restartModal element found:', !!restartModal);
        if (restartModal) {
            try {
                SystemManager.modals.restart = new bootstrap.Modal(restartModal);
                console.log('Bootstrap restartModal created:', SystemManager.modals.restart);
                console.log('Checking SystemManager.modals.restart immediately after creation:', SystemManager.modals.restart);
                restartModal.addEventListener('hidden.bs.modal', () => {
                    SystemManager.resetRestartModal();
                });
            } catch (error) {
                console.error('Error creating restart modal:', error);
            }
        }
        
        // Final check of modal references after setup
        console.log('Final modal check - shutdownModal:', SystemManager.modals.shutdown);
        console.log('Final modal check - restartModal:', SystemManager.modals.restart);
    }
    
    static showShutdownModal() {
        console.log('showShutdownModal() called');
        console.log('shutdownModal:', SystemManager.modals.shutdown);
        if (SystemManager.modals.shutdown) {
            SystemManager.resetShutdownModal();
            SystemManager.modals.shutdown.show();
        } else {
            console.error('shutdownModal is not initialized!');
        }
    }
    
    static showRestartModal() {
        console.log('showRestartModal() called');
        console.log('Checking all SystemManager properties:', Object.getOwnPropertyNames(SystemManager));
        console.log('SystemManager.modals.restart at call time:', SystemManager.modals.restart);
        console.log('typeof SystemManager.modals.restart:', typeof SystemManager.modals.restart);
        if (SystemManager.modals.restart) {
            SystemManager.resetRestartModal();
            SystemManager.modals.restart.show();
        } else {
            console.error('restartModal is not initialized!');
        }
    }
    
    static async initiateShutdown() {
        try {
            // Show loading state
            const confirmBtn = document.getElementById('confirmShutdownBtn');
            const originalText = confirmBtn.innerHTML;
            confirmBtn.innerHTML = '<div class="spinner-border spinner-border-sm me-2"></div>Shutting Down...';
            confirmBtn.disabled = true;
            
            // Send shutdown request
            const response = await fetch('/api/system/shutdown', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    confirmed: true
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Show shutdown status
                SystemManager.showShutdownStatus(data.message, data.countdown);
                
                // Start countdown
                SystemManager.startCountdown(data.countdown);
                
                // Show toast notification
                Utils.showToast('System shutdown initiated', 'warning');
            } else {
                throw new Error(data.error || 'Failed to initiate shutdown');
            }
            
        } catch (error) {
            console.error('Shutdown error:', error);
            Utils.showToast(`Shutdown failed: ${error.message}`, 'danger');
            
            // Reset button
            const confirmBtn = document.getElementById('confirmShutdownBtn');
            confirmBtn.innerHTML = '<i class="bi bi-power me-2"></i>Shutdown System';
            confirmBtn.disabled = false;
        }
    }
    
    static async cancelShutdown() {
        try {
            const response = await fetch('/api/system/shutdown/cancel', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Stop countdown
                if (SystemManager.timers.shutdown) {
                    clearInterval(SystemManager.timers.shutdown);
                    SystemManager.timers.shutdown = null;
                }
                
                // Reset modal
                SystemManager.resetShutdownModal();
                
                // Close modal
                SystemManager.modals.shutdown.hide();
                
                // Show success message
                Utils.showToast('System shutdown cancelled', 'success');
            } else {
                throw new Error(data.error || 'Failed to cancel shutdown');
            }
            
        } catch (error) {
            console.error('Cancel shutdown error:', error);
            Utils.showToast(`Failed to cancel shutdown: ${error.message}`, 'danger');
        }
    }
    
    static showShutdownStatus(message, countdown) {
        // Hide initial actions
        document.getElementById('shutdownActions').style.display = 'none';
        
        // Show shutdown status
        const statusDiv = document.getElementById('shutdownStatus');
        const messageSpan = document.getElementById('shutdownMessage');
        const countdownSpan = document.getElementById('shutdownCountdown');
        
        messageSpan.textContent = message;
        countdownSpan.textContent = countdown;
        statusDiv.style.display = 'block';
        
        // Show cancel actions
        document.getElementById('shutdownActiveActions').style.display = 'block';
    }
    
    static startCountdown(seconds) {
        let remaining = seconds;
        
        SystemManager.timers.shutdown = setInterval(() => {
            remaining--;
            
            const countdownSpan = document.getElementById('shutdownCountdown');
            if (countdownSpan) {
                countdownSpan.textContent = remaining;
            }
            
            // Update message based on time remaining
            const messageSpan = document.getElementById('shutdownMessage');
            if (messageSpan) {
                if (remaining > 30) {
                    messageSpan.textContent = 'System shutdown initiated...';
                } else if (remaining > 10) {
                    messageSpan.textContent = 'System will shutdown soon...';
                } else if (remaining > 0) {
                    messageSpan.textContent = 'System is shutting down now...';
                } else {
                    messageSpan.textContent = 'System has shut down.';
                }
            }
            
            // When countdown reaches 0, stop timer and update UI
            if (remaining <= 0) {
                clearInterval(SystemManager.timers.shutdown);
                SystemManager.timers.shutdown = null;
                
                // Hide cancel button since it's too late
                const cancelBtn = document.getElementById('cancelShutdownBtn');
                if (cancelBtn) {
                    cancelBtn.style.display = 'none';
                }
                
                // Show final message
                Utils.showToast('System is shutting down...', 'info');
            }
        }, 1000);
    }
    
    static resetShutdownModal() {
        // Stop any running countdown
        if (SystemManager.timers.shutdown) {
            clearInterval(SystemManager.timers.shutdown);
            SystemManager.timers.shutdown = null;
        }
        
        // Reset button states
        const confirmBtn = document.getElementById('confirmShutdownBtn');
        if (confirmBtn) {
            confirmBtn.innerHTML = '<i class="bi bi-power me-2"></i>Shutdown System';
            confirmBtn.disabled = false;
        }
        
        // Reset visibility
        document.getElementById('shutdownActions').style.display = 'block';
        document.getElementById('shutdownActiveActions').style.display = 'none';
        document.getElementById('shutdownStatus').style.display = 'none';
        
        // Show cancel button again
        const cancelBtn = document.getElementById('cancelShutdownBtn');
        if (cancelBtn) {
            cancelBtn.style.display = 'inline-block';
        }
    }
    
    static resetRestartModal() {
        // Stop any running countdown
        if (SystemManager.timers.restart) {
            clearInterval(SystemManager.timers.restart);
            SystemManager.timers.restart = null;
        }
        
        // Reset button states
        const confirmBtn = document.getElementById('confirmRestartBtn');
        if (confirmBtn) {
            confirmBtn.innerHTML = '<i class="bi bi-arrow-clockwise me-2"></i>Restart System';
            confirmBtn.disabled = false;
        }
        
        // Reset visibility
        document.getElementById('restartActions').style.display = 'block';
        document.getElementById('restartActiveActions').style.display = 'none';
        document.getElementById('restartStatus').style.display = 'none';
        
        // Show cancel button again
        const cancelBtn = document.getElementById('cancelRestartBtn');
        if (cancelBtn) {
            cancelBtn.style.display = 'inline-block';
        }
    }
    
    static async initiateRestart() {
        try {
            // Show loading state
            const confirmBtn = document.getElementById('confirmRestartBtn');
            const originalText = confirmBtn.innerHTML;
            confirmBtn.innerHTML = '<div class="spinner-border spinner-border-sm me-2"></div>Restarting...';
            confirmBtn.disabled = true;
            
            // Send restart request
            const response = await fetch('/api/system/restart', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    confirmed: true
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Show restart status
                SystemManager.showRestartStatus(data.message, data.countdown);
                
                // Start countdown
                SystemManager.startRestartCountdown(data.countdown);
                
                // Show toast notification
                Utils.showToast('System restart initiated', 'info');
            } else {
                throw new Error(data.error || 'Failed to initiate restart');
            }
            
        } catch (error) {
            console.error('Restart error:', error);
            Utils.showToast(`Restart failed: ${error.message}`, 'danger');
            
            // Reset button
            const confirmBtn = document.getElementById('confirmRestartBtn');
            confirmBtn.innerHTML = '<i class="bi bi-arrow-clockwise me-2"></i>Restart System';
            confirmBtn.disabled = false;
        }
    }
    
    static async cancelRestart() {
        try {
            const response = await fetch('/api/system/restart/cancel', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Stop countdown
                if (SystemManager.timers.restart) {
                    clearInterval(SystemManager.timers.restart);
                    SystemManager.timers.restart = null;
                }
                
                // Reset modal
                SystemManager.resetRestartModal();
                
                // Close modal
                SystemManager.modals.restart.hide();
                
                // Show success message
                Utils.showToast('System restart cancelled', 'success');
            } else {
                throw new Error(data.error || 'Failed to cancel restart');
            }
            
        } catch (error) {
            console.error('Cancel restart error:', error);
            Utils.showToast(`Failed to cancel restart: ${error.message}`, 'danger');
        }
    }
    
    static showRestartStatus(message, countdown) {
        // Hide initial actions
        document.getElementById('restartActions').style.display = 'none';
        
        // Show restart status
        const statusDiv = document.getElementById('restartStatus');
        const messageSpan = document.getElementById('restartMessage');
        const countdownSpan = document.getElementById('restartCountdown');
        
        messageSpan.textContent = message;
        countdownSpan.textContent = countdown;
        statusDiv.style.display = 'block';
        
        // Show cancel actions
        document.getElementById('restartActiveActions').style.display = 'block';
    }
    
    static startRestartCountdown(seconds) {
        let remaining = seconds;
        
        SystemManager.timers.restart = setInterval(() => {
            remaining--;
            
            const countdownSpan = document.getElementById('restartCountdown');
            if (countdownSpan) {
                countdownSpan.textContent = remaining;
            }
            
            // Update message based on time remaining
            const messageSpan = document.getElementById('restartMessage');
            if (messageSpan) {
                if (remaining > 30) {
                    messageSpan.textContent = 'System restart initiated...';
                } else if (remaining > 10) {
                    messageSpan.textContent = 'System will restart soon...';
                } else if (remaining > 0) {
                    messageSpan.textContent = 'System is restarting now...';
                } else {
                    messageSpan.textContent = 'System is restarting. Please wait...';
                }
            }
            
            // When countdown reaches 0, stop timer and update UI
            if (remaining <= 0) {
                clearInterval(SystemManager.timers.restart);
                SystemManager.timers.restart = null;
                
                // Hide cancel button since it's too late
                const cancelBtn = document.getElementById('cancelRestartBtn');
                if (cancelBtn) {
                    cancelBtn.style.display = 'none';
                }
                
                // Show final message
                Utils.showToast('System is restarting...', 'info');
            }
        }, 1000);
    }
} 