// views.js - Main screen: status, TV drawing, layouts, inputs, sound, and the remote.

import { icon } from './icons.js';
import { esc } from './notice.js';
import {
    state, subscribe, LAYOUTS, PIP_CORNERS, PIP_SIZES, currentLayout, windowRects, windowCount,
    inputName, hasRoku, audioInput,
} from './store.js';
import { Device } from './device.js';
import { Roku } from './roku.js';

const $ = id => document.getElementById(id);

// Replace an element's HTML only when it changed, so unrelated taps don't recreate buttons
function setHTML(el, html) {
    if (el._html !== html) { el.innerHTML = html; el._html = html; }
}

function renderStatus() {
    const el = $('status');
    let s = 'on', text = 'Matrix on';
    if (state.connected === false) { s = 'offline'; text = 'Not connected'; }
    else if (state.power === false) { s = 'off'; text = 'Matrix off'; }
    else if (state.power === null) { s = 'unknown'; text = 'Checking'; }
    el.dataset.state = state.refreshing && state.power === null ? 'busy' : s;
    $('statusText').textContent = text;
    $('refreshBtn').setAttribute('aria-busy', state.refreshing);

    const banner = $('banner');
    // Matrix controls only. Rokus work without the matrix, so the remote stays usable.
    const setInert = v => { for (const c of ['.a-tv', '.a-sound', '.a-layouts', '.a-sources']) document.querySelector(c).inert = v; };
    if (state.connected === false) {
        banner.hidden = false;
        banner.dataset.kind = 'offline';
        $('bannerTitle').textContent = "Can't reach the matrix";
        $('bannerText').textContent = 'Check that the matrix has power and its serial cable is connected. The port is in Settings.';
        $('bannerAction').textContent = 'Try again';
        $('bannerAction').dataset.action = 'retry';
        setInert(true);
    } else if (state.power === false) {
        banner.hidden = false;
        banner.dataset.kind = 'off';
        $('bannerTitle').textContent = 'The matrix is off';
        $('bannerText').textContent = 'Turn it on to change layouts and inputs.';
        $('bannerAction').textContent = 'Turn on matrix';
        $('bannerAction').dataset.action = 'power-on';
        setInert(true);
    } else {
        banner.hidden = true;
        setInert(false);
    }
}

// Rebuild the TV only when what it shows changes. Selecting a window just moves the highlight,
// so Safari does not repaint every window on each tap.
let screenKey = '';
function renderScreen() {
    const layout = currentLayout();
    const sound = audioInput();
    const rects = windowRects(layout);
    const key = JSON.stringify([rects, state.windowInputs, state.inputsKnown, sound, state.muted,
        rects.map((_, i) => inputName(state.windowInputs[i + 1]))]);
    if (key === screenKey) {
        for (const el of $('screen').children) el.setAttribute('aria-pressed', String(Number(el.dataset.win) === state.selected));
        return;
    }
    screenKey = key;
    $('screen').innerHTML = rects.map(([x, y, w, h], i) => {
        const win = i + 1;
        const hdmi = state.windowInputs[win];
        const small = w < 30 || h < 40;
        const inset = layout.id === 'pip' && win === 2;
        const soundHere = hdmi === sound && !state.muted;
        if (!state.inputsKnown) {
            return `<button class="win pending${small ? ' small' : ''}${inset ? ' inset' : ''}" data-win="${win}"
                style="left:${x}%;top:${y}%;width:${w}%;height:${h}%;--c:var(--muted)"
                aria-pressed="${state.selected === win}" aria-label="Window ${win}, reading input">
                <span class="wn">${win}</span><span class="lbl"><span class="nm">Reading…</span></span></button>`;
        }
        return `<button class="win${small ? ' small' : ''}${inset ? ' inset' : ''}" data-win="${win}"
            style="left:${x}%;top:${y}%;width:${w}%;height:${h}%;--c:var(--in${hdmi})"
            aria-pressed="${state.selected === win}" aria-label="Window ${win}, ${esc(inputName(hdmi))}${soundHere ? ', sound' : ''}">
            <span class="wn">${win}</span>
            <span class="lbl">${soundHere ? `<span class="spk">${icon('spk')}</span>` : ''}<span class="nm">${esc(inputName(hdmi))}</span>${hasRoku(hdmi) ? `<span class="hd">HDMI ${hdmi}</span>` : ''}</span>
        </button>`;
    }).join('');
}

