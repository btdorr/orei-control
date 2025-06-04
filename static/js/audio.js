// audio.js - Audio control functions for Orei Control Panel

import { API } from './api.js';
import { Utils } from './utils.js';

export const AudioControl = {
    // Initialize audio controls
    init() {
        this.setupEventListeners();
    },
    
    // Set up event listeners
    setupEventListeners() {
        // Audio source (both simple and advanced)
        const audioSource = document.getElementById('audioSource');
        const audioSourceAdvanced = document.getElementById('audioSourceAdvanced');
        
        if (audioSource) {
            audioSource.addEventListener('change', (e) => {
                this.setSource(e.target.value);
                // Sync with advanced selector
                if (audioSourceAdvanced) audioSourceAdvanced.value = e.target.value;
            });
        }
        
        if (audioSourceAdvanced) {
            audioSourceAdvanced.addEventListener('change', (e) => {
                this.setSource(e.target.value);
                // Sync with simple selector
                if (audioSource) audioSource.value = e.target.value;
            });
        }
        
        // Volume slider
        const volumeSlider = document.getElementById('volumeSlider');
        if (volumeSlider) {
            // Update display on input
            volumeSlider.addEventListener('input', (e) => {
                this.updateVolumeDisplay(e.target.value);
            });
            
            // Send command on change (debounced)
            const debouncedSetVolume = Utils.debounce((value) => {
                this.setVolume(value);
            }, 300);
            
            volumeSlider.addEventListener('change', (e) => {
                debouncedSetVolume(e.target.value);
            });
        }
        
        // Volume up button
        const volumeUpBtn = document.getElementById('volumeUpBtn');
        if (volumeUpBtn) {
            volumeUpBtn.addEventListener('click', () => {
                this.adjustVolume(5);
            });
        }
        
        // Volume down button
        const volumeDownBtn = document.getElementById('volumeDownBtn');
        if (volumeDownBtn) {
            volumeDownBtn.addEventListener('click', () => {
                this.adjustVolume(-5);
            });
        }
        
        // Mute switch
        const muteSwitch = document.getElementById('muteSwitch');
        if (muteSwitch) {
            muteSwitch.addEventListener('change', (e) => {
                this.toggleMute(e.target.checked);
            });
        }
    },
    
    // Set audio source
    async setSource(source) {
        await API.sendCommand(`s output audio ${source}!`);
    },
    
    // Set volume
    async setVolume(volume) {
        await API.sendCommandSilent(`s output audio vol ${volume}!`);
    },
    
    // Update volume display
    updateVolumeDisplay(volume) {
        const display = document.getElementById('volumeValue');
        if (display) {
            display.textContent = volume;
        }
    },
    
    // Toggle mute
    async toggleMute(muted) {
        await API.sendCommand(`s output audio mute ${muted ? '1' : '0'}!`);
    },
    
    // Load audio settings from device
    async loadSettings() {
        // Add a small delay to ensure device is ready
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Send commands sequentially to avoid RS-232 communication issues
        const audioResponse = await API.sendCommandSilent('r output audio!');
        await new Promise(resolve => setTimeout(resolve, 200)); // Small delay between commands
        
        const volResponse = await API.sendCommandSilent('r output audio vol!');
        await new Promise(resolve => setTimeout(resolve, 200)); // Small delay between commands
        
        const muteResponse = await API.sendCommandSilent('r output audio mute!');
        
        // Get audio source
        if (audioResponse && audioResponse !== 'No response') {
            const audioSource = document.getElementById('audioSource');
            const audioSourceAdvanced = document.getElementById('audioSourceAdvanced');
            if (audioSource || audioSourceAdvanced) {
                const match = audioResponse.match(/output audio: (follow window (\d)|HDMI (\d))/);
                if (match) {
                    const value = match[2] ? '0' : match[3];
                    if (audioSource) audioSource.value = value;
                    if (audioSourceAdvanced) audioSourceAdvanced.value = value;
                }
            }
        }
        
        // Get volume - retry if no response
        let volumeValue = null;
        if (volResponse && volResponse !== 'No response') {
            const match = volResponse.match(/audio volume: (\d+)/);
            if (match) {
                volumeValue = parseInt(match[1]);
            }
        } else {
            // Retry volume command after a delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            const retryVolResponse = await API.sendCommandSilent('r output audio vol!');
            if (retryVolResponse && retryVolResponse !== 'No response') {
                const match = retryVolResponse.match(/audio volume: (\d+)/);
                if (match) {
                    volumeValue = parseInt(match[1]);
                }
            }
        }
        
        // Update volume slider if we got a value
        if (volumeValue !== null) {
            const volumeSlider = document.getElementById('volumeSlider');
            if (volumeSlider) {
                volumeSlider.value = volumeValue;
                this.updateVolumeDisplay(volumeValue);
            }
        }
        
        // Get mute status
        if (muteResponse && muteResponse !== 'No response') {
            const muteSwitch = document.getElementById('muteSwitch');
            if (muteSwitch) {
                muteSwitch.checked = muteResponse.includes('mute: on');
            }
        }
    },
    
    // Adjust volume by delta (positive for up, negative for down)
    async adjustVolume(delta) {
        const volumeSlider = document.getElementById('volumeSlider');
        if (!volumeSlider) return;
        
        const currentVolume = parseInt(volumeSlider.value);
        const newVolume = Math.max(0, Math.min(100, currentVolume + delta));
        
        // Update slider and display
        volumeSlider.value = newVolume;
        this.updateVolumeDisplay(newVolume);
        
        // Send command to device
        await this.setVolume(newVolume);
    }
};