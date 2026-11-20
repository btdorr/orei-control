// api.js - Requests to the controller. Device protocol strings are built in device.js.

import { notify } from './notice.js';

async function request(url, options = {}) {
    const response = await fetch(url, { cache: 'no-store', ...options });
    let data = {};
    try { data = await response.json(); } catch (e) { /* non-JSON error page */ }
    if (data.success === undefined) data = { ...data, success: response.ok };
    if (!data.success && !data.error) data.error = `HTTP ${response.status}`;
    return data;
}

function friendly(error) {
    if (/serial port not connected|serial communication error/i.test(error || '')) {
        return "The controller can't reach the matrix. Check the serial cable or the port in Settings.";
    }
    return error || 'The command failed.';
}

export const api = {
    // Send one RS-232 command. Returns the device reply, or null after showing the error.
    async command(command) {
        try {
            const data = await this.post('/api/command', { command });
            if (data.success) return data.response;
            notify(friendly(data.error));
        } catch (e) {
            notify("Can't reach the controller. Check the network and try again.");
        }
        return null;
    },

    get(url) {
        return request(url);
    },

    post(url, body) {
        return request(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body ?? {}),
        });
    },

    del(url) {
        return request(url, { method: 'DELETE' });
    },
};
