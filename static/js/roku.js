// roku.js - Roku ECP control for Orei Control Panel

import { API } from './api.js';
import { Utils } from './utils.js';

export const RokuControl = {
    mappings: {},
    
    // Initialize Roku controls
    init() {
        this.loadMappings();
        this.setupEventListeners();
    },
    
    // Set up event listeners
    setupEventListeners() {
        // Configure Roku devices button (opens modal)
        const configureBtn = document.getElementById('configureRokuBtn');
        if (configureBtn) {
            configureBtn.addEventListener('click', () => this.openConfigModal());
        }
        
        // Manage Roku devices button in header (opens modal)
        const manageBtn = document.getElementById('manageRokuBtn');
        if (manageBtn) {
            manageBtn.addEventListener('click', () => this.openConfigModal());
        }
        
        // Roku device discovery buttons (both the hidden one and modal one)
        const discoverBtn = document.getElementById('discoverRokuBtn');
        if (discoverBtn) {
            discoverBtn.addEventListener('click', () => this.discoverDevices());
        }
        
        const discoverBtnModal = document.getElementById('discoverRokuBtnModal');
        if (discoverBtnModal) {
            discoverBtnModal.addEventListener('click', () => this.discoverDevices());
        }
        
        // Save mappings button
        const saveMappingsBtn = document.getElementById('saveMappingsBtn');
        if (saveMappingsBtn) {
            saveMappingsBtn.addEventListener('click', () => this.saveMappings());
        }
        
        // Refresh Roku remotes when display mode changes
        document.addEventListener('displayModeChanged', () => {
            this.updateRokuRemotes();
        });
        
        // Refresh Roku remotes when window inputs are loaded/changed
        document.addEventListener('windowInputsChanged', () => {
            this.updateRokuRemotes();
        });
        
        // Refresh Roku remotes when device settings are refreshed
        document.addEventListener('deviceSettingsRefreshed', () => {
            this.updateRokuRemotes();
        });
    },
    
    // Load Roku device mappings
    async loadMappings() {
        try {
            const response = await fetch('/api/roku/mappings');
            const data = await response.json();
            
            if (data.success) {
                this.mappings = data.mappings;
                this.updateMappingUI();
                this.updateRokuRemotes();
            }
        } catch (error) {
            console.error('Error loading Roku mappings:', error);
            // Still call updateRokuRemotes to show config prompt
            this.updateRokuRemotes();
        }
    },
    
    // Discover Roku devices on network
    async discoverDevices() {
        Utils.showToast('Discovering Roku devices...', 'info', 5000);
        
        try {
            const response = await fetch('/api/roku/discover');
            const data = await response.json();
            
            if (data.success) {
                this.displayDiscoveredDevices(data.devices);
                Utils.showToast(`Found ${data.devices.length} Roku device(s)`, 'success');
            } else {
                Utils.showToast(`Discovery failed: ${data.error}`, 'danger');
            }
        } catch (error) {
            Utils.showToast(`Discovery error: ${error.message}`, 'danger');
        }
    },
    
    // Display discovered devices in UI
    displayDiscoveredDevices(devices) {
        // Use modal container when in modal context
        const container = document.getElementById('discoveredDevicesModal') || document.getElementById('discoveredDevices');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (devices.length === 0) {
            container.innerHTML = '<p class="text-muted">No Roku devices found</p>';
            return;
        }
        
        devices.forEach(device => {
            const deviceCard = document.createElement('div');
            deviceCard.className = 'card mb-2';
            deviceCard.innerHTML = `
                <div class="card-body">
                    <h6 class="card-title">${device.name}</h6>
                    <p class="card-text">
                        <small class="text-muted">
                            IP: ${device.ip}<br>
                            Model: ${device.model}<br>
                            Serial: ${device.serial}
                        </small>
                    </p>
                    <select class="form-select form-select-sm" data-device-ip="${device.ip}">
                        <option value="">Select HDMI Input</option>
                        <option value="1">HDMI 1</option>
                        <option value="2">HDMI 2</option>
                        <option value="3">HDMI 3</option>
                        <option value="4">HDMI 4</option>
                    </select>
                </div>
            `;
            container.appendChild(deviceCard);
        });
    },
    
    // Save device mappings
    async saveMappings() {
        const mappings = {};
        
        // Collect mappings from discovery UI (check modal container first)
        const modalContainer = document.getElementById('discoveredDevicesModal');
        const container = modalContainer && modalContainer.offsetParent !== null ? modalContainer : document.getElementById('discoveredDevices');
        
        if (container) {
            const selects = container.querySelectorAll('select');
            selects.forEach(select => {
                const hdmi = select.value;
                const ip = select.dataset.deviceIp;
                
                if (hdmi && ip) {
                    // Get device info from the card
                    const card = select.closest('.card');
                    const name = card.querySelector('.card-title').textContent;
                    const model = card.querySelector('.card-text').textContent.match(/Model: ([^\n]+)/)?.[1] || 'Unknown';
                    const serial = card.querySelector('.card-text').textContent.match(/Serial: ([^\n]+)/)?.[1] || 'Unknown';
                    
                    mappings[hdmi] = {
                        ip: ip,
                        name: name,
                        model: model,
                        serial: serial
                    };
                }
            });
        }
        
        try {
            const response = await fetch('/api/roku/mappings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mappings: mappings })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.mappings = mappings;
                this.updateMappingUI();
                this.updateRokuRemotes();
                Utils.showToast('Roku mappings saved successfully', 'success');
                
                // Close the modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('rokuConfigModal'));
                if (modal) {
                    modal.hide();
                }
            } else {
                Utils.showToast(`Failed to save mappings: ${data.error}`, 'danger');
            }
        } catch (error) {
            Utils.showToast(`Error saving mappings: ${error.message}`, 'danger');
        }
    },
    
    // Update mapping UI display
    updateMappingUI() {
        // Use modal container when in modal context
        const container = document.getElementById('currentMappingsModal') || document.getElementById('currentMappings');
        if (!container) return;
        
        container.innerHTML = '';
        
        for (const [hdmi, device] of Object.entries(this.mappings)) {
            const mappingItem = document.createElement('div');
            mappingItem.className = 'mb-2';
            mappingItem.innerHTML = `
                <strong>HDMI ${hdmi}:</strong> ${device.name} (${device.ip})
                <button class="btn btn-sm btn-outline-danger ms-2" onclick="RokuControl.removeMapping('${hdmi}')">
                    Remove
                </button>
            `;
            container.appendChild(mappingItem);
        }
        
        if (Object.keys(this.mappings).length === 0) {
            container.innerHTML = '<p class="text-muted">No devices mapped</p>';
        }
    },
    
    // Remove device mapping
    async removeMapping(hdmi) {
        delete this.mappings[hdmi];
        
        try {
            const response = await fetch('/api/roku/mappings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mappings: this.mappings })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.updateMappingUI();
                this.updateRokuRemotes();
                Utils.showToast('Mapping removed successfully', 'success');
            }
        } catch (error) {
            Utils.showToast(`Error removing mapping: ${error.message}`, 'danger');
        }
    },
    
    // Update visible Roku remotes based on display mode
    updateRokuRemotes() {
        const container = document.getElementById('rokuRemotes');
        const configPrompt = document.getElementById('rokuConfigPrompt');
        const manageBtn = document.getElementById('manageRokuBtn');
        const remotesColumn = document.getElementById('rokuRemotesColumn');
        const deviceManagement = document.getElementById('rokuDeviceManagement');
        if (!container) return;
        
        // Check if any devices are mapped
        const hasMappedDevices = Object.keys(this.mappings).length > 0;
        
        if (!hasMappedDevices) {
            // Show configuration prompt, hide remotes and manage button
            if (configPrompt) configPrompt.style.display = 'block';
            if (manageBtn) manageBtn.style.display = 'none';
            if (deviceManagement) deviceManagement.style.display = 'none';
            if (remotesColumn) {
                remotesColumn.className = 'col-12'; // Full width when no devices
            }
            container.style.display = 'none';
            return;
        }
        
        // Hide configuration prompt, show remotes and manage button
        if (configPrompt) configPrompt.style.display = 'none';
        if (manageBtn) manageBtn.style.display = 'block';
        if (deviceManagement) deviceManagement.style.display = 'none'; // Keep hidden, use modal
        if (remotesColumn) {
            remotesColumn.className = 'col-12'; // Full width for remotes
        }
        // Remove the explicit display style to let CSS handle it
        container.style.display = '';
        container.innerHTML = '';
        
        // Get current display mode and determine which HDMI inputs are visible
        const currentMode = window.oreiApp?.currentMode || 1;
        const visibleInputs = this.getVisibleInputs(currentMode);
        
        visibleInputs.forEach(hdmi => {
            const device = this.mappings[hdmi];
            if (device) {
                const remoteContainer = this.createRokuRemote(hdmi, device);
                container.appendChild(remoteContainer);
            }
        });
        
        // Show "No remotes for current mode" message if no devices mapped for visible inputs
        if (!visibleInputs.some(hdmi => this.mappings[hdmi])) {
            container.innerHTML = '<p class="text-muted text-center">No Roku devices mapped for current display mode</p>';
        }
    },
    
    // Get visible HDMI inputs for current display mode
    getVisibleInputs(mode) {
        switch (mode) {
            case 1: // Single
                // Need to determine which HDMI is currently shown
                return [window.oreiApp?.windowInputs?.[1] || 1];
            case 2: // PIP
                return [
                    window.oreiApp?.windowInputs?.[1] || 1,
                    window.oreiApp?.windowInputs?.[2] || 2
                ];
            case 3: // PBP
                return [
                    window.oreiApp?.windowInputs?.[1] || 1,
                    window.oreiApp?.windowInputs?.[2] || 2
                ];
            case 4: // Triple
                return [
                    window.oreiApp?.windowInputs?.[1] || 1,
                    window.oreiApp?.windowInputs?.[2] || 2,
                    window.oreiApp?.windowInputs?.[3] || 3
                ];
            case 5: // Quad
                return [
                    window.oreiApp?.windowInputs?.[1] || 1,
                    window.oreiApp?.windowInputs?.[2] || 2,
                    window.oreiApp?.windowInputs?.[3] || 3,
                    window.oreiApp?.windowInputs?.[4] || 4
                ];
            default:
                return [1];
        }
    },
    
    // Create Roku remote UI
    createRokuRemote(hdmi, device) {
        const container = document.createElement('div');
        container.className = 'col-xl-3 col-lg-4 col-md-6 mb-4';
        
        container.innerHTML = `
            <div class="card roku-remote">
                <div class="card-header text-center">
                    <h6 class="mb-0">HDMI ${hdmi} - ${device.name}</h6>
                </div>
                <div class="card-body">
                    <!-- Power and Home -->
                    <div class="row mb-2">
                        <div class="col-6">
                            <button class="btn btn-roku btn-sm w-100" data-hdmi="${hdmi}" data-command="Power">
                                <i class="bi bi-power"></i> Power
                            </button>
                        </div>
                        <div class="col-6">
                            <button class="btn btn-roku btn-sm w-100" data-hdmi="${hdmi}" data-command="Home">
                                <i class="bi bi-house"></i> Home
                            </button>
                        </div>
                    </div>
                    
                    <!-- Back and Options -->
                    <div class="row mb-2">
                        <div class="col-6">
                            <button class="btn btn-roku btn-sm w-100" data-hdmi="${hdmi}" data-command="Back">
                                <i class="bi bi-arrow-left"></i> Back
                            </button>
                        </div>
                        <div class="col-6">
                            <button class="btn btn-roku btn-sm w-100" data-hdmi="${hdmi}" data-command="Info">
                                <i class="bi bi-info-circle"></i> Info
                            </button>
                        </div>
                    </div>
                    
                    <!-- D-Pad -->
                    <div class="roku-dpad mb-2">
                        <div class="row">
                            <div class="col-4"></div>
                            <div class="col-4">
                                <button class="btn btn-roku btn-sm w-100" data-hdmi="${hdmi}" data-command="Up">
                                    <i class="bi bi-chevron-up"></i>
                                </button>
                            </div>
                            <div class="col-4"></div>
                        </div>
                        <div class="row">
                            <div class="col-4">
                                <button class="btn btn-roku btn-sm w-100" data-hdmi="${hdmi}" data-command="Left">
                                    <i class="bi bi-chevron-left"></i>
                                </button>
                            </div>
                            <div class="col-4">
                                <button class="btn btn-roku btn-select w-100" data-hdmi="${hdmi}" data-command="Select">
                                    OK
                                </button>
                            </div>
                            <div class="col-4">
                                <button class="btn btn-roku btn-sm w-100" data-hdmi="${hdmi}" data-command="Right">
                                    <i class="bi bi-chevron-right"></i>
                                </button>
                            </div>
                        </div>
                        <div class="row">
                            <div class="col-4"></div>
                            <div class="col-4">
                                <button class="btn btn-roku btn-sm w-100" data-hdmi="${hdmi}" data-command="Down">
                                    <i class="bi bi-chevron-down"></i>
                                </button>
                            </div>
                            <div class="col-4"></div>
                        </div>
                    </div>
                    
                    <!-- Rewind, Play/Pause, Fast Forward -->
                    <div class="row mb-2">
                        <div class="col-4">
                            <button class="btn btn-roku btn-sm w-100" data-hdmi="${hdmi}" data-command="Rev">
                                <i class="bi bi-skip-backward"></i>
                            </button>
                        </div>
                        <div class="col-4">
                            <button class="btn btn-roku btn-sm w-100" data-hdmi="${hdmi}" data-command="Play">
                                <i class="bi bi-play-pause"></i>
                            </button>
                        </div>
                        <div class="col-4">
                            <button class="btn btn-roku btn-sm w-100" data-hdmi="${hdmi}" data-command="Fwd">
                                <i class="bi bi-skip-forward"></i>
                            </button>
                        </div>
                    </div>
                    
                    <!-- Volume -->
                    <div class="row mb-2">
                        <div class="col-6">
                            <button class="btn btn-roku btn-sm w-100" data-hdmi="${hdmi}" data-command="VolumeDown">
                                <i class="bi bi-volume-down"></i>
                            </button>
                        </div>
                        <div class="col-6">
                            <button class="btn btn-roku btn-sm w-100" data-hdmi="${hdmi}" data-command="VolumeUp">
                                <i class="bi bi-volume-up"></i>
                            </button>
                        </div>
                    </div>
                    
                    <!-- Mute -->
                    <div class="row">
                        <div class="col-12">
                            <button class="btn btn-roku btn-sm w-100" data-hdmi="${hdmi}" data-command="VolumeMute">
                                <i class="bi bi-volume-mute"></i> Mute
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Add click event listeners to all buttons
        container.querySelectorAll('.btn-roku').forEach(button => {
            button.addEventListener('click', (e) => {
                const hdmi = e.target.dataset.hdmi || e.target.closest('[data-hdmi]').dataset.hdmi;
                const command = e.target.dataset.command || e.target.closest('[data-command]').dataset.command;
                this.sendCommand(hdmi, command);
            });
        });
        
        return container;
    },
    
    // Send ECP command to Roku device
    async sendCommand(hdmi, command) {
        try {
            const response = await fetch('/api/roku/command', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ hdmi: hdmi, command: command })
            });
            
            const data = await response.json();
            
            if (!data.success) {
                Utils.showToast(`Roku command failed: ${data.error}`, 'danger');
            }
        } catch (error) {
            Utils.showToast(`Roku error: ${error.message}`, 'danger');
        }
    },
    
    // Open configuration modal
    openConfigModal() {
        const modalElement = document.getElementById('rokuConfigModal');
        const modal = new bootstrap.Modal(modalElement);
        
        // Add event listener to handle focus properly when modal closes (only if not already added)
        if (!modalElement.hasAttribute('data-focus-handler-added')) {
            modalElement.setAttribute('data-focus-handler-added', 'true');
            modalElement.addEventListener('hide.bs.modal', function() {
                // Remove focus from any element inside the modal before closing
                const focusedElement = document.activeElement;
                if (modalElement.contains(focusedElement)) {
                    focusedElement.blur();
                }
            });
        }
        
        modal.show();
        
        // Refresh the current mappings display
        this.updateMappingUI();
    }
};

// Make RokuControl available globally for button clicks
window.RokuControl = RokuControl; 