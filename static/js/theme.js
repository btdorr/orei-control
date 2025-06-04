// theme.js - Theme management for Orei Control Panel

export const ThemeManager = {
    STORAGE_KEY: 'orei-theme-preference',
    
    // Initialize theme system
    init() {
        this.loadTheme();
        this.setupEventListeners();
        this.updateThemeUI();
    },
    
    // Load saved theme or default to auto
    loadTheme() {
        const saved = localStorage.getItem(this.STORAGE_KEY) || 'auto';
        this.setTheme(saved);
    },
    
    // Set theme and save preference
    setTheme(theme) {
        const root = document.documentElement;
        const preference = theme;
        
        if (theme === 'auto') {
            // Check system preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            theme = prefersDark ? 'dark' : 'light';
        }
        
        root.setAttribute('data-theme', theme);
        localStorage.setItem(this.STORAGE_KEY, preference);
        this.updateThemeUI();
    },
    
    // Update UI to show current theme
    updateThemeUI() {
        const currentPref = localStorage.getItem(this.STORAGE_KEY) || 'auto';
        document.querySelectorAll('[data-theme-value]').forEach(item => {
            item.classList.toggle('active', item.getAttribute('data-theme-value') === currentPref);
        });
    },
    
    // Set up event listeners for theme switching
    setupEventListeners() {
        // Theme selector clicks
        document.querySelectorAll('[data-theme-value]').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const theme = e.currentTarget.getAttribute('data-theme-value');
                this.setTheme(theme);
            });
        });
        
        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            const currentPref = localStorage.getItem(this.STORAGE_KEY) || 'auto';
            if (currentPref === 'auto') {
                this.setTheme('auto');
            }
        });
    },
    
    // Get current active theme
    getCurrentTheme() {
        return document.documentElement.getAttribute('data-theme');
    },
    
    // Get user preference
    getPreference() {
        return localStorage.getItem(this.STORAGE_KEY) || 'auto';
    }
};