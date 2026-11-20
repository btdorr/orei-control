// store.js - App state, layout geometry, and the saved first-paint snapshot.

// Each layout is one device mode plus, for PBP/triple/quad, its "mode n" variant.
// Window rectangles are [x, y, w, h] in percent of the screen.
export const LAYOUTS = [
    { id: 'single', label: 'Full', mode: 1, submode: null, rects: [[0, 0, 100, 100]] },
    { id: 'pip', label: 'Inset', mode: 2, submode: null, rects: null },
    { id: 'pbp1', label: 'Halves', mode: 3, submode: 1, rects: [[0, 0, 50, 100], [50, 0, 50, 100]] },
    { id: 'pbp2', label: 'Big + side', mode: 3, submode: 2, rects: [[0, 0, 75, 100], [75, 0, 25, 100]] },
    { id: 'tri1', label: 'Three', mode: 4, submode: 1, rects: [[0, 0, 60, 100], [60, 0, 40, 50], [60, 50, 40, 50]] },
    { id: 'tri2', label: 'Big + two', mode: 4, submode: 2, rects: [[0, 0, 75, 100], [75, 0, 25, 50], [75, 50, 25, 50]] },
    { id: 'quad1', label: 'Grid', mode: 5, submode: 1, rects: [[0, 0, 50, 50], [50, 0, 50, 50], [0, 50, 50, 50], [50, 50, 50, 50]] },
    { id: 'quad2', label: 'Big + three', mode: 5, submode: 2, rects: [[0, 0, 75, 100], [75, 0, 25, 33.33], [75, 33.33, 25, 33.34], [75, 66.67, 25, 33.33]] },
    { id: 'quad3', label: 'Three + big', mode: 5, submode: 3, rects: [[0, 0, 25, 33.33], [0, 33.33, 25, 33.34], [0, 66.67, 25, 33.33], [25, 0, 75, 100]] },
];

// PIP position values match `s PIP position n!`, sizes match `s PIP size n!`
export const PIP_CORNERS = [[1, '↖', 'Top left'], [3, '↗', 'Top right'], [2, '↙', 'Bottom left'], [4, '↘', 'Bottom right']];
export const PIP_SIZES = [[1, 'S', 'Small', 20], [2, 'M', 'Medium', 25], [3, 'L', 'Large', 30]];

const saved = window.oreiInitialState || {};

export const state = {
    connected: null,        // serial link to the matrix works (null = not checked yet)
    power: null,            // matrix power (null = unknown)
    refreshing: false,
    mode: saved.mode || 1,
    submode: saved.submode || 1,
    pipPosition: saved.pipPosition || 3,
    pipSize: saved.pipSize || 1,
    aspect: null,           // PBP/triple/quad window shape: 1 = fill screen, 2 = keep 16:9 (null = not read yet)
    windowInputs: { 1: 1, 2: 2, 3: 3, 4: 4, ...(saved.windowInputs || {}) },
    audioSource: saved.audioSource ?? 0,   // 0 = follow window 1, 1-4 = HDMI input
    volume: saved.volume ?? 50,
    muted: saved.muted ?? false,
    selected: 1,
    rokus: {},              // HDMI number -> { name, ip, ... }
};

const listeners = new Set();

export function subscribe(fn) {
    listeners.add(fn);
}

export function update(patch) {
    Object.assign(state, patch);
    const count = windowCount();
    if (state.selected > count) state.selected = 1;
    for (const fn of listeners) fn(state);
}

export function windowCount(mode = state.mode) {
    return { 1: 1, 2: 2, 3: 2, 4: 3, 5: 4 }[mode] || 1;
}

export function currentLayout() {
    const sameMode = LAYOUTS.filter(l => l.mode === state.mode);
    return sameMode.find(l => l.submode === null || l.submode === state.submode) || sameMode[0];
}

export function windowRects(layout = currentLayout()) {
    if (layout.id !== 'pip') return layout.rects;
    const pct = (PIP_SIZES.find(s => s[0] === state.pipSize) || PIP_SIZES[0])[3];
    const left = state.pipPosition === 1 || state.pipPosition === 2;
    const top = state.pipPosition === 1 || state.pipPosition === 3;
    const m = 3;
    const x = left ? m : 100 - m - pct;
    const y = top ? m * 16 / 9 : 100 - m * 16 / 9 - pct;
    return [[0, 0, 100, 100], [x, y, pct, pct]];
}

export function inputName(hdmi) {
    return state.rokus[hdmi]?.name || `HDMI ${hdmi}`;
}

export function hasRoku(hdmi) {
    return Boolean(state.rokus[hdmi]);
}

// HDMI input whose sound is playing
export function audioInput() {
    return state.audioSource === 0 ? state.windowInputs[1] : state.audioSource;
}

// Save the snapshot used for the next first paint. Batched so a burst of changes sends one request.
let saveTimer;
export function saveUiState() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
        const inputs = {};
        for (const [win, input] of Object.entries(state.windowInputs)) inputs[win] = input;
        fetch('/api/ui-state', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                mode: state.mode,
                submode: state.submode,
                pipPosition: state.pipPosition,
                pipSize: state.pipSize,
                windowInputs: inputs,
                audioSource: state.audioSource,
                volume: state.volume,
                muted: state.muted,
            }),
        }).catch(() => { /* best effort; the next save retries */ });
    }, 500);
}
