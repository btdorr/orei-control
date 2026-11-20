// settings.js - Side panel: Rokus, TV output, matrix connection and power, command log, controller.

import { api } from './api.js';
import { icon } from './icons.js';
import { notify, esc } from './notice.js';
import { state, subscribe } from './store.js';
import { Device, RESOLUTIONS } from './device.js';
import { Roku } from './roku.js';

const $ = id => document.getElementById(id);
const THEME_KEY = 'orei-theme-preference';

let open = false;
let found = null;           // discovered Rokus, null until a search runs
let searching = false;
let output = null;          // { res, hdcp, aspect } read from the matrix
let serial = null;          // { current_port, connected, available_ports }
let history = [];
let version = null;
let confirm = null;         // which risky action is waiting for a second tap
let system = null;
let logOpen = false;    // command log expanded (kept across re-renders)          // { kind: 'restart'|'shutdown'|'update', ... } while one is running

function theme() {
    try { return localStorage.getItem(THEME_KEY) || 'auto'; } catch (e) { return 'auto'; }
}

function setTheme(value) {
    try { localStorage.setItem(THEME_KEY, value); } catch (e) { /* not saved */ }
    if (value === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', value);
}

// "1920x1080p60" -> "1920×1080, 60 Hz" ("RB" = reduced blanking, kept for monitors that need it)
function resolutionLabel(r) {
    const m = r.match(/^(\d+)x(\d+)p(\d+)(RB)?$/);
    return m ? `${m[1]}×${m[2]}, ${m[3]} Hz${m[4] ? ' (reduced blanking)' : ''}` : r;
}

function select(id, options, value) {
    return `<select id="${id}">${options.map(([v, label]) =>
        `<option value="${v}"${String(v) === String(value) ? ' selected' : ''}>${esc(label)}</option>`).join('')}</select>`;
}

function rokuSection() {
    const rows = [1, 2, 3, 4].map(hdmi => {
        const r = state.rokus[hdmi];
        return `<div class="kv"><span>HDMI ${hdmi}</span>${r
            ? `<span class="v">${esc(r.name)}, ${esc(r.ip)}</span>${confirm === `remove-${hdmi}`
                ? `<span class="btn-row"><button class="btn danger primary" data-remove-roku="${hdmi}">Remove</button><button class="btn" data-cancel>Keep</button></span>`
                : `<button class="btn" data-confirm="remove-${hdmi}" aria-label="Remove ${esc(r.name)} from HDMI ${hdmi}">Remove</button>`}`
            : '<span class="v">No Roku</span>'}</div>`;
    }).join('');
    let results = '';
    if (searching) results = '<p class="hint">Searching the network. This can take up to 30 seconds.</p>';
    else if (found && found.length === 0) results = '<p class="hint">No Rokus found. Check that they are on and on the same network as the controller.</p>';
    else if (found) {
        const assigned = ip => Object.entries(state.rokus).find(([, r]) => r.ip === ip)?.[0] || '';
        results = found.map((d, i) => `<div class="found">
            <b>${esc(d.name)}</b><small>${esc(d.ip)}, ${esc(d.model)}</small>
            <label class="hint" for="found${i}">Connected to</label>
            ${select(`found${i}`, [['', 'Not connected'], [1, 'HDMI 1'], [2, 'HDMI 2'], [3, 'HDMI 3'], [4, 'HDMI 4']], assigned(d.ip))}
        </div>`).join('') + '<div class="btn-row"><button class="btn primary" data-save-rokus>Save Rokus</button></div>';
    }
    return `<section id="set-rokus"><h3>Rokus</h3>${rows}
        <div class="btn-row"><button class="btn" data-find-rokus${searching ? ' disabled' : ''}>Find Rokus</button></div>${results}</section>`;
}

function outputSection() {
    if (!output) return '<section><h3>TV output</h3><p class="hint">Reading from the matrix…</p></section>';
    const aspect = output.aspect ? `<div class="kv"><label for="setAspect">Window shape</label>
        ${select('setAspect', [[1, 'Fill screen'], [2, 'Keep 16:9']], output.aspect)}</div>` : '';
    return `<section><h3>TV output</h3>
        <div class="kv"><label for="setRes">Resolution</label>${select('setRes', RESOLUTIONS.map((r, i) => [i + 1, resolutionLabel(r)]), output.res)}</div>
        <div class="kv"><label for="setHdcp">HDCP</label>${select('setHdcp', [[1, 'HDCP 1.4'], [2, 'HDCP 2.2'], [3, 'Off']], output.hdcp)}</div>
        ${aspect}</section>`;
}

function matrixSection() {
    let port = '<p class="hint">Reading serial ports…</p>';
    if (serial) {
        const ports = serial.available_ports || [];
        port = `<div class="kv"><label for="setPort">Serial port</label>${ports.length
            ? select('setPort', ports.map(p => [p.device, p.device]), serial.current_port)
            : '<span class="v">No serial ports found</span>'}</div>
            <div class="kv"><span>Connection</span><span class="v">${serial.connected ? 'Connected' : 'Not connected'}</span></div>`;
    }
    const power = state.power === false
        ? '<button class="btn" data-power="1">Turn on matrix</button>'
        : confirm === 'power-off'
            ? '<button class="btn danger primary" data-power="0">Turn off now</button><button class="btn" data-cancel>Cancel</button>'
            : `<button class="btn danger" data-confirm="power-off"${state.power ? '' : ' disabled'}>Turn off matrix</button>`;
    return `<section><h3>Matrix</h3>${port}<div class="btn-row">${power}</div></section>`;
}

function logSection() {
    const rows = history.length
        ? history.slice().reverse().map(h => `<div><span>${esc(h.timestamp)}</span><span>${esc(h.command)} <em>→ ${esc(h.response)}</em></span></div>`).join('')
        : '<div><span></span><span><em>No commands yet</em></span></div>';
    return `<section><h3>Troubleshooting</h3><details id="logDetails"${logOpen ? ' open' : ''}><summary>Command log</summary>
        <div class="log" aria-label="Recent commands">${rows}</div>
        <form class="cmd" id="cmdForm"><input id="cmdInput" placeholder="RS-232 command, e.g. r power!" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="RS-232 command"><button class="btn">Send</button></form>
        <div class="btn-row"><button class="btn" data-clear-log>Clear log</button></div></details></section>`;
}

function controllerSection() {
    const v = version ? `${version.version}` : '…';
    let actions;
    if (system?.kind === 'update') {
        actions = `<p class="hint" aria-live="polite">${esc(system.message)}</p>${system.log ? `<pre class="updlog">${esc(system.log)}</pre>` : ''}`;
    } else if (system) {
        actions = `<p class="hint" aria-live="polite">${esc(system.message)}</p>
            <div class="btn-row"><button class="btn" data-cancel-system>Cancel ${system.kind === 'restart' ? 'restart' : 'shutdown'}</button></div>`;
    } else if (confirm === 'restart' || confirm === 'shutdown' || confirm === 'update') {
        const text = {
            update: ['Install the latest version? The page reloads when it finishes, usually in 1 to 2 minutes.', 'Update now'],
            restart: ['Restart the controller in 1 minute? The remote is unavailable for about a minute while it starts.', 'Restart in 1 minute'],
            shutdown: ['Shut down the controller in 1 minute? Turning it back on needs someone at the device.', 'Shut down in 1 minute'],
        }[confirm];
        actions = `<p class="hint">${text[0]}</p><div class="btn-row">
            <button class="btn ${confirm === 'update' ? 'primary' : 'danger primary'}" data-system="${confirm}">${text[1]}</button>
            <button class="btn" data-cancel>Cancel</button></div>`;
    } else {
        actions = `<div class="btn-row"><button class="btn" data-confirm="update">Update</button>
            <button class="btn" data-confirm="restart">Restart</button><button class="btn danger" data-confirm="shutdown">Shut down</button></div>`;
    }
    return `<section><h3>Controller</h3>
        <div class="kv"><span>Version</span><span class="v">${esc(v)}</span></div>
        <div class="kv"><span>Theme</span><div class="seg" role="group" aria-label="Theme">
            ${[['auto', 'Auto'], ['light', 'Light'], ['dark', 'Dark']].map(([k, l]) => `<button data-theme-set="${k}" aria-pressed="${theme() === k}">${l}</button>`).join('')}
        </div></div>
        ${actions}
        <p class="hint"><a href="classic">Use the classic view</a></p></section>`;
}

function render() {
    if (!open) return;
    const body = $('sheetBody');
    const scroll = $('sheet').scrollTop;
    const typed = $('cmdInput')?.value || '';
    const focusId = document.activeElement?.id;
    body.innerHTML = rokuSection() + outputSection() + matrixSection() + logSection() + controllerSection();
    $('sheet').scrollTop = scroll;
    if ($('cmdInput')) $('cmdInput').value = typed;
    if (focusId && $(focusId)) $(focusId).focus();
}

async function loadHistory() {
    const data = await api.get('/api/history?limit=25').catch(() => ({}));
    if (data.success) { history = data.history; render(); }
}

async function loadAll() {
    const [ver, ser] = await Promise.all([
        api.get('/api/version').catch(() => ({})),
        api.get('/api/config/serial').catch(() => ({})),
    ]);
    if (ver.success) version = ver.version;
    if (ser.success) serial = ser;
    render();
    await loadHistory();
    if (state.power) {
        output = await Device.readOutput();
        render();
        loadHistory();
    }
}

async function runSystem(kind) {
    confirm = null;
    if (kind === 'update') return runUpdate();
    const data = await api.post(`/api/system/${kind}`, { confirmed: true }).catch(e => ({ error: e.message }));
    if (!data.success) {
        notify(`Couldn't ${kind === 'restart' ? 'restart' : 'shut down'}: ${data.error}`);
        return render();
    }
    const end = Date.now() + (data.countdown || 60) * 1000;
    const verb = kind === 'restart' ? 'Restarting' : 'Shutting down';
    const tick = () => {
        if (system?.kind !== kind) return;
        const left = Math.max(0, Math.round((end - Date.now()) / 1000));
        system.message = left > 0 ? `${verb} in ${left} seconds.` : `${verb} now.`;
        render();
        if (left > 0) system.timer = setTimeout(tick, 1000);
    };
    system = { kind, message: '' };
    tick();
}

async function cancelSystem() {
    const kind = system.kind;
    clearTimeout(system.timer);
    const data = await api.post(`/api/system/${kind}/cancel`).catch(e => ({ error: e.message }));
    if (data.success) {
        system = null;
        notify(kind === 'restart' ? 'Restart canceled' : 'Shutdown canceled', 'info');
    } else {
        notify(`Couldn't cancel: ${data.error}`);
    }
    render();
}

async function runUpdate() {
    system = { kind: 'update', message: 'Starting the update…', log: '' };
    render();
    try {
        const start = await api.post('/api/system/update');
        if (!start.success) throw new Error(start.error);
        const finalStates = ['up_to_date', 'success', 'failed', 'rolled_back', 'rollback_failed'];
        const deadline = Date.now() + 10 * 60 * 1000;
        let status = null;
        while (Date.now() < deadline) {
            await new Promise(r => setTimeout(r, 1500));
            try {
                const data = await api.get('/api/system/update/status');
                if (!data.success) continue;
                system.log = (data.log || '').split('\n').slice(-40).join('\n');
                system.message = 'Updating. The controller restarts near the end.';
                render();
                if (!data.active && finalStates.includes(data.status.state)) { status = data.status; break; }
            } catch (e) { /* service restarting */ }
        }
        if (!status) throw new Error('Timed out waiting for the update to finish');
        if (status.state === 'up_to_date') {
            system = null;
            notify('Already up to date', 'info');
            return render();
        }
        if (status.state !== 'success') throw new Error(status.message || `Update ended: ${status.state}`);
        system.message = 'Installed. Waiting for the controller to restart…';
        render();
        const until = Date.now() + 60 * 1000;
        while (Date.now() < until) {
            try {
                const v = await api.get('/api/version');
                if (v.running_commit === status.to) { location.reload(); return; }
            } catch (e) { /* restarting */ }
            await new Promise(r => setTimeout(r, 1000));
        }
        throw new Error('Update installed, but the controller is not reporting the new version. Reload the page.');
    } catch (e) {
        system = null;
        notify(`Update failed: ${e.message}`);
        render();
    }
}

export const Settings = {
    init() {
        $('closeSettings').innerHTML = icon('close');
        subscribe(() => render());

        $('closeSettings').addEventListener('click', () => this.close());
        $('scrim').addEventListener('click', () => this.close());
        document.addEventListener('keydown', e => { if (e.key === 'Escape' && open) this.close(); });

        $('sheet').addEventListener('click', async e => {
            const t = e.target.closest('button');
            if (!t) return;
            const d = t.dataset;
            if (d.findRokus !== undefined) {
                searching = true; found = null; render();
                found = await Roku.discover() || [];
                searching = false; render();
            } else if (d.saveRokus !== undefined) {
                const mappings = {};
                found.forEach((dev, i) => {
                    const hdmi = $(`found${i}`)?.value;
                    if (hdmi) mappings[hdmi] = { ip: dev.ip, name: dev.name, model: dev.model || 'Unknown', serial: dev.serial || 'Unknown' };
                });
                const keep = Object.fromEntries(Object.entries(state.rokus).filter(([h, r]) => !mappings[h] && !found.some(f => f.ip === r.ip)));
                if (await Roku.saveMappings({ ...keep, ...mappings })) { found = null; notify('Rokus saved', 'info'); render(); }
            } else if (d.removeRoku) {
                confirm = null;
                const next = { ...state.rokus };
                delete next[d.removeRoku];
                if (await Roku.saveMappings(next)) notify('Roku removed', 'info');
            } else if (d.confirm) {
                confirm = d.confirm; render();
            } else if (d.cancel !== undefined) {
                confirm = null; render();
            } else if (d.power) {
                confirm = null; render();
                await Device.setPower(d.power === '1');
            } else if (d.system) {
                runSystem(d.system);
            } else if (d.cancelSystem !== undefined) {
                cancelSystem();
            } else if (d.clearLog !== undefined) {
                await api.del('/api/history').catch(() => {});
                history = []; render();
            } else if (d.themeSet) {
                setTheme(d.themeSet); render();
            }
        });

        $('sheet').addEventListener('toggle', e => { if (e.target.id === 'logDetails') logOpen = e.target.open; }, true);

        $('sheet').addEventListener('change', async e => {
            const t = e.target;
            if (t.id === 'setRes') { if (await Device.setResolution(t.value) !== null) output.res = Number(t.value); }
            else if (t.id === 'setHdcp') { if (await Device.setHdcp(t.value) !== null) output.hdcp = Number(t.value); }
            else if (t.id === 'setAspect') { if (await Device.setAspect(t.value) !== null) output.aspect = Number(t.value); }
            else if (t.id === 'setPort') {
                const data = await api.post('/api/config/serial', { port: t.value });
                if (data.success) {
                    notify(data.connected ? `Connected on ${t.value}` : `Saved ${t.value}, but the matrix did not answer`, data.connected ? 'info' : 'error');
                    const fresh = await api.get('/api/config/serial').catch(() => ({}));
                    if (fresh.success) serial = fresh;
                    Device.refresh();
                } else {
                    notify(`Port not changed: ${data.error}`);
                }
            } else {
                return;
            }
            render();
            loadHistory();
        });

        $('sheet').addEventListener('submit', async e => {
            e.preventDefault();
            const input = $('cmdInput');
            const cmd = input.value.trim();
            if (!cmd) return;
            input.value = '';
            await api.command(cmd);
            loadHistory();
        });
    },

    open(section) {
        open = true;
        confirm = null;
        $('sheet').hidden = false;
        $('scrim').hidden = false;
        document.body.style.overflow = 'hidden';
        render();
        $('h-set').focus();
        if (section) $(`set-${section}`)?.scrollIntoView({ block: 'start' });
        loadAll();
    },

    close() {
        open = false;
        $('sheet').hidden = true;
        $('scrim').hidden = true;
        document.body.style.overflow = '';
        $('openSettings').focus();
    },
};
