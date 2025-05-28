/**
 * DEGRE Professional Mods - Sauce4Zwift API Helper
 * Advanced API client with caching and reconnection logic
 */

class DegreAPI {
    constructor() {
        this.baseURL = 'http://localhost:1080/api';
        this.wsURL = 'ws://localhost:1080/api/ws/events';
        this.ws = null;
        this.listeners = new Map();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.reconnectDelay = 2000;
        this.isConnected = false;
        
        // Data caching
        this.cache = {
            watching: null,
            athletes: null,
            lastUpdate: null
        };
    }

    async get(endpoint) {
        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 5000
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error(`[DEGRE API] GET ${endpoint} error:`, error);
            throw error;
        }
    }

    // Enhanced API methods with caching
    async getWatching(useCache = true) {
        if (useCache && this.cache.watching && (Date.now() - this.cache.lastUpdate < 500)) {
            return this.cache.watching;
        }
        
        const data = await this.get('/athlete/watching');
        this.cache.watching = data;
        this.cache.lastUpdate = Date.now();
        return data;
    }

    async getAthletes() {
        if (this.cache.athletes) return this.cache.athletes;
        
        const data = await this.get('/athletes');
        this.cache.athletes = data;
        return data;
    }

    async getStates() {
        return await this.get('/states');
    }

    async getWorld() {
        return await this.get('/world');
    }

    // WebSocket with advanced reconnection
    connectWebSocket() {
        if (this.ws?.readyState === WebSocket.OPEN) return;

        try {
            this.ws = new WebSocket(this.wsURL);
            
            this.ws.onopen = () => {
                console.log('[DEGRE API] WebSocket connected');
                this.isConnected = true;
                this.reconnectAttempts = 0;
                this.emit('connected');
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    
                    // Update cache for real-time data
                    if (data.type === 'athlete/watching') {
                        this.cache.watching = data;
                        this.cache.lastUpdate = Date.now();
                    }
                    
                    this.emit('data', data);
                    if (data.type) this.emit(data.type, data);
                } catch (error) {
                    console.error('[DEGRE API] WebSocket parse error:', error);
                }
            };

            this.ws.onclose = (event) => {
                console.log('[DEGRE API] WebSocket closed:', event.code);
                this.isConnected = false;
                this.ws = null;
                this.emit('disconnected', event);
                
                if (event.code !== 1000) { // Not a normal closure
                    this.handleReconnect();
                }
            };

            this.ws.onerror = (error) => {
                console.error('[DEGRE API] WebSocket error:', error);
                this.emit('error', error);
            };

        } catch (error) {
            console.error('[DEGRE API] WebSocket connection failed:', error);
            this.handleReconnect();
        }
    }

    handleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('[DEGRE API] Max reconnection attempts reached');
            this.emit('maxReconnectReached');
            return;
        }

        this.reconnectAttempts++;
        const delay = Math.min(
            this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1),
            30000 // Max 30 seconds
        );
        
        console.log(`[DEGRE API] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
        
        setTimeout(() => {
            this.connectWebSocket();
        }, delay);
    }

    // Enhanced event system
    on(event, callback, options = {}) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        
        const listener = { callback, options };
        this.listeners.get(event).push(listener);
        
        return () => this.off(event, callback);
    }

    off(event, callback) {
        if (this.listeners.has(event)) {
            const listeners = this.listeners.get(event);
            const index = listeners.findIndex(l => l.callback === callback);
            if (index > -1) listeners.splice(index, 1);
        }
    }

    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(listener => {
                try {
                    // Handle throttling if specified
                    if (listener.options.throttle) {
                        if (!listener.lastCall || Date.now() - listener.lastCall >= listener.options.throttle) {
                            listener.callback(data);
                            listener.lastCall = Date.now();
                        }
                    } else {
                        listener.callback(data);
                    }
                } catch (error) {
                    console.error(`[DEGRE API] Event callback error (${event}):`, error);
                }
            });
        }
    }

    disconnect() {
        if (this.ws) {
            this.ws.close(1000, 'Manual disconnect');
            this.ws = null;
        }
        this.listeners.clear();
        this.isConnected = false;
    }

    // Health check with retry
    async isHealthy(retries = 3) {
        for (let i = 0; i < retries; i++) {
            try {
                await this.get('/athletes');
                return true;
            } catch (error) {
                if (i === retries - 1) return false;
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        return false;
    }

    // Data processing utilities
    static formatPower(watts) {
        return watts ? `${Math.round(watts)}W` : '0W';
    }

    static formatSpeed(mps, metric = true) {
        if (!mps) return metric ? '0 km/h' : '0 mph';
        const speed = metric ? mps * 3.6 : mps * 2.237;
        const unit = metric ? 'km/h' : 'mph';
        return `${speed.toFixed(1)} ${unit}`;
    }

    static formatHeartRate(bpm) {
        return bpm ? `${Math.round(bpm)} bpm` : '-- bpm';
    }

    static formatCadence(rpm) {
        return rpm ? `${Math.round(rpm)} rpm` : '-- rpm';
    }

    static calculateWattsPerKg(power, weight) {
        if (!power || !weight) return 0;
        return power / weight;
    }

    static getPowerZone(wattsPerKg, zones) {
        for (const [zoneId, zone] of Object.entries(zones)) {
            if (wattsPerKg >= zone.min && wattsPerKg < zone.max) {
                return { id: zoneId, ...zone };
            }
        }
        return null;
    }
}

// Make available globally
window.DegreAPI = DegreAPI;