function renderLayouts() {
    const current = currentLayout().id;
    setHTML($('layouts'), LAYOUTS.map(l => {
        const rects = l.id === 'pip' ? [[0, 0, 100, 100], [70, 8, 25, 25]] : l.rects;
        const shapes = rects.map(([x, y, w, h]) => `<rect x="${x * 1.6}" y="${y * 0.9}" width="${w * 1.6}" height="${h * 0.9}" rx="2"/>`).join('');
        return `<button class="lay" data-layout="${l.id}" aria-pressed="${current === l.id}" title="${l.label}">
            <svg viewBox="0 0 160 90" aria-hidden="true">${shapes}</svg><span>${l.label}</span></button>`;
    }).join(''));
    $('h-lay').textContent = `Layout: ${currentLayout().label}`;
    const shape = [3, 4, 5].includes(state.mode);
    $('shapeOpts').hidden = !shape;
    if (shape) {
        setHTML($('shapeSeg'), [[1, 'Fill', 'Fill the window'], [2, '16:9', 'Keep 16:9']].map(([v, text, label]) =>
            `<button data-aspect="${v}" aria-pressed="${state.aspect === v}" aria-label="${label}">${text}</button>`).join(''));
    }
    const pip = current === 'pip';
    $('insetOpts').hidden = !pip;
    if (pip) {
        setHTML($('insetCorner'), PIP_CORNERS.map(([v, glyph, label]) =>
            `<button data-pip-position="${v}" aria-pressed="${state.pipPosition === v}" aria-label="${label}">${glyph}</button>`).join(''));
        setHTML($('insetSize'), PIP_SIZES.map(([v, glyph, label]) =>
            `<button data-pip-size="${v}" aria-pressed="${state.pipSize === v}" aria-label="${label}">${glyph}</button>`).join(''));
    }
}

let sourcesKey = '';
function renderSources() {
    $('h-src').textContent = `Input for window ${state.selected}`;
    const key = JSON.stringify([1, 2, 3, 4].map(h => [inputName(h), hasRoku(h)]));
    if (key === sourcesKey) {
        for (const el of $('sources').children) {
            el.setAttribute('aria-pressed', String(state.windowInputs[state.selected] === Number(el.dataset.input)));
        }
        return;
    }
    sourcesKey = key;
    $('sources').innerHTML = [1, 2, 3, 4].map(hdmi => `<button class="src" style="--c:var(--in${hdmi})" data-input="${hdmi}" aria-pressed="${state.windowInputs[state.selected] === hdmi}">
        <span><b>${esc(inputName(hdmi))}</b><small>HDMI ${hdmi}${hasRoku(hdmi) ? '' : ', no Roku'}</small></span></button>`).join('');
}

let dragging = false;
function renderSound() {
    const mute = $('mute');
    mute.innerHTML = icon(state.muted ? 'mute' : 'spk');
    mute.setAttribute('aria-pressed', state.muted);
    mute.setAttribute('aria-label', state.muted ? 'Unmute' : 'Mute');
    if (!dragging) $('vol').value = state.volume;
    $('volOut').textContent = state.muted ? 'Off' : (dragging ? $('vol').value : state.volume);

    const sound = audioInput();
    $('soundFrom').textContent = state.audioSource === 0
        ? `follows window 1 (${inputName(sound)})`
        : `from ${inputName(sound)}`;

    // "Follow window 1" plus one choice per window. A window choice sets the sound to that
    // window's HDMI input, so it stays on that input if the window changes later.
    const chips = [`<button class="chip" data-audio="0" aria-pressed="${state.audioSource === 0}">Follow window 1</button>`];
    let matched = false;
    for (let win = 1; win <= windowCount(); win++) {
        const hdmi = state.windowInputs[win];
        const on = state.audioSource !== 0 && state.audioSource === hdmi && !matched;
        if (on) matched = true;
        chips.push(`<button class="chip" data-audio="${hdmi}" style="--c:var(--in${hdmi})" aria-pressed="${on}"
            aria-label="Window ${win}, ${esc(inputName(hdmi))}" title="${esc(inputName(hdmi))}"><i></i>Win ${win}</button>`);
    }
    if (state.audioSource !== 0 && !matched) {
        const hdmi = state.audioSource;
        chips.push(`<button class="chip" data-audio="${hdmi}" style="--c:var(--in${hdmi})" aria-pressed="true"><i></i>${esc(inputName(hdmi))}, off screen</button>`);
    }
    setHTML($('soundSrc'), chips.join(''));
}

