// system.js - System management functionality

import { API } from './api.js';
import { Utils } from './utils.js';

export class SystemManager {
    static modals = {
        shutdown: null,
        restart: null,
        update: null
    };
    
    static timers = {
        shutdown: null,
        restart: null,
        update: null
    };
    
    static init() {
        SystemManager.setupEventListeners();
        SystemManager.timers.shutdown = null;
        SystemManager.timers.restart = null;
    }
    
    static setupEventListeners() {
        // System menu item click
        const shutdownMenuItem = document.getElementById('shutdownMenuItem');
        if (shutdownMenuItem) {
            shutdownMenuItem.addEventListener('click', (e) => {
                e.preventDefault();
                SystemManager.showShutdownModal();
            });
        }
        
        // Restart menu item click
        const restartMenuItem = document.getElementById('restartMenuItem');
        if (restartMenuItem) {
            restartMenuItem.addEventListener('click', (e) => {
                e.preventDefault();
                SystemManager.showRestartModal();
            });
        }
        
        // Update menu item click
        const updateMenuItem = document.getElementById('updateMenuItem');
        if (updateMenuItem) {
            updateMenuItem.addEventListener('click', (e) => {
                e.preventDefault();
                SystemManager.showUpdateModal();
            });
        }
        
        // Modal event listeners
        const confirmBtn = document.getElementById('confirmShutdownBtn');
        const cancelBtn = document.getElementById('cancelShutdownBtn');
        const confirmRestartBtn = document.getElementById('confirmRestartBtn');
        const cancelRestartBtn = document.getElementById('cancelRestartBtn');
        const confirmUpdateBtn = document.getElementById('confirmUpdateBtn');
        const cancelUpdateBtn = document.getElementById('cancelUpdateBtn');
        
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
        
        if (confirmUpdateBtn) {
            confirmUpdateBtn.addEventListener('click', () => {
                SystemManager.initiateUpdate();
            });
        }
        
        if (cancelUpdateBtn) {
            cancelUpdateBtn.addEventListener('click', () => {
                SystemManager.cancelUpdate();
            });
        }
        
        // Modal close events
        const shutdownModal = document.getElementById('shutdownModal');
        if (shutdownModal) {
            try {
                SystemManager.modals.shutdown = new bootstrap.Modal(shutdownModal);
                shutdownModal.addEventListener('hidden.bs.modal', () => {
                    SystemManager.resetShutdownModal();
                });
            } catch (error) {
                console.error('Error creating shutdown modal:', error);
            }
        }
        
        const restartModal = document.getElementById('restartModal');
        if (restartModal) {
            try {
                SystemManager.modals.restart = new bootstrap.Modal(restartModal);
                restartModal.addEventListener('hidden.bs.modal', () => {
                    SystemManager.resetRestartModal();
                });
            } catch (error) {
                console.error('Error creating restart modal:', error);
            }
        }
        
        const updateModal = document.getElementById('updateModal');
        if (updateModal) {
            try {
                SystemManager.modals.update = new bootstrap.Modal(updateModal);
                updateModal.addEventListener('hidden.bs.modal', () => {
                    SystemManager.resetUpdateModal();
                });
            } catch (error) {
                console.error('Error creating update modal:', error);
            }
        }
    }
    
    static showShutdownModal() {
        if (SystemManager.modals.shutdown) {
            SystemManager.resetShutdownModal();
            SystemManager.modals.shutdown.show();
        } else {
            console.error('shutdownModal is not initialized!');
        }
    }
    
    static showRestartModal() {
        if (SystemManager.modals.restart) {
            SystemManager.resetRestartModal();
            SystemManager.modals.restart.show();
        } else {
            console.error('restartModal is not initialized!');
        }
    }
    
    static showUpdateModal() {
        if (SystemManager.modals.update) {
            SystemManager.resetUpdateModal();
            SystemManager.modals.update.show();
        } else {
            console.error('updateModal is not initialized!');
        }
    }
    
    static resetUpdateModal() {
        console.log('Resetting update modal...');
        
        // Hide all status sections
        const updateStatus = document.getElementById('updateStatus');
        const updateComplete = document.getElementById('updateComplete');
        const updateError = document.getElementById('updateError');
        const updateActions = document.getElementById('updateActions');
        const updateActiveActions = document.getElementById('updateActiveActions');
        const updateCloseBtn = document.getElementById('updateCloseBtn');
        
        if (updateStatus) updateStatus.style.display = 'none';
        if (updateComplete) updateComplete.style.display = 'none';
        if (updateError) updateError.style.display = 'none';
        if (updateActions) updateActions.style.display = 'block';
        if (updateActiveActions) updateActiveActions.style.display = 'none';
        if (updateCloseBtn) updateCloseBtn.disabled = false;
        
        // Clear output
        const updateOutput = document.getElementById('updateOutput');
        if (updateOutput) updateOutput.textContent = '';
        
        // Reset button state
        const confirmBtn = document.getElementById('confirmUpdateBtn');
        console.log('Update button found:', !!confirmBtn);
        if (confirmBtn) {
            confirmBtn.innerHTML = '<i class="bi bi-download me-2"></i>Start Update';
            confirmBtn.disabled = false;
            console.log('Update button enabled, disabled state:', confirmBtn.disabled);
        }
    }
    
