// Transit Data Store - Lines, Stations, Trains
import { defineStore } from 'pinia';
import * as THREE from 'three';
import { ubahnColors, ubahnStations, getLineRoute as getUbahnRoute } from '~/data/ubahn';
import { regionalColors, re1Stations, getRE1Route } from '~/data/regional';

// Types
export interface Train {
    tripId: string;
    lat: number;
    lng: number;
    lineName: string;
    direction: string;
    delay: number;
}

export interface Departure {
    line: string;
    destination: string;
    time: string;
    color: string;
    platform: string;
    delay: number;
}

export interface Station {
    name: string;
    lat: number;
    lng: number;
    lines: string[];
}

// Constants
export const LINE_THICKNESS = 4;
export const BG_LINE_THICKNESS = 1.5;
export const STATION_RADIUS = 3;
export const BG_STATION_RADIUS = 1.5;
export const TRAIN_SIZE = 2.5;

// All line colors
export const allLineColors: Record<string, string> = { ...ubahnColors, ...regionalColors };

// Coordinate conversion
export function latLngToScene(lat: number, lng: number): { x: number; y: number } {
    const centerLat = 52.4;
    const centerLng = 13.1;
    const scale = 1000;
    return {
        x: (lng - centerLng) * scale,
        y: (lat - centerLat) * scale
    };
}

export const useTransitStore = defineStore('transit', {
    state: () => ({
        // Line visibility
        enabledLines: Object.keys(allLineColors).reduce((acc, line) => {
            acc[line] = line === 'U5';
            return acc;
        }, {} as Record<string, boolean>),

        // Trains
        trains: [] as Train[],
        trainCount: 0,
        loading: false,

        // Line routes (for snapping)
        lineRoutes: {} as Record<string, THREE.Vector3[]>,

        // Departures cache
        departuresCache: new Map<string, any>(),
    }),

    getters: {
        allStations(): Station[] {
            return [...ubahnStations, ...re1Stations];
        },

        visibleTrains(): Train[] {
            return this.trains.filter(t => this.enabledLines[t.lineName]);
        },

        getLineColor: () => (lineName: string): string => {
            return allLineColors[lineName] || '#888888';
        },
    },

    actions: {
        toggleLine(line: string) {
            this.enabledLines[line] = !this.enabledLines[line];
        },

        showAll() {
            Object.keys(this.enabledLines).forEach(l => this.enabledLines[l] = true);
        },

        showNone() {
            Object.keys(this.enabledLines).forEach(l => this.enabledLines[l] = false);
        },

        // Build line routes for Three.js
        buildLineRoutes() {
            // U-Bahn lines
            Object.keys(ubahnColors).forEach(name => {
                const route = getUbahnRoute(name);
                if (route.length >= 2) {
                    this.lineRoutes[name] = route.map(([lat, lng]) => {
                        const { x, y } = latLngToScene(lat, lng);
                        return new THREE.Vector3(x, y, 0);
                    });
                }
            });

            // RE1
            const re1Route = getRE1Route();
            if (re1Route.length >= 2) {
                this.lineRoutes['RE1'] = re1Route.map(([lat, lng]) => {
                    const { x, y } = latLngToScene(lat, lng);
                    return new THREE.Vector3(x, y, 0);
                });
            }
        },

        // Snap to track
        snapToTrack(lat: number, lng: number, lineName: string): { x: number; y: number } {
            const { x, y } = latLngToScene(lat, lng);
            const route = this.lineRoutes[lineName];
            if (!route || route.length < 2) return { x, y };

            let closestX = x, closestY = y, minDist = Infinity;

            for (let i = 0; i < route.length - 1; i++) {
                const a = route[i], b = route[i + 1];
                const abx = b.x - a.x, aby = b.y - a.y;
                const apx = x - a.x, apy = y - a.y;
                const ab2 = abx * abx + aby * aby;
                if (ab2 === 0) continue;

                let t = (apx * abx + apy * aby) / ab2;
                t = Math.max(0, Math.min(1, t));

                const px = a.x + t * abx, py = a.y + t * aby;
                const dist = Math.sqrt((x - px) ** 2 + (y - py) ** 2);

                if (dist < minDist) { minDist = dist; closestX = px; closestY = py; }
            }
            return { x: closestX, y: closestY };
        },

        // Fetch trains (with rate limiting)
        async fetchTrains() {
            const { useApiStore } = await import('./apiStore');
            const apiStore = useApiStore();

            // Use priority based on last hovered line
            const priority = apiStore.lastHoveredLine ? 'normal' : 'low';

            const result = await apiStore.executeRequest('trains', async () => {
                const response = await fetch('/api/u5-positions');
                return response.json();
            }, priority);

            if (result?.trains && Array.isArray(result.trains)) {
                this.trains = result.trains.map((t: any) => ({
                    tripId: t.tripId,
                    lat: t.latitude,
                    lng: t.longitude,
                    lineName: t.lineName,
                    direction: t.direction,
                    delay: t.delay
                }));
                this.trainCount = this.visibleTrains.length;
            }

            this.loading = false;
        },

        // Fetch departures (with priority for hovered station)
        async fetchDepartures(stationName: string, isHovered: boolean = false) {
            const cached = this.departuresCache.get(stationName);
            if (cached) return cached;

            const { useApiStore } = await import('./apiStore');
            const apiStore = useApiStore();

            // High priority if this is the hovered station
            const priority = isHovered || apiStore.lastHoveredStation === stationName ? 'high' : 'normal';

            const result = await apiStore.executeRequest('departures', async () => {
                const response = await fetch(`/api/station-departures?station=${encodeURIComponent(stationName)}`);
                return response.json();
            }, priority);

            if (result) {
                this.departuresCache.set(stationName, result);
                setTimeout(() => this.departuresCache.delete(stationName), 60000);
                return result;
            }

            return { grouped: {} };
        },

        prefetchDepartures(stationName: string) {
            if (!this.departuresCache.has(stationName)) {
                this.fetchDepartures(stationName, false);
            }
        },

        processDepartures(result: any): Record<string, Departure[]> {
            const grouped: Record<string, Departure[]> = {};
            for (const [category, deps] of Object.entries(result.grouped || {})) {
                grouped[category] = (deps as any[]).map(dep => {
                    const when = dep.actualTime || dep.plannedTime;
                    const mins = when ? Math.max(0, Math.round((new Date(when).getTime() - Date.now()) / 60000)) : 0;
                    return {
                        line: dep.line,
                        destination: dep.destination,
                        time: `${mins}m`,
                        color: this.getLineColor(dep.line),
                        platform: dep.platform || '',
                        delay: Math.round((dep.delay || 0) / 60)
                    };
                });
            }
            return grouped;
        },
    },
});
