// utils.js - Utility functions for Orei Control Panel

export const Utils = {
    // Show loading spinner
    showLoading() {
        const spinner = document.querySelector('.loading-spinner');
        if (spinner) {
            spinner.classList.add('active');
        }
    },

    // Hide loading spinner
    hideLoading() {
        const spinner = document.querySelector('.loading-spinner');
        if (spinner) {
            spinner.classList.remove('active');
        }
    },

    // Show toast notification
    showToast(message, type = 'info', duration) {
        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-white bg-${type} border-0`;
        toast.setAttribute('role', 'alert');
        
        // Set custom duration if provided
        if (duration) {
            toast.setAttribute('data-bs-delay', duration);
        }
        
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;
        
        const container = document.querySelector('.toast-container');
        if (container) {
            container.appendChild(toast);
            const bsToast = new bootstrap.Toast(toast);
            bsToast.show();
            toast.addEventListener('hidden.bs.toast', () => toast.remove());
        }
    },

    // Debounce function for rate limiting
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Format time for display
    formatTime(date = new Date()) {
        return date.toLocaleTimeString();
    },

    // Parse RS-232 response values
    parseResponse(response, pattern) {
        if (!response) return null;
        const match = response.match(pattern);
        return match ? match[1] : null;
    },

    // Map resolution string to dropdown value
    getResolutionValue(resolutionString) {
        const resolutions = {
            '4096x2160p60': '1',
            '4096x2160p50': '2',
            '3840x2160p60': '3',
            '3840x2160p50': '4',
            '3840x2160p30': '5',
            '3840x2160p25': '6',
            '1920x1200p60RB': '7',
            '1920x1080p60': '8',
            '1920x1080p50': '9',
            '1360x768p60': '10',
            '1280x800p60': '11',
            '1280x720p60': '12',
            '1280x720p50': '13',
            '1024x768p60': '14'
        };
        
        for (const [res, value] of Object.entries(resolutions)) {
            if (resolutionString.includes(res)) {
                return value;
            }
        }
        return null;
    }
};