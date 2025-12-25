// API Rate Limiting Store with Smart Frequency-Based Throttling
import { defineStore } from 'pinia';

const MAX_REQUESTS_PER_MIN = 100;
const MIN_REFRESH_INTERVAL = 3000;
const MAX_REFRESH_INTERVAL = 30000;
const FREQUENCY_WINDOW_MS = 15000; // 15 second window for frequency calculation

interface EndpointCall {
    endpoint: 'trains' | 'departures' | 'locations';
    timestamp: number;
}

interface QueuedRequest {
    id: string;
    priority: 'high' | 'normal' | 'low';
    type: 'trains' | 'departures';
    stationName?: string;
    timestamp: number;
    execute?: () => Promise<void>;
}

export const useApiStore = defineStore('api', {
    state: () => ({
        // Request tracking (per minute)
        requestTimestamps: [] as number[],
        requestsPerMin: 0,

        // Interval ID for monitoring
        monitorInterval: null as ReturnType<typeof setInterval> | null,

        // Endpoint frequency tracking (last 15 seconds)
        endpointCalls: [] as EndpointCall[],

        // Queue management
        requestQueue: [] as QueuedRequest[],
        blockedRequests: 0,
        isProcessing: false,

        // Priority tracking
        lastHoveredStation: null as string | null,
        lastHoveredLine: null as string | null,

        // Refresh interval
        refreshInterval: MIN_REFRESH_INTERVAL,

        // Loading states
        departuresLoading: false,
    }),

    getters: {
        usagePercent(): number {
            return Math.round((this.requestsPerMin / MAX_REQUESTS_PER_MIN) * 100);
        },

        isWarning(): boolean {
            return this.requestsPerMin > 70;
        },

        isDanger(): boolean {
            return this.requestsPerMin > 90;
        },

        canMakeRequest(): boolean {
            return this.requestsPerMin < MAX_REQUESTS_PER_MIN;
        },

        queueSize(): number {
            return this.requestQueue.length;
        },

        availableSlots(): number {
            return Math.max(0, MAX_REQUESTS_PER_MIN - this.requestsPerMin);
        },

        // Get call frequency per endpoint (calls per 15 seconds)
        endpointFrequency(): Record<string, number> {
            const now = Date.now();
            const windowStart = now - FREQUENCY_WINDOW_MS;
            const recentCalls = this.endpointCalls.filter(c => c.timestamp > windowStart);

            const freq: Record<string, number> = { trains: 0, departures: 0, locations: 0 };
            recentCalls.forEach(c => {
                freq[c.endpoint] = (freq[c.endpoint] || 0) + 1;
            });
            return freq;
        },

        // Calculate recommended minimum interval based on recent activity
        recommendedInterval(): number {
            const freq = this.endpointFrequency;
            const totalCalls = freq.trains + freq.departures + freq.locations;

            // If high frequency in last 15 seconds, slow down
            if (totalCalls > 20) {
                return 15000; // Very active - slow to 15s
            } else if (totalCalls > 10) {
                return 8000; // Moderately active - 8s
            } else if (totalCalls > 5) {
                return 5000; // Some activity - 5s
            }
            return MIN_REFRESH_INTERVAL; // Low activity - fast refresh
        },
    },

    actions: {
        // Record an endpoint call for frequency tracking
        recordEndpointCall(endpoint: 'trains' | 'departures' | 'locations') {
            const now = Date.now();
            this.endpointCalls.push({ endpoint, timestamp: now });

            // Clean up old entries (older than frequency window)
            const windowStart = now - FREQUENCY_WINDOW_MS;
            this.endpointCalls = this.endpointCalls.filter(c => c.timestamp > windowStart);
        },

        // Update request count (called every second)
        updateRequestCount() {
            const now = Date.now();
            const oneMinuteAgo = now - 60000;
            this.requestTimestamps = this.requestTimestamps.filter(t => t > oneMinuteAgo);
            this.requestsPerMin = this.requestTimestamps.length;

            // Clean up endpoint calls
            const windowStart = now - FREQUENCY_WINDOW_MS;
            this.endpointCalls = this.endpointCalls.filter(c => c.timestamp > windowStart);

            // Update refresh interval based on both usage and frequency
            this.calculateRefreshInterval();
        },

        // Record a request
        recordRequest() {
            this.requestTimestamps.push(Date.now());
            this.requestsPerMin = this.requestTimestamps.length;
        },

        // Calculate optimal refresh interval (considers both rate limit and frequency)
        calculateRefreshInterval() {
            const available = this.availableSlots;
            const recommended = this.recommendedInterval;

            let baseInterval: number;
            if (available < 10) {
                baseInterval = MAX_REFRESH_INTERVAL;
            } else if (available < 30) {
                baseInterval = 15000;
            } else if (available < 50) {
                baseInterval = 8000;
            } else {
                baseInterval = MIN_REFRESH_INTERVAL;
            }

            // Use the higher of the two to be safe
            this.refreshInterval = Math.max(baseInterval, recommended);
        },

        // Set hovered station (for priority)
        setHoveredStation(stationName: string | null) {
            this.lastHoveredStation = stationName;
        },

        // Set hovered line (for priority)
        setHoveredLine(lineName: string | null) {
            this.lastHoveredLine = lineName;
        },

        // Queue a request with priority
        queueRequest(request: Omit<QueuedRequest, 'id' | 'timestamp'>): boolean {
            if (this.canMakeRequest) {
                return true;
            }

            this.blockedRequests++;
            setTimeout(() => {
                if (this.blockedRequests > 0) this.blockedRequests--;
            }, 1000);

            return false;
        },

        // Helper to check rate limit without side effects
        checkRateLimit(priority: 'high' | 'normal' | 'low'): boolean {
            const threshold = priority === 'high' ? 98 : priority === 'normal' ? 90 : 80;
            return this.requestsPerMin < threshold;
        },

        // Execute a request (immediate or queued)
        async executeRequest<T>(
            type: 'trains' | 'departures' | 'locations',
            fetchFn: () => Promise<T>,
            priority: 'high' | 'normal' | 'low' = 'normal'
        ): Promise<T | null> {
            // 1. Check if we can run immediately
            if (this.checkRateLimit(priority)) {
                this.recordRequest();
                this.recordEndpointCall(type);

                if (type === 'departures') this.departuresLoading = true;
                try {
                    return await fetchFn();
                } finally {
                    if (type === 'departures') this.departuresLoading = false;
                }
            }

            // 2. If high priority (user interaction), queue it
            if (priority === 'high') {
                return new Promise<T>((resolve) => {
                    const id = Math.random().toString(36).substring(7);
                    this.requestQueue.push({
                        id,
                        priority,
                        type,
                        timestamp: Date.now(),
                        execute: async () => {
                            this.recordRequest();
                            this.recordEndpointCall(type);
                            if (type === 'departures') this.departuresLoading = true;
                            try {
                                const result = await fetchFn();
                                resolve(result);
                            } finally {
                                if (type === 'departures') this.departuresLoading = false;
                            }
                        }
                    });
                });
            }

            // 3. Low/Normal priority - drop it and show blocked
            this.blockedRequests++;
            setTimeout(() => {
                if (this.blockedRequests > 0) this.blockedRequests--;
            }, 1000);
            return null;
        },

        // Process queued requests
        processQueue() {
            if (this.requestQueue.length === 0) return;

            // Sort by priority/age? For now just FIFO high priority
            // Check slots
            if (!this.checkRateLimit('high')) return;

            const nextReq = this.requestQueue.shift();
            if (nextReq && nextReq.execute) {
                nextReq.execute();
            }
        },

        // Start monitoring
        startMonitoring() {
            if (this.isProcessing) return;
            this.isProcessing = true;

            // Update rates and process queue every second
            this.monitorInterval = setInterval(() => {
                this.updateRequestCount();
                this.processQueue();
            }, 1000);
        },

        // Stop monitoring
        stopMonitoring() {
            if (this.monitorInterval) {
                clearInterval(this.monitorInterval);
                this.monitorInterval = null;
            }
            this.isProcessing = false;
        }
    },
});

export function startApiMonitoring() {
    const apiStore = useApiStore();
    apiStore.startMonitoring();
}

export function stopApiMonitoring() {
    const apiStore = useApiStore();
    apiStore.stopMonitoring();
}
