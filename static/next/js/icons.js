// icons.js - Inline SVG icons (no icon font, so nothing can be missing)

const PATHS = {
    up: '<path d="M6 15l6-6 6 6"/>',
    down: '<path d="M6 9l6 6 6-6"/>',
    left: '<path d="M15 6l-6 6 6 6"/>',
    right: '<path d="M9 6l6 6-6 6"/>',
    home: '<path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z"/>',
    back: '<path d="M10 6L4 12l6 6M4 12h16"/>',
    star: '<path d="M12 4l2.4 5 5.6.6-4.2 3.8 1.2 5.6L12 16.2 7 19l1.2-5.6L4 9.6 9.6 9z"/>',
    power: '<path d="M12 3v8M7 6.5a7 7 0 1 0 10 0"/>',
    rew: '<path d="M11 6l-7 6 7 6zM20 6l-7 6 7 6z"/>',
    fwd: '<path d="M13 6l7 6-7 6zM4 6l7 6-7 6z"/>',
    pp: '<path d="M4 6l7 6-7 6zM14 6v12M19 6v12"/>',
    vdown: '<path d="M4 9h4l5-4v14l-5-4H4zM16 12h5"/>',
    vup: '<path d="M4 9h4l5-4v14l-5-4H4zM16 12h5M18.5 9.5v5"/>',
    mute: '<path d="M4 9h4l5-4v14l-5-4H4zM16 9l5 6M21 9l-5 6"/>',
    spk: '<path d="M4 9h4l5-4v14l-5-4H4zM16.5 8.5a5 5 0 0 1 0 7"/>',
    sliders: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6"/>',
};

export function icon(name, filled = false) {
    return `<svg viewBox="0 0 24 24" fill="${filled ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PATHS[name]}</svg>`;
}
