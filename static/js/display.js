// display.js - Display diagram and UI management for Orei Control Panel

import { API } from './api.js';
import { Utils } from './utils.js';

export const DisplayManager = {
    // Initialize display controls
    init() {
        this.setupEventListeners();
    },
    
    // Set up event listeners
    setupEventListeners() {
        // Window input selector
        const windowInputSelect = document.getElementById('windowInputSelect');
        if (windowInputSelect) {
            windowInputSelect.addEventListener('change', async (e) => {
                if (window.oreiApp.selectedWindow) {
                    await this.setWindowInput(window.oreiApp.selectedWindow, e.target.value);
                }
            });
        }
    },
    
    // Update display diagram based on current mode and settings
    updateDiagram() {
        const diagram = document.getElementById('displayDiagram');
        if (!diagram) return;
        
        diagram.innerHTML = '';
        
        switch (window.oreiApp.currentMode) {
            case 1: // Single screen
                this.createDisplayWindow(diagram, 1, 'single');
                break;
                
            case 2: // PIP
                this.createDisplayWindow(diagram, 1, 'main');
                
                // Get current PIP position and size
                const pipPosition = document.getElementById('pipPosition')?.value || '3';
                const pipSize = document.getElementById('pipSize')?.value || '2';
                
                // Create PIP window with position and size
                this.createPIPWindow(diagram, 2, pipPosition, pipSize);
                break;
                
            case 3: // PBP
                const pbpMode = document.getElementById('pbpMode')?.value || '1';
                
                if (pbpMode === '2') {
                    // PBP Mode 2 - Window 1 large (75%), Window 2 small (25%)
                    this.createDisplayWindow(diagram, 1, 'pbp-large'); // 75% width, left side
                    this.createDisplayWindow(diagram, 2, 'pbp-small'); // 25% width, right side
                } else {
                    // PBP Mode 1 - Side by side (50/50)
                    this.createDisplayWindow(diagram, 1, 'pbp-left'); // 50% width, left side
                    this.createDisplayWindow(diagram, 2, 'pbp-right'); // 50% width, right side
                }
                break;
                
            case 4: // Triple
                const tripleMode = document.getElementById('tripleMode')?.value || '1';
                if (tripleMode === '2') {
                    // Triple Mode 2 - same orientation as mode 1 but Windows 2 & 3 are 25% width each
                    this.createDisplayWindow(diagram, 1, 'triple-main-narrow'); // 50% width, left side
                    this.createDisplayWindow(diagram, 2, 'triple-small-top'); // 25% width, top right
                    this.createDisplayWindow(diagram, 3, 'triple-small-bottom'); // 25% width, bottom right
                } else {
                    // Triple Mode 1 - one large left, two stacked right (standard sizes)
                    this.createDisplayWindow(diagram, 1, 'triple-main'); // 60% width, left side
                    this.createDisplayWindow(diagram, 2, 'triple-top'); // 40% width, top right
                    this.createDisplayWindow(diagram, 3, 'triple-bottom'); // 40% width, bottom right
                }
                break;
                
            case 5: // Quad
                const quadMode = document.getElementById('quadMode')?.value || '1';
                if (quadMode === '2') {
                    // Quad Mode 2 - Window 1 large left (75%), Windows 2,3,4 stacked right (25% width each)
                    this.createDisplayWindow(diagram, 1, 'quad-main'); // 75% width, left side
                    this.createDisplayWindow(diagram, 2, 'quad-stack-top'); // 25% width, top right
                    this.createDisplayWindow(diagram, 3, 'quad-stack-middle'); // 25% width, middle right
                    this.createDisplayWindow(diagram, 4, 'quad-stack-bottom'); // 25% width, bottom right
                } else if (quadMode === '3') {
                    // Quad Mode 3 - Windows 1,2,3 stacked left (25% width each), Window 4 large right (75%)
                    this.createDisplayWindow(diagram, 1, 'quad-left-top'); // 25% width, top left
                    this.createDisplayWindow(diagram, 2, 'quad-left-middle'); // 25% width, middle left
                    this.createDisplayWindow(diagram, 3, 'quad-left-bottom'); // 25% width, bottom left
                    this.createDisplayWindow(diagram, 4, 'quad-right-main'); // 75% width, right side
                } else {
                    // Quad Mode 1 - 2x2 grid (default)
                    this.createDisplayWindow(diagram, 1, 'quad');
                    this.createDisplayWindow(diagram, 2, 'quad');
                    this.createDisplayWindow(diagram, 3, 'quad');
                    this.createDisplayWindow(diagram, 4, 'quad');
                }
                break;
                
            default:
                this.createDisplayWindow(diagram, 1, 'single');
                break;
        }
    },
    
    // Create a display window element with proper styling
    createDisplayWindow(parent, num, layoutClass) {
        const windowElement = document.createElement('div');
        windowElement.className = `display-window ${layoutClass}`;
        windowElement.dataset.window = num;
        
        // Safely get input value with fallback - ensure we're getting the right input for each window
        const input = (window.oreiApp && window.oreiApp.windowInputs && typeof window.oreiApp.windowInputs[num] !== 'undefined') 
            ? window.oreiApp.windowInputs[num] 
            : num; // fallback to window number if input not set
        
        // Create window content
        windowElement.innerHTML = `
            <div class="window-label">Window ${num} - HDMI ${input}</div>
        `;
        
        windowElement.addEventListener('click', () => this.selectWindow(num));
        parent.appendChild(windowElement);
    },
    
    // Create PIP window with specific positioning
    createPIPWindow(parent, num, position, size) {
        const windowElement = document.createElement('div');
        windowElement.className = 'display-window pip';
        windowElement.dataset.window = num;
        
        // Apply size
        const sizeMap = {'1': '20%', '2': '25%', '3': '30%'}; // Small, Medium, Large
        const dimension = sizeMap[size] || '25%';
        windowElement.style.width = dimension;
        windowElement.style.height = dimension;
        
        // Apply position
        const margin = '20px';
        switch (position) {
            case '1': // Left Top
                windowElement.style.top = margin;
                windowElement.style.left = margin;
                windowElement.style.bottom = 'auto';
                windowElement.style.right = 'auto';
                break;
            case '2': // Left Bottom
                windowElement.style.bottom = margin;
                windowElement.style.left = margin;
                windowElement.style.top = 'auto';
                windowElement.style.right = 'auto';
                break;
            case '3': // Right Top
                windowElement.style.top = margin;
                windowElement.style.right = margin;
                windowElement.style.bottom = 'auto';
                windowElement.style.left = 'auto';
                break;
            case '4': // Right Bottom
                windowElement.style.bottom = margin;
                windowElement.style.right = margin;
                windowElement.style.top = 'auto';
                windowElement.style.left = 'auto';
                break;
            default:
                windowElement.style.top = margin;
                windowElement.style.right = margin;
        }
        
        // Get input value - be more explicit about the retrieval
        let input = num; // default fallback
        if (window.oreiApp && window.oreiApp.windowInputs) {
            if (window.oreiApp.windowInputs.hasOwnProperty(num)) {
                input = window.oreiApp.windowInputs[num];
            }
        }
        
        windowElement.innerHTML = `
            <div class="window-label">Window ${num} - HDMI ${input}</div>
        `;
        
        windowElement.addEventListener('click', () => this.selectWindow(num));
        parent.appendChild(windowElement);
    },
    
    // Handle window selection
    selectWindow(num) {
        window.oreiApp.selectedWindow = num;
        
        // Update UI
        document.querySelectorAll('.display-window').forEach(el => el.classList.remove('active'));
        document.querySelector(`[data-window="${num}"]`)?.classList.add('active');
        
        const selectedWindowLabel = document.getElementById('selectedWindow');
        const windowInputSelect = document.getElementById('windowInputSelect');
        const inputSelectors = document.getElementById('inputSelectors');
        
        if (selectedWindowLabel) selectedWindowLabel.textContent = num;
        if (windowInputSelect) {
            // Safely get window input value
            const inputValue = (window.oreiApp && window.oreiApp.windowInputs && window.oreiApp.windowInputs[num]) || 1;
            windowInputSelect.value = inputValue;
        }
        if (inputSelectors) inputSelectors.style.display = 'block';
    },
    
    // Set window input source
    async setWindowInput(windowNum, input) {
        await API.sendCommand(`s window ${windowNum} in ${input}!`);
        
        // Ensure windowInputs object exists
        if (!window.oreiApp.windowInputs) {
            window.oreiApp.windowInputs = {};
        }
        
        window.oreiApp.windowInputs[windowNum] = parseInt(input);
        this.updateDiagram();
        Utils.showToast(`Window ${windowNum} set to HDMI ${input}`, 'success');
        
        // Hide input selectors and clear selection
        const inputSelectors = document.getElementById('inputSelectors');
        if (inputSelectors) inputSelectors.style.display = 'none';
        
        // Clear selected window state
        window.oreiApp.selectedWindow = null;
        
        // Remove active class from all windows
        document.querySelectorAll('.display-window').forEach(el => el.classList.remove('active'));
        
        // Dispatch event to notify that window inputs have changed
        document.dispatchEvent(new CustomEvent('windowInputsChanged'));
    },
    
    // Get window inputs from device
    async getWindowInputs() {
        const windowCount = this.getWindowCount();
        
        // Initialize windowInputs if not exists
        if (!window.oreiApp.windowInputs) {
            window.oreiApp.windowInputs = {};
        }
        
        // Create array of promises for parallel execution
        const inputPromises = [];
        for (let i = 1; i <= windowCount; i++) {
            inputPromises.push(
                API.sendCommandSilent(`r window ${i} in!`).then(response => ({
                    windowNum: i,
                    response: response
                }))
            );
        }
        
        // Execute all window input queries in parallel
        try {
            const results = await Promise.all(inputPromises);
            
            // Process results
            results.forEach(({ windowNum, response }) => {
                if (response) {
                    const match = response.match(/HDMI (\d)/);
                    if (match) {
                        window.oreiApp.windowInputs[windowNum] = parseInt(match[1]);
                    } else {
                        // Fallback if response doesn't match expected pattern
                        window.oreiApp.windowInputs[windowNum] = windowNum;
                    }
                } else {
                    // Fallback if no response
                    window.oreiApp.windowInputs[windowNum] = windowNum;
                }
            });
        } catch (error) {
            console.error('Error loading window inputs:', error);
            // Set fallback values
            for (let i = 1; i <= windowCount; i++) {
                window.oreiApp.windowInputs[i] = i;
            }
        }
        
        // Dispatch event to notify that window inputs have been loaded
        document.dispatchEvent(new CustomEvent('windowInputsChanged'));
    },
    
    // Get number of windows for current mode
    getWindowCount() {
        switch (window.oreiApp.currentMode) {
            case 1: return 1;  // Single
            case 2: return 2;  // PIP
            case 3: return 2;  // PBP
            case 4: return 3;  // Triple
            case 5: return 4;  // Quad
            default: return 1;
        }
    },
    
    // Update mode-specific settings UI
    async updateModeSettings() {
        // Hide all settings
        document.querySelectorAll('#modeSettings > div').forEach(el => el.style.display = 'none');
        
        // Show relevant settings and query current values from device
        switch (window.oreiApp.currentMode) {
            case 2: // PIP
                document.getElementById('pipSettings').style.display = 'block';
                await this.loadPIPSettings();
                break;
                
            case 3: // PBP
                document.getElementById('pbpSettings').style.display = 'block';
                await this.loadPBPSettings();
                break;
                
            case 4: // Triple
                document.getElementById('tripleSettings').style.display = 'block';
                await this.loadTripleSettings();
                break;
                
            case 5: // Quad
                document.getElementById('quadSettings').style.display = 'block';
                await this.loadQuadSettings();
                break;
        }
        
        // Don't update diagram here - let it be called after windowInputs are loaded
        // this.updateDiagram();
    },
    
    // Load PIP settings from device
    async loadPIPSettings() {
        const [pipPosResponse, pipSizeResponse] = await Promise.all([
            API.sendCommandSilent('r PIP position!'),
            API.sendCommandSilent('r PIP size!')
        ]);
        
        if (pipPosResponse) {
            const pipPosition = document.getElementById('pipPosition');
            if (pipPosition) {
                if (pipPosResponse.includes('left top')) pipPosition.value = '1';
                else if (pipPosResponse.includes('left bottom')) pipPosition.value = '2';
                else if (pipPosResponse.includes('right top')) pipPosition.value = '3';
                else if (pipPosResponse.includes('right bottom')) pipPosition.value = '4';
            }
        }
        
        if (pipSizeResponse) {
            const pipSize = document.getElementById('pipSize');
            if (pipSize) {
                if (pipSizeResponse.includes('small')) pipSize.value = '1';
                else if (pipSizeResponse.includes('middle') || pipSizeResponse.includes('medium')) pipSize.value = '2';
                else if (pipSizeResponse.includes('large')) pipSize.value = '3';
            }
        }
    },
    
    // Load PBP settings
    async loadPBPSettings() {
        const [pbpModeResponse, pbpAspectResponse] = await Promise.all([
            API.sendCommandSilent('r PBP mode!'),
            API.sendCommandSilent('r PBP aspect!')
        ]);
        
        if (pbpModeResponse) {
            const match = pbpModeResponse.match(/mode (\d)/);
            const pbpMode = document.getElementById('pbpMode');
            if (match && pbpMode) pbpMode.value = match[1];
        }
        
        if (pbpAspectResponse) {
            const pbpAspect = document.getElementById('pbpAspect');
            if (pbpAspect) {
                pbpAspect.value = pbpAspectResponse.includes('full screen') ? '1' : '2';
            }
        }
    },
    
    // Load Triple settings
    async loadTripleSettings() {
        const [tripleModeResponse, tripleAspectResponse] = await Promise.all([
            API.sendCommandSilent('r triple mode!'),
            API.sendCommandSilent('r triple aspect!')
        ]);
        
        if (tripleModeResponse) {
            const match = tripleModeResponse.match(/mode (\d)/);
            const tripleMode = document.getElementById('tripleMode');
            if (match && tripleMode) tripleMode.value = match[1];
        }
        
        if (tripleAspectResponse) {
            const tripleAspect = document.getElementById('tripleAspect');
            if (tripleAspect) {
                tripleAspect.value = tripleAspectResponse.includes('full screen') ? '1' : '2';
            }
        }
    },
    
    // Load Quad settings
    async loadQuadSettings() {
        const [quadModeResponse, quadAspectResponse] = await Promise.all([
            API.sendCommandSilent('r quad mode!'),
            API.sendCommandSilent('r quad aspect!')
        ]);
        
        if (quadModeResponse) {
            const match = quadModeResponse.match(/mode (\d)/);
            const quadMode = document.getElementById('quadMode');
            if (match && quadMode) quadMode.value = match[1];
        }
        
        if (quadAspectResponse) {
            const quadAspect = document.getElementById('quadAspect');
            if (quadAspect) {
                quadAspect.value = quadAspectResponse.includes('full screen') ? '1' : '2';
            }
        }
    }
};