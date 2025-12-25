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
}

export const useApiStore = defineStore('api', {
    state: () => ({
        // Request tracking (per minute)
        requestTimestamps: [] as number[],
        requestsPerMin: 0,

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

        // Execute a request if allowed
        async executeRequest<T>(
            type: 'trains' | 'departures',
            fetchFn: () => Promise<T>,
            priority: 'high' | 'normal' | 'low' = 'normal'
        ): Promise<T | null> {
            const threshold = priority === 'high' ? 98 : priority === 'normal' ? 90 : 80;

            if (this.requestsPerMin >= threshold) {
                this.blockedRequests++;
                setTimeout(() => {
                    if (this.blockedRequests > 0) this.blockedRequests--;
                }, 1000);
                return null;
            }

            this.recordRequest();
            this.recordEndpointCall(type);

            if (type === 'departures') {
                this.departuresLoading = true;
            }

            try {
                return await fetchFn();
            } finally {
                if (type === 'departures') {
                    this.departuresLoading = false;
                }
            }
        },

        // Reset blocked counter
        clearBlocked() {
            this.blockedRequests = 0;
        },
    },
});

// Start periodic update of request count
let updateInterval: ReturnType<typeof setInterval> | null = null;

export function startApiMonitoring() {
    if (updateInterval) return;

    const apiStore = useApiStore();
    updateInterval = setInterval(() => {
        apiStore.updateRequestCount();
    }, 1000);
}

export function stopApiMonitoring() {
    if (updateInterval) {
        clearInterval(updateInterval);
        updateInterval = null;
    }
}
