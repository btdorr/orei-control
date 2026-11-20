// roku.js - Roku mappings (which Roku is on which HDMI input) and ECP keypresses.

import { api } from './api.js';
import { notify } from './notice.js';
import { state, update } from './store.js';

export const Roku = {
    async loadMappings() {
        try {
            const data = await api.get('/api/roku/mappings');
            if (data.success) update({ rokus: data.mappings || {} });
        } catch (e) {
            notify("Couldn't load the Roku list. Reload the page to try again.");
        }
    },

    async saveMappings(mappings) {
        const data = await api.post('/api/roku/mappings', { mappings });
        if (!data.success) {
            notify(`Rokus not saved: ${data.error}`);
            return false;
        }
        update({ rokus: mappings });
        return true;
    },

    async discover() {
        const data = await api.get('/api/roku/discover');
        if (!data.success) {
            notify(`Roku search failed: ${data.error}`);
            return null;
        }
        return data.devices || [];
    },

    // Returns true when the Roku accepted the key. hold = long press (about 1 second on the Roku).
    async key(hdmi, key, hold = false) {
        try {
            const data = await api.post('/api/roku/command', { hdmi, command: key, ...(hold && { hold: true }) });
            if (data.success) return true;
            notify(`${state.rokus[hdmi]?.name || 'The Roku'} did not respond. Check that it is on and connected.`);
        } catch (e) {
            notify("Can't reach the controller. Check the network and try again.");
        }
        return false;
    },

    async playPauseAll() {
        const inputs = Object.keys(state.rokus);
        const results = await Promise.all(inputs.map(hdmi => this.key(hdmi, 'Play')));
        return { sent: results.filter(Boolean).length, total: inputs.length };
    },
};
