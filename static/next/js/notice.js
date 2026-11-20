// notice.js - One short message at the bottom of the screen. Errors stay longer.

let timer;
let current = '';

export function notify(message, kind = 'error') {
    const el = document.getElementById('notice');
    if (!el) return;
    if (message === current && !el.hidden) return;
    current = message;
    el.textContent = message;
    el.dataset.kind = kind;
    el.hidden = false;
    clearTimeout(timer);
    timer = setTimeout(() => { el.hidden = true; current = ''; }, kind === 'error' ? 6000 : 3000);
}

export function esc(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