let remoteKey = '';
let lastSent = '';
function renderRemote() {
    const win = state.selected;
    const hdmi = state.windowInputs[win];
    const el = $('remote');
    const soundHere = state.audioSource !== 0 && state.audioSource === hdmi;
    const key = [win, hdmi, inputName(hdmi), hasRoku(hdmi), soundHere].join('|');
    if (key === remoteKey) return;
    if (remoteKey && remoteKey.split('|')[1] !== String(hdmi)) lastSent = '';
    remoteKey = key;
    el.style.setProperty('--c', `var(--in${hdmi})`);

    if (!hasRoku(hdmi)) {
        el.innerHTML = `<div class="r-head"><div class="grow"><h3>${esc(inputName(hdmi))}</h3><p>Window ${win}</p></div></div>
            <div class="empty"><b>No Roku on HDMI ${hdmi}</b><span>Add the Roku for this input in Settings to control it from here.</span>
            <button class="btn" data-open-settings="rokus">Set up Rokus</button></div>`;
        return;
    }
    const b = (k, ic, label, cls = '') =>
        `<button class="rb ${cls}" data-key="${k}" aria-label="${label}">${ic}${cls.includes('lbl') ? `<span>${label}</span>` : ''}</button>`;
    el.innerHTML = `
        <div class="r-head">
            <div class="grow"><h3>${esc(inputName(hdmi))}</h3><p>Window ${win}, HDMI ${hdmi}</p></div>
            <button class="toggle" data-sound-here="${hdmi}" aria-pressed="${soundHere}">${soundHere ? 'Sound is from here' : 'Play sound from here'}</button>
        </div>
        <div class="r-body">
        <div class="row3 r-nav">${b('Back', icon('back'), 'Back', 'lbl')}${b('Home', icon('home'), 'Home', 'lbl')}${b('Info', icon('star'), 'Options', 'lbl')}</div>
        <div class="dpad">
            <span></span>${b('Up', icon('up'), 'Up')}<span></span>
            ${b('Left', icon('left'), 'Left')}<button class="rb ok" data-key="Select" aria-label="OK">OK</button>${b('Right', icon('right'), 'Right')}
            <span></span>${b('Down', icon('down'), 'Down')}<span></span>
        </div>
        <div class="row3 r-media">${b('Rev', icon('rew', true), 'Rewind')}${b('Play', icon('pp', true), 'Play/Pause', 'play')}${b('Fwd', icon('fwd', true), 'Fast forward')}</div>
        <div class="row3 r-vol">${b('VolumeDown', icon('vdown'), 'Roku volume down')}${b('VolumeMute', icon('mute'), 'Roku mute')}${b('VolumeUp', icon('vup'), 'Roku volume up')}</div>
        </div>
        <div class="r-foot">
            <span class="last" id="last" aria-live="polite">${esc(lastSent)}</span>
            <span class="btn-row">${b('Power', icon('power'), 'Roku power')}<button class="btn" data-play-all>Play/Pause all Rokus</button></span>
        </div>`;
}

function setLast(text) {
    lastSent = text;
    const el = $('last');
    if (el) el.textContent = text;
}

function render() {
    renderStatus();
    renderScreen();
    renderLayouts();
    renderSources();
    renderSound();
    renderRemote();
}

export const Views = {
    init({ openSettings }) {
        $('refreshBtn').innerHTML = icon('refresh');
        $('openSettings').innerHTML = icon('sliders');
        subscribe(render);
        render();

        document.addEventListener('click', async e => {
            const t = e.target.closest('button');
            if (!t || t.closest('#sheet')) return;
            const d = t.dataset;
            if (d.win) {
                state.selected = Number(d.win);
                render();
            } else if (d.layout) {
                const layout = LAYOUTS.find(l => l.id === d.layout);
                if (layout.id !== currentLayout().id) Device.setLayout(layout);
            } else if (d.pipPosition) {
                Device.setPip({ pipPosition: Number(d.pipPosition) });
            } else if (d.aspect) {
                if (state.aspect !== Number(d.aspect)) Device.setAspect(Number(d.aspect));
            } else if (d.pipSize) {
                Device.setPip({ pipSize: Number(d.pipSize) });
            } else if (d.input) {
                const hdmi = Number(d.input);
                if (state.windowInputs[state.selected] !== hdmi) Device.setInput(state.selected, hdmi);
            } else if (d.audio !== undefined) {
                Device.setAudioSource(Number(d.audio));
            } else if (d.soundHere) {
                Device.setAudioSource(Number(d.soundHere));
            } else if (t.id === 'mute') {
                Device.setMute(!state.muted);
            } else if (d.key) {
                const hdmi = state.windowInputs[state.selected];
                t.classList.remove('fail');
                const ok = await Roku.key(hdmi, d.key);
                if (ok) setLast(`Sent ${t.getAttribute('aria-label')} to ${inputName(hdmi)}`);
                else t.classList.add('fail');
            } else if (t.hasAttribute('data-play-all')) {
                const { sent, total } = await Roku.playPauseAll();
                setLast(total === 0 ? 'No Rokus set up' : `Sent Play/Pause to ${sent} of ${total} Rokus`);
            } else if (d.openSettings !== undefined || t.id === 'openSettings') {
                openSettings(d.openSettings);
            } else if (t.id === 'refreshBtn') {
                Device.refresh();
            } else if (t.id === 'bannerAction') {
                if (d.action === 'power-on') Device.setPower(true);
                else Device.refresh();
            }
        });

        // Press feedback that shows even when the request is fast
        document.addEventListener('pointerdown', e => {
            const rb = e.target.closest('.rb');
            if (!rb) return;
            rb.classList.add('hit');
            setTimeout(() => rb.classList.remove('hit'), 140);
        });

        const vol = $('vol');
        vol.addEventListener('input', () => {
            dragging = true;
            $('volOut').textContent = vol.value;
        });
        vol.addEventListener('change', () => {
            dragging = false;
            Device.setVolume(Number(vol.value));
        });
    },
};
