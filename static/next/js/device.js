// device.js - Orei RS-232 protocol: read the matrix state and send changes.
// Serial commands run one at a time on the server, so order decides how fast the UI updates:
// the TV drawing updates from local state first, then reads confirm it.

import { api } from './api.js';
import { notify } from './notice.js';
import { state, update, windowCount, saveUiState } from './store.js';

const VARIANT = { 3: 'PBP', 4: 'triple', 5: 'quad' };
const PIP_POSITIONS = { 'left top': 1, 'left bottom': 2, 'right top': 3, 'right bottom': 4 };

export const RESOLUTIONS = [
    '4096x2160p60', '4096x2160p50', '3840x2160p60', '3840x2160p50', '3840x2160p30', '3840x2160p25',
    '1920x1200p60RB', '1920x1080p60', '1920x1080p50', '1360x768p60', '1280x800p60', '1280x720p60',
    '1280x720p50', '1024x768p60',
];

function parseMode(reply) {
    if (!reply) return null;
    if (/single screen/i.test(reply)) return 1;
    if (/PIP/.test(reply)) return 2;
    if (/PBP/.test(reply)) return 3;
    if (/triple/i.test(reply)) return 4;
    if (/quad/i.test(reply)) return 5;
    return null;
}

let refreshing = null;
export let lastRefresh = 0;

export const Device = {
    async readPower() {
        const reply = await api.command('r power!');
        if (reply === null) {
            update({ connected: false, power: null });
            return null;
        }
        const on = /power on/i.test(reply);
        update({ connected: true, power: on });
        return on;
    },

    // Read everything shown on the main screen. Concurrent calls share one run.
    refresh() {
        if (!refreshing) {
            refreshing = this._refresh().finally(() => {
                refreshing = null;
                update({ refreshing: false });
            });
        }
        return refreshing;
    },

    async _refresh() {
        update({ refreshing: true });
        const on = await this.readPower();
        if (!on) return;
        const mode = parseMode(await api.command('r multiview!'));
        if (mode && mode !== state.mode) update({ mode });
        await this.readInputs();
        await this.readVariant();
        await this.readAudio();
        lastRefresh = Date.now();
        saveUiState();
    },

    async readInputs() {
        const inputs = { ...state.windowInputs };
        for (let win = 1; win <= windowCount(); win++) {
            const match = (await api.command(`r window ${win} in!`))?.match(/HDMI (\d)/);
            if (match) inputs[win] = Number(match[1]);
        }
        update({ windowInputs: inputs });
    },

    async readVariant() {
        if (state.mode === 2) {
            const pos = await api.command('r PIP position!');
            const size = await api.command('r PIP size!');
            const patch = {};
            for (const [text, value] of Object.entries(PIP_POSITIONS)) {
                if (pos?.includes(text)) patch.pipPosition = value;
            }
            if (/small/i.test(size || '')) patch.pipSize = 1;
            else if (/middle|medium/i.test(size || '')) patch.pipSize = 2;
            else if (/large/i.test(size || '')) patch.pipSize = 3;
            update(patch);
        } else if (VARIANT[state.mode]) {
            const match = (await api.command(`r ${VARIANT[state.mode]} mode!`))?.match(/mode (\d)/);
            if (match) update({ submode: Number(match[1]) });
        }
    },

    async readAudio() {
        const patch = {};
        const source = await api.command('r output audio!');
        const sourceMatch = source?.match(/follow window|HDMI (\d)/i);
        if (sourceMatch) patch.audioSource = sourceMatch[1] ? Number(sourceMatch[1]) : 0;
        const vol = (await api.command('r output audio vol!'))?.match(/volume: (\d+)/);
        if (vol) patch.volume = Number(vol[1]);
        const mute = await api.command('r output audio mute!');
        if (mute) patch.muted = /mute: on/i.test(mute);
        update(patch);
    },

    async setLayout(layout) {
        const before = { mode: state.mode, submode: state.submode };
        update({ mode: layout.mode, submode: layout.submode ?? state.submode });
        if (await api.command(`s multiview ${layout.mode}!`) === null) {
            update(before);
            return;
        }
        if (layout.submode) await api.command(`s ${VARIANT[layout.mode]} mode ${layout.submode}!`);
        saveUiState();
        await this.readInputs();
        saveUiState();
    },

    async setPip(patch) {
        const before = { pipPosition: state.pipPosition, pipSize: state.pipSize };
        update(patch);
        const cmd = patch.pipPosition ? `s PIP position ${patch.pipPosition}!` : `s PIP size ${patch.pipSize}!`;
        if (await api.command(cmd) === null) update(before);
        else saveUiState();
    },

    async setInput(win, hdmi) {
        const before = { ...state.windowInputs };
        update({ windowInputs: { ...state.windowInputs, [win]: hdmi } });
        if (await api.command(`s window ${win} in ${hdmi}!`) === null) update({ windowInputs: before });
        else saveUiState();
    },

    async setAudioSource(source) {
        const before = state.audioSource;
        update({ audioSource: source });
        if (await api.command(`s output audio ${source}!`) === null) update({ audioSource: before });
        else saveUiState();
    },

    async setVolume(volume) {
        update({ volume });
        if (await api.command(`s output audio vol ${volume}!`) !== null) saveUiState();
    },

    async setMute(muted) {
        update({ muted });
        if (await api.command(`s output audio mute ${muted ? 1 : 0}!`) === null) update({ muted: !muted });
        else saveUiState();
    },

    async setPower(on) {
        if (await api.command(on ? 'power 1!' : 'power 0!') === null) return;
        notify(on ? 'Turning on the matrix' : 'Turning off the matrix', 'info');
        await new Promise(r => setTimeout(r, on ? 5000 : 2000));
        await this.refresh();
    },

    // Settings panel values
    async readOutput() {
        const res = await api.command('r output res!');
        const hdcp = await api.command('r output hdcp!');
        let aspect = null;
        if (VARIANT[state.mode]) {
            const reply = await api.command(`r ${VARIANT[state.mode]} aspect!`);
            if (reply) aspect = /full screen/i.test(reply) ? 1 : 2;
        }
        return {
            res: RESOLUTIONS.findIndex(r => res?.includes(r)) + 1 || null,
            hdcp: /2\.2/.test(hdcp || '') ? 2 : /1\.4/.test(hdcp || '') ? 1 : /off/i.test(hdcp || '') ? 3 : null,
            aspect,
        };
    },

    setResolution(n) { return api.command(`s output res ${n}!`); },
    setHdcp(n) { return api.command(`s output hdcp ${n}!`); },
    setAspect(n) { return VARIANT[state.mode] ? api.command(`s ${VARIANT[state.mode]} aspect ${n}!`) : null; },
};
