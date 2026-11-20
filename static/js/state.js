// state.js - Remember the Remote Control tab state across page loads.
//
// The server embeds the last saved state in the page (window.oreiInitialState),
// so the first paint shows the real mode, inputs, and audio instead of single
// screen. The device is still queried on load and corrects anything that
// changed. A snapshot is saved after each refresh and each change in the UI.

export const UiState = {
    // Copy saved mode and window inputs into app state. Call before modules
    // draw anything (they read window.oreiApp during init).
    applyAppState() {
        const saved = window.oreiInitialState || {};
        if (saved.mode) window.oreiApp.currentMode = saved.mode;
        if (saved.windowInputs) {
            for (const [win, input] of Object.entries(saved.windowInputs)) {
                window.oreiApp.windowInputs[win] = input;
            }
        }
    },

    // Set form controls from the saved state. Call after modules init.
    applyControls() {
        const saved = window.oreiInitialState || {};
        const set = (id, prop, value) => {
            const el = document.getElementById(id);
            if (el && value !== undefined) el[prop] = value;
        };
        set('displayMode', 'value', String(window.oreiApp.currentMode));
        set('displayModeAdvanced', 'value', String(window.oreiApp.currentMode));
        if (saved.audioSource !== undefined) {
            set('audioSource', 'value', String(saved.audioSource));
            set('audioSourceAdvanced', 'value', String(saved.audioSource));
        }
        if (saved.volume !== undefined) {
            for (const id of ['volumeSlider', 'remoteVolumeSlider']) set(id, 'value', saved.volume);
            for (const id of ['volumeValue', 'remoteVolumeValue']) set(id, 'textContent', saved.volume);
        }
        if (saved.muted !== undefined) {
            set('muteSwitch', 'checked', saved.muted);
            set('remoteMuteSwitch', 'checked', saved.muted);
        }
    },

    // Save the current state. Batched so a burst of changes sends one request.
    save() {
        clearTimeout(this._timer);
        this._timer = setTimeout(() => this._send(), 500);
    },

    _send() {
        const num = id => {
            const v = parseInt(document.getElementById(id)?.value, 10);
            return Number.isNaN(v) ? undefined : v;
        };
        const state = {
            mode: window.oreiApp.currentMode,
            windowInputs: window.oreiApp.windowInputs,
            audioSource: num('audioSource'),
            volume: num('remoteVolumeSlider'),
            muted: document.getElementById('remoteMuteSwitch')?.checked,
        };
        fetch('/api/ui-state', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(state),
        }).catch(() => { /* best effort; the next save retries */ });
    },
};
