/**
 * DEGRE Professional Mods - Utility Functions
 * Common utilities used across all mod components
 */

// DEGRE Utilities Namespace
window.DEGRE = window.DEGRE || {};
window.DEGRE.Utils = {

    // Data Formatting
    formatters: {
        power: (watts) => watts ? `${Math.round(watts)}W` : '0W',
        
        speed: (mps, metric = true) => {
            if (!mps) return metric ? '0 km/h' : '0 mph';
            const speed = metric ? mps * 3.6 : mps * 2.237;
            const unit = metric ? 'km/h' : 'mph';
            return `${speed.toFixed(1)} ${unit}`;
        },
        
        heartRate: (bpm) => bpm ? `${Math.round(bpm)} bpm` : '-- bpm',
        
        cadence: (rpm) => rpm ? `${Math.round(rpm)} rpm` : '-- rpm',
        
        time: (seconds) => {
            if (!seconds || isNaN(seconds)) return '0:00';
            const hours = Math.floor(seconds / 3600);
            const mins = Math.floor((seconds % 3600) / 60);
            const secs = Math.floor(seconds % 60);
            
            if (hours > 0) {
                return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            }
            return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        },
        
        distance: (meters, metric = true) => {
            if (!meters) return '0m';
            if (metric) {
                return meters >= 1000 ? `${(meters / 1000).toFixed(1)}km` : `${Math.round(meters)}m`;
            } else {
                const feet = meters * 3.28084;
                return feet >= 5280 ? `${(feet / 5280).toFixed(1)}mi` : `${Math.round(feet)}ft`;
            }
        },
        
        gradient: (grade) => {
            if (grade === null || grade === undefined) return '0%';
            return `${(grade * 100).toFixed(1)}%`;
        },
        
        wattsPerKg: (power, weight) => {
            if (!power || !weight) return '0.0 W/kg';
            return `${(power / weight).toFixed(1)} W/kg`;
        },
        
        percentage: (value, max) => {
            if (!value || !max) return '0%';
            return `${Math.round((value / max) * 100)}%`;
        }
    },

    // Performance Utilities
    performance: {
        debounce: (func, wait, immediate = false) => {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    timeout = null;
                    if (!immediate) func(...args);
                };
                const callNow = immediate && !timeout;
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
                if (callNow) func(...args);
            };
        },

        throttle: (func, limit) => {
            let inThrottle;
            return function(...args) {
                if (!inThrottle) {
                    func.apply(this, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        },

        requestIdleCallback: (callback, options = {}) => {
            if (window.requestIdleCallback) {
                return window.requestIdleCallback(callback, options);
            } else {
                // Fallback for browsers that don't support requestIdleCallback
                return setTimeout(() => {
                    const start = Date.now();
                    callback({
                        didTimeout: false,
                        timeRemaining: () => Math.max(0, 50 - (Date.now() - start))
                    });
                }, 1);
            }
        },

        cancelIdleCallback: (id) => {
            if (window.cancelIdleCallback) {
                window.cancelIdleCallback(id);
            } else {
                clearTimeout(id);
            }
        }
    },

    // DOM Utilities
    dom: {
        createElement: (tag, options = {}) => {
            const element = document.createElement(tag);
            
            if (options.className) element.className = options.className;
            if (options.id) element.id = options.id;
            if (options.textContent) element.textContent = options.textContent;
            if (options.innerHTML) element.innerHTML = options.innerHTML;
            
            if (options.attributes) {
                Object.entries(options.attributes).forEach(([key, value]) => {
                    element.setAttribute(key, value);
                });
            }
            
            if (options.styles) {
                Object.assign(element.style, options.styles);
            }
            
            if (options.events) {
                Object.entries(options.events).forEach(([event, handler]) => {
                    element.addEventListener(event, handler);
                });
            }
            
            return element;
        },

        addStyles: (styles) => {
            const styleSheet = document.createElement('style');
            styleSheet.textContent = styles;
            document.head.appendChild(styleSheet);
            return styleSheet;
        },

        onReady: (callback) => {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', callback);
            } else {
                callback();
            }
        },

        isElementInViewport: (element) => {
            const rect = element.getBoundingClientRect();
            return (
                rect.top >= 0 &&
                rect.left >= 0 &&
                rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
                rect.right <= (window.innerWidth || document.documentElement.clientWidth)
            );
        }
    },

    // Data Processing
    data: {
        calculateMovingAverage: (data, windowSize = 5) => {
            if (data.length < windowSize) return data;
            
            const result = [];
            for (let i = windowSize - 1; i < data.length; i++) {
                const window = data.slice(i - windowSize + 1, i + 1);
                const average = window.reduce((sum, val) => sum + val, 0) / windowSize;
                result.push(average);
            }
            return result;
        },

        interpolate: (start, end, factor) => {
            return start + (end - start) * factor;
        },

        clamp: (value, min, max) => Math.max(min, Math.min(max, value)),

        normalize: (value, min, max) => (value - min) / (max - min),

        smoothStep: (edge0, edge1, x) => {
            const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
            return t * t * (3 - 2 * t);
        },

        getPowerZone: (wattsPerKg, zones) => {
            for (const [zoneId, zone] of Object.entries(zones)) {
                if (wattsPerKg >= zone.min && wattsPerKg < zone.max) {
                    return { id: zoneId, ...zone };
                }
            }
            return null;
        }
    },

    // Storage Utilities
    storage: {
        safeJsonParse: (str, fallback = null) => {
            try {
                return JSON.parse(str);
            } catch {
                return fallback;
            }
        },

        safeJsonStringify: (obj, fallback = '{}') => {
            try {
                return JSON.stringify(obj);
            } catch {
                return fallback;
            }
        },

        get: (key, defaultValue = null) => {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch {
                return defaultValue;
            }
        },

        set: (key, value) => {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch {
                return false;
            }
        },

        remove: (key) => {
            try {
                localStorage.removeItem(key);
                return true;
            } catch {
                return false;
            }
        },

        clear: () => {
            try {
                localStorage.clear();
                return true;
            } catch {
                return false;
            }
        }
    },

    // Validation Utilities
    validation: {
        isValidNumber: (value) => typeof value === 'number' && !isNaN(value) && isFinite(value),
        
        isValidUrl: (string) => {
            try {
                new URL(string);
                return true;
            } catch {
                return false;
            }
        },
        
        isValidEmail: (email) => {
            const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return re.test(email);
        },
        
        isValidHexColor: (color) => {
            const re = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
            return re.test(color);
        }
    },

    // Animation Utilities
    animation: {
        easeInOut: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
        
        easeIn: (t) => t * t,
        
        easeOut: (t) => t * (2 - t),
        
        animate: (from, to, duration, callback, easing = null) => {
            const start = performance.now();
            const easingFunction = easing || window.DEGRE.Utils.animation.easeInOut;
            
            function update(currentTime) {
                const elapsed = currentTime - start;
                const progress = Math.min(elapsed / duration, 1);
                const easedProgress = easingFunction(progress);
                const current = from + (to - from) * easedProgress;
                
                callback(current, progress);
                
                if (progress < 1) {
                    requestAnimationFrame(update);
                }
            }
            
            requestAnimationFrame(update);
        }
    },

    // Color Utilities
    color: {
        hexToRgb: (hex) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : null;
        },
        
        rgbToHex: (r, g, b) => {
            return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
        },
        
        interpolateRgb: (color1, color2, factor) => {
            const c1 = window.DEGRE.Utils.color.hexToRgb(color1);
            const c2 = window.DEGRE.Utils.color.hexToRgb(color2);
            
            if (!c1 || !c2) return color1;
            
            const r = Math.round(c1.r + (c2.r - c1.r) * factor);
            const g = Math.round(c1.g + (c2.g - c1.g) * factor);
            const b = Math.round(c1.b + (c2.b - c1.b) * factor);
            
            return window.DEGRE.Utils.color.rgbToHex(r, g, b);
        }
    },

    // Event Utilities
    events: {
        createCustomEvent: (name, detail = {}) => {
            return new CustomEvent(name, { detail });
        },
        
        once: (element, event, callback) => {
            const handler = (e) => {
                element.removeEventListener(event, handler);
                callback(e);
            };
            element.addEventListener(event, handler);
        },
        
        delegate: (parent, selector, event, callback) => {
            parent.addEventListener(event, (e) => {
                if (e.target.matches(selector)) {
                    callback.call(e.target, e);
                }
            });
        }
    },

    // Math Utilities
    math: {
        randomBetween: (min, max) => Math.random() * (max - min) + min,
        
        randomInt: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
        
        roundToDecimals: (num, decimals) => {
            const factor = Math.pow(10, decimals);
            return Math.round(num * factor) / factor;
        },
        
        degToRad: (degrees) => degrees * (Math.PI / 180),
        
        radToDeg: (radians) => radians * (180 / Math.PI)
    },

    // Debug Utilities
    debug: {
        log: (message, data = null) => {
            if (window.DEGRE?.config?.get('general.debugMode')) {
                console.log(`[DEGRE Debug] ${message}`, data || '');
            }
        },
        
        warn: (message, data = null) => {
            if (window.DEGRE?.config?.get('general.debugMode')) {
                console.warn(`[DEGRE Warning] ${message}`, data || '');
            }
        },
        
        error: (message, error = null) => {
            console.error(`[DEGRE Error] ${message}`, error || '');
        },
        
        time: (label) => {
            if (window.DEGRE?.config?.get('general.debugMode')) {
                console.time(`[DEGRE Timer] ${label}`);
            }
        },
        
        timeEnd: (label) => {
            if (window.DEGRE?.config?.get('general.debugMode')) {
                console.timeEnd(`[DEGRE Timer] ${label}`);
            }
        }
    }
};

// Initialize utilities when DOM is ready
window.DEGRE.Utils.dom.onReady(() => {
    console.log('[DEGRE Utils] Utilities initialized');
    
    // Add global keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey) {
            switch (e.key) {
                case 'D':
                    e.preventDefault();
                    window.DEGRE?.broadcast?.('toggle-debug');
                    break;
                case 'R':
                    e.preventDefault();
                    window.location.reload();
                    break;
            }
        }
    });
});