    static showUpdateStatus() {
        // Hide initial actions and show update in progress
        const updateActions = document.getElementById('updateActions');
        const updateActiveActions = document.getElementById('updateActiveActions');
        const updateStatus = document.getElementById('updateStatus');
        const updateCloseBtn = document.getElementById('updateCloseBtn');
        
        if (updateActions) updateActions.style.display = 'none';
        if (updateActiveActions) updateActiveActions.style.display = 'block';
        if (updateStatus) updateStatus.style.display = 'block';
        if (updateCloseBtn) updateCloseBtn.disabled = true;
    }
    
    static showUpdateComplete() {
        const updateStatus = document.getElementById('updateStatus');
        const updateComplete = document.getElementById('updateComplete');
        const updateCloseBtn = document.getElementById('updateCloseBtn');
        
        if (updateStatus) updateStatus.style.display = 'none';
        if (updateComplete) updateComplete.style.display = 'block';
        if (updateCloseBtn) updateCloseBtn.disabled = false;
        
        // Auto-refresh countdown
        let countdown = 5;
        const countdownElement = document.getElementById('refreshCountdown');
        const countdownInterval = setInterval(() => {
            countdown--;
            if (countdownElement) countdownElement.textContent = countdown;
            
            if (countdown <= 0) {
                clearInterval(countdownInterval);
                location.reload();
            }
        }, 1000);
        
        SystemManager.timers.update = countdownInterval;
    }
    
    static showUpdateError(errorMessage) {
        const updateStatus = document.getElementById('updateStatus');
        const updateError = document.getElementById('updateError');
        const updateErrorMessage = document.getElementById('updateErrorMessage');
        const updateActions = document.getElementById('updateActions');
        const updateActiveActions = document.getElementById('updateActiveActions');
        const updateCloseBtn = document.getElementById('updateCloseBtn');
        
        if (updateStatus) updateStatus.style.display = 'none';
        if (updateError) updateError.style.display = 'block';
        if (updateErrorMessage) updateErrorMessage.textContent = errorMessage;
        if (updateActions) updateActions.style.display = 'block';
        if (updateActiveActions) updateActiveActions.style.display = 'none';
        if (updateCloseBtn) updateCloseBtn.disabled = false;
        
        // Reset button state
        const confirmBtn = document.getElementById('confirmUpdateBtn');
        if (confirmBtn) {
            confirmBtn.innerHTML = '<i class="bi bi-download me-2"></i>Start Update';
            confirmBtn.disabled = false;
        }
    }
    
    static async initiateUpdate() {
        try {
            // Show loading state
            const confirmBtn = document.getElementById('confirmUpdateBtn');
            if (!confirmBtn) {
                console.error('Update confirm button not found');
                return;
            }
            
            const originalText = confirmBtn.innerHTML;
            confirmBtn.innerHTML = '<div class="spinner-border spinner-border-sm me-2"></div>Starting Update...';
            confirmBtn.disabled = true;
            
            // Show update in progress state
            SystemManager.showUpdateStatus();
            
            const updateOutput = document.getElementById('updateOutput');
            if (updateOutput) {
                updateOutput.textContent = 'Initiating system update...\n';
            }
            
            // Start update process with streaming output
            const response = await fetch('/api/system/update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorText = await response.text().catch(() => 'Unknown error');
                throw new Error(`Update failed: ${response.status} ${response.statusText} - ${errorText}`);
            }
            
            // Handle streaming response
            if (!response.body) {
                throw new Error('No response body received from server');
            }
            
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            
            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    const chunk = decoder.decode(value, { stream: true });
                    if (updateOutput) {
                        updateOutput.textContent += chunk;
                        // Auto-scroll to bottom
                        updateOutput.scrollTop = updateOutput.scrollHeight;
                    }
                }
            } finally {
                // Ensure reader is properly closed
                reader.releaseLock();
            }
            
            // Update completed successfully
            SystemManager.showUpdateComplete();
            Utils.showToast('Update completed successfully!', 'success');
            
        } catch (error) {
            console.error('Update failed:', error);
            SystemManager.showUpdateError(error.message);
            Utils.showToast(`Update failed: ${error.message}`, 'error');
        }
    }
    
    static async cancelUpdate() {
        try {
            // Clear any existing timer
            if (SystemManager.timers.update) {
                clearInterval(SystemManager.timers.update);
                SystemManager.timers.update = null;
            }
            
            // Send cancel request to backend
            const response = await fetch('/api/system/update/cancel', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                Utils.showToast(data.message || 'Update cancelled successfully', 'info');
            } else {
                Utils.showToast('Failed to cancel update', 'warning');
            }
            
            // Reset modal to initial state
            SystemManager.resetUpdateModal();
            
        } catch (error) {
            console.error('Failed to cancel update:', error);
            Utils.showToast('Failed to cancel update', 'error');
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