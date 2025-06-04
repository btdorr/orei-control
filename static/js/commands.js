// commands.js - Command history and debug console for Orei Control Panel

import { API } from './api.js';
import { Utils } from './utils.js';

export const CommandHistory = {
    maxHistory: 50,
    
    // Initialize command history
    init() {
        this.setupEventListeners();
        // Make available globally for API module
        window.CommandHistory = this;
    },
    
    // Set up event listeners
    setupEventListeners() {
        // Clear history button
        const clearBtn = document.getElementById('clearHistory');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clear());
        }
        
        // Debug console
        const sendBtn = document.getElementById('sendDebugCmd');
        const input = document.getElementById('debugCommand');
        
        if (sendBtn && input) {
            sendBtn.addEventListener('click', () => this.sendDebugCommand());
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.sendDebugCommand();
                }
            });
        }
    },
    
    // Add command to history table
    add(command, response) {
        const time = Utils.formatTime();
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="text-nowrap">${time}</td>
            <td class="font-monospace">${this.escapeHtml(command)}</td>
            <td class="font-monospace">${this.escapeHtml(response || '-')}</td>
        `;
        
        const historyBody = document.getElementById('commandHistory');
        if (historyBody) {
            historyBody.insertBefore(row, historyBody.firstChild);
            
            // Keep only last N commands
            while (historyBody.children.length > this.maxHistory) {
                historyBody.removeChild(historyBody.lastChild);
            }
        }
    },
    
    // Clear command history
    async clear() {
        const historyBody = document.getElementById('commandHistory');
        if (historyBody) {
            historyBody.innerHTML = '';
        }
        
        // Clear on server too
        await API.clearHistory();
    },
    
    // Send debug command
    async sendDebugCommand() {
        const input = document.getElementById('debugCommand');
        const output = document.getElementById('debugOutput');
        
        if (!input || !output) return;
        
        const command = input.value.trim();
        if (!command) return;
        
        // Send command
        const response = await API.sendCommand(command);
        
        // Update debug output
        output.innerHTML += `<div class="text-primary">&gt; ${this.escapeHtml(command)}</div>`;
        output.innerHTML += `<div class="text-success">${this.escapeHtml(response || 'No response')}</div>`;
        output.scrollTop = output.scrollHeight;
        
        // Clear input
        input.value = '';
    },
    
    // Load history from server
    async loadHistory() {
        const history = await API.getHistory();
        const historyBody = document.getElementById('commandHistory');
        
        if (!historyBody) return;
        
        historyBody.innerHTML = '';
        history.forEach(entry => {
            this.add(entry.command, entry.response);
        });
    },
    
    // Escape HTML to prevent XSS
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};