/**
 * DEGRE Professional Mods - Configuration Manager
 * Advanced configuration system with persistent storage
 */

class DegreConfigManager {
    constructor() {
        this.storageKey = 'degre_mods_config_v1';
        this.listeners = new Map();
        this.defaults = this.getDefaults();
        this.config = this.load();
        
        // Event emitter for configuration changes
        this.eventTarget = new EventTarget();
    }

    getDefaults() {
        return {
            // Power Bar Settings
            powerBar: {
                enabled: true,
                maxWattsPerKg: 10,
                zones: {
                    zone1: { min: 0, max: 2.5, color: '#808080', name: 'Active Recovery' },
                    zone2: { min: 2.5, max: 3.5, color: '#0066CC', name: 'Endurance' },
                    zone3: { min: 3.5, max: 4.5, color: '#00AA00', name: 'Tempo' },
                    zone4: { min: 4.5, max: 5.5, color: '#FFAA00', name: 'Threshold' },
                    zone5: { min: 5.5, max: 7.0, color: '#FF6600', name: 'VO2Max' },
                    zone6: { min: 7.0, max: 12.0, color: '#FF0000', name: 'Neuromuscular' }
                },
                showZoneLabels: true,
                showCurrentValue: true,
                orientation: 'vertical',
                width: 80,
                height: 400,
                opacity: 0.9,
                smoothing: true,
                animationSpeed: 300
            },

            // Audio Player Settings
            audioPlayer: {
                enabled: true,
                autoplay: false,
                shuffle: true,
                volume: 0.8,
                crossfade: true,
                crossfadeTime: 3000,
                showAlbumArt: true,
                showProgress: true,
                size: 250,
                opacity: 0.95,
                customPlaylists: [],
                visualizer: {
                    enabled: true,
                    style: 'circular',
                    sensitivity: 50,
                    colors: ['#FF0080', '#00FF80', '#8000FF']
                }
            },

            // Dashboard Settings
            dashboard: {
                enabled: true,
                refreshRate: 1000,
                showMetrics: {
                    power: true,
                    speed: true,
                    heartRate: true,
                    cadence: true,
                    gradient: true,
                    distance: true,
                    time: true,
                    elevation: true
                },
                units: 'metric',
                theme: 'dark',
                layout: 'grid',
                fontSize: 14,
                showGraphs: true,
                graphTimespan: 300
            },

            // General Settings
            general: {
                theme: 'dark',
                units: 'metric',
                language: 'en',
                debugMode: false,
                autoUpdate: true,
                notifications: true,
                hotkeys: {
                    togglePowerBar: 'Ctrl+Shift+P',
                    toggleAudioPlayer: 'Ctrl+Shift+A',
                    toggleDashboard: 'Ctrl+Shift+D'
                }
            }
        };
    }

    load() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const parsed = JSON.parse(stored);
                return this.deepMerge(this.defaults, parsed);
            }
        } catch (error) {
            console.warn('[DEGRE Config] Load error:', error);
        }
        return { ...this.defaults };
    }

    save() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.config));
            this.notifyListeners();
            this.eventTarget.dispatchEvent(new CustomEvent('configChanged', {
                detail: this.config
            }));
            return true;
        } catch (error) {
            console.error('[DEGRE Config] Save error:', error);
            return false;
        }
    }

    get(path) {
        return this.getNestedValue(this.config, path);
    }

    set(path, value) {
        this.setNestedValue(this.config, path, value);
        return this.save();
    }

    reset(section = null) {
        if (section) {
            this.config[section] = { ...this.defaults[section] };
        } else {
            this.config = { ...this.defaults };
        }
        return this.save();
    }

    // Utility methods
    deepMerge(target, source) {
        const result = { ...target };
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this.deepMerge(target[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }
        return result;
    }

    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }

    setNestedValue(obj, path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((current, key) => {
            if (!(key in current)) current[key] = {};
            return current[key];
        }, obj);
        target[lastKey] = value;
    }

    // Event system
    onChange(callback) {
        const listener = (event) => callback(event.detail);
        this.eventTarget.addEventListener('configChanged', listener);
        return () => this.eventTarget.removeEventListener('configChanged', listener);
    }

    notifyListeners() {
        // Legacy support
        if (this.listeners.size > 0) {
            this.listeners.forEach(callback => {
                try {
                    callback(this.config);
                } catch (error) {
                    console.error('[DEGRE Config] Listener error:', error);
                }
            });
        }
    }

    // Playlist management
    addPlaylist(name, tracks) {
        const playlists = this.get('audioPlayer.customPlaylists') || [];
        playlists.push({ name, tracks, id: Date.now() });
        this.set('audioPlayer.customPlaylists', playlists);
    }

    removePlaylist(id) {
        const playlists = this.get('audioPlayer.customPlaylists') || [];
        const filtered = playlists.filter(p => p.id !== id);
        this.set('audioPlayer.customPlaylists', filtered);
    }

    // Zone management for power bar
    updatePowerZone(zoneId, settings) {
        this.set(`powerBar.zones.${zoneId}`, { ...this.get(`powerBar.zones.${zoneId}`), ...settings });
    }

    // Export/Import settings
    export() {
        return JSON.stringify(this.config, null, 2);
    }

    import(jsonString) {
        try {
            const imported = JSON.parse(jsonString);
            this.config = this.deepMerge(this.defaults, imported);
            return this.save();
        } catch (error) {
            console.error('[DEGRE Config] Import error:', error);
            return false;
        }
    }

    // Validation
    validate() {
        const errors = [];
        
        // Validate power zones
        const zones = this.get('powerBar.zones');
        Object.keys(zones).forEach(zoneKey => {
            const zone = zones[zoneKey];
            if (zone.min >= zone.max) {
                errors.push(`Power zone ${zoneKey}: min value must be less than max value`);
            }
        });

        // Validate refresh rate
        const refreshRate = this.get('dashboard.refreshRate');
        if (refreshRate < 100 || refreshRate > 10000) {
            errors.push('Dashboard refresh rate must be between 100ms and 10000ms');
        }

        return errors;
    }
}

// Make available globally
window.DegreConfigManager = DegreConfigManager;