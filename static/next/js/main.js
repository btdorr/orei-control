// main.js - Entry point for the TV-first UI.
// First paint uses the last known state (window.oreiInitialState). The matrix is read after.

import { Views } from './views.js';
import { Settings } from './settings.js';
import { Device, lastRefresh } from './device.js';
import { Roku } from './roku.js';

Settings.init();
Views.init({ openSettings: section => Settings.open(section) });

Roku.loadMappings();
Device.refresh();

// A tablet left on the coffee table may sleep for hours. Re-read the matrix when the page
// comes back into view, if the last read is more than two minutes old.
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && Date.now() - lastRefresh > 2 * 60 * 1000) {
        Device.refresh();
    }
});
