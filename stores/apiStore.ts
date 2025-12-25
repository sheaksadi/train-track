// API Rate Limiting Store with Request Queue
import { defineStore } from 'pinia';

const MAX_REQUESTS_PER_MIN = 100;
const MIN_REFRESH_INTERVAL = 3000;
const MAX_REFRESH_INTERVAL = 30000;

interface QueuedRequest {
    id: string;
    priority: 'high' | 'normal' | 'low';
    type: 'trains' | 'departures';
    stationName?: string;
    timestamp: number;
}

export const useApiStore = defineStore('api', {
    state: () => ({
        // Request tracking
        requestTimestamps: [] as number[],
        requestsPerMin: 0,

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
    },

    actions: {
        // Update request count (called every second)
        updateRequestCount() {
            const now = Date.now();
            const oneMinuteAgo = now - 60000;
            this.requestTimestamps = this.requestTimestamps.filter(t => t > oneMinuteAgo);
            this.requestsPerMin = this.requestTimestamps.length;

            // Update refresh interval based on usage
            this.calculateRefreshInterval();
        },

        // Record a request
        recordRequest() {
            this.requestTimestamps.push(Date.now());
            this.requestsPerMin = this.requestTimestamps.length;
        },

        // Calculate optimal refresh interval
        calculateRefreshInterval() {
            const available = this.availableSlots;

            if (available < 10) {
                // Almost at limit - slow down a lot
                this.refreshInterval = MAX_REFRESH_INTERVAL;
            } else if (available < 30) {
                // Getting close - slow down
                this.refreshInterval = 15000;
            } else if (available < 50) {
                // Moderate usage
                this.refreshInterval = 8000;
            } else {
                // Plenty of room
                this.refreshInterval = MIN_REFRESH_INTERVAL;
            }
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
            // Check if we can make the request immediately
            if (this.canMakeRequest) {
                return true; // Proceed immediately
            }

            // Queue is full - drop the request
            this.blockedRequests++;

            // Clear blocked count after a second
            setTimeout(() => {
                if (this.blockedRequests > 0) this.blockedRequests--;
            }, 1000);

            return false; // Request was blocked
        },

        // Execute a request if allowed
        async executeRequest<T>(
            type: 'trains' | 'departures',
            fetchFn: () => Promise<T>,
            priority: 'high' | 'normal' | 'low' = 'normal'
        ): Promise<T | null> {
            // High priority (hovered station) can use more slots
            const threshold = priority === 'high' ? 98 : priority === 'normal' ? 90 : 80;

            if (this.requestsPerMin >= threshold) {
                this.blockedRequests++;
                setTimeout(() => {
                    if (this.blockedRequests > 0) this.blockedRequests--;
                }, 1000);
                return null;
            }

            this.recordRequest();

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
