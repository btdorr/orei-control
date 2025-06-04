// system.js - System management functionality

import { API } from './api.js';
import { Utils } from './utils.js';

export class SystemManager {
    static init() {
        this.setupEventListeners();
        this.shutdownTimer = null;
        this.shutdownModal = null;
    }
    
    static setupEventListeners() {
        // System menu item click
        const shutdownMenuItem = document.getElementById('shutdownMenuItem');
        if (shutdownMenuItem) {
            shutdownMenuItem.addEventListener('click', (e) => {
                e.preventDefault();
                this.showShutdownModal();
            });
        }
        
        // Modal event listeners
        const confirmBtn = document.getElementById('confirmShutdownBtn');
        const cancelBtn = document.getElementById('cancelShutdownBtn');
        
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                this.initiateShutdown();
            });
        }
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.cancelShutdown();
            });
        }
        
        // Modal close event
        const shutdownModal = document.getElementById('shutdownModal');
        if (shutdownModal) {
            this.shutdownModal = new bootstrap.Modal(shutdownModal);
            shutdownModal.addEventListener('hidden.bs.modal', () => {
                this.resetModal();
            });
        }
    }
    
    static showShutdownModal() {
        if (this.shutdownModal) {
            this.resetModal();
            this.shutdownModal.show();
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
                this.showShutdownStatus(data.message, data.countdown);
                
                // Start countdown
                this.startCountdown(data.countdown);
                
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
                if (this.shutdownTimer) {
                    clearInterval(this.shutdownTimer);
                    this.shutdownTimer = null;
                }
                
                // Reset modal
                this.resetModal();
                
                // Close modal
                this.shutdownModal.hide();
                
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
        
        this.shutdownTimer = setInterval(() => {
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
                clearInterval(this.shutdownTimer);
                this.shutdownTimer = null;
                
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
    
    static resetModal() {
        // Stop any running countdown
        if (this.shutdownTimer) {
            clearInterval(this.shutdownTimer);
            this.shutdownTimer = null;
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
} 