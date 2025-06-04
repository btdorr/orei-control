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
        // Audio source
        const audioSource = document.getElementById('audioSource');
        if (audioSource) {
            audioSource.addEventListener('change', (e) => {
                this.setSource(e.target.value);
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
        await API.sendCommand(`s output audio vol ${volume}!`);
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
        const [audioResponse, volResponse, muteResponse] = await Promise.all([
            API.sendCommandSilent('r output audio!'),
            API.sendCommandSilent('r output audio vol!'),
            API.sendCommandSilent('r output audio mute!')
        ]);
        
        // Get audio source
        if (audioResponse) {
            const audioSource = document.getElementById('audioSource');
            if (audioSource) {
                const match = audioResponse.match(/follow window (\d)|HDMI (\d)/);
                if (match) {
                    audioSource.value = match[1] ? '0' : match[2];
                }
            }
        }
        
        // Get volume
        if (volResponse) {
            const match = volResponse.match(/volume: (\d+)/);
            if (match) {
                const volume = parseInt(match[1]);
                const volumeSlider = document.getElementById('volumeSlider');
                if (volumeSlider) {
                    volumeSlider.value = volume;
                    this.updateVolumeDisplay(volume);
                }
            }
        }
        
        // Get mute status
        if (muteResponse) {
            const muteSwitch = document.getElementById('muteSwitch');
            if (muteSwitch) {
                muteSwitch.checked = muteResponse.includes('mute: on');
            }
        }
    }
};