// Transit Data Store - Lines, Stations, Trains
import { defineStore } from 'pinia';
import * as THREE from 'three';
import { ubahnColors, ubahnStations, getLineRoute as getUbahnRoute } from '~/data/ubahn';
import { regionalColors, re1Stations, getRE1Route } from '~/data/regional';
import { sbahnColors } from '~/data/sbahn';
import { tramColors } from '~/data/tram';

// Types
export interface Train {
    tripId: string;
    lat: number;
    lng: number;
    lineName: string;
    direction: string;
    delay: number;
    nextStation?: string;
    nextStationTime?: string;
    platform?: string;
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
    id?: string;
}

// Constants
export const LINE_THICKNESS = 4;
export const BG_LINE_THICKNESS = 1.5;
export const STATION_RADIUS = 3;
export const BG_STATION_RADIUS = 1.5;
export const TRAIN_SIZE = 2.5;

// All line colors
export const allLineColors: Record<string, string> = { ...ubahnColors, ...regionalColors, ...sbahnColors, ...tramColors };

// Coordinate conversion
export function latLngToScene(lat: number, lng: number): { x: number; y: number } {
    const centerLat = 52.52; // Berlin
    const centerLng = 13.40;
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

        // Canonical station coordinates (from generated/live data)
        canonicalCoordinates: {} as Record<string, { lat: number, lng: number }>,

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

        updateRouteCoordinates(coords: Record<string, { lat: number, lng: number }>) {
            this.canonicalCoordinates = { ...this.canonicalCoordinates, ...coords };
        },

        // Build line routes for Three.js
        buildLineRoutes() {
            const getCoords = (name: string, fallbackLat: number, fallbackLng: number) => {
                const canon = this.canonicalCoordinates[name];
                return canon ? [canon.lat, canon.lng] : [fallbackLat, fallbackLng];
            };

            // U-Bahn lines
            Object.keys(ubahnColors).forEach(name => {
                // Returns [lat, lng][]. It doesn't give names.
                // We need the station objects to match names.
                // Let's use getStationsForLine from data/ubahn.ts and sort them.
                // Re-implementing route building with coordinate lookup:

                const lineStations = ubahnStations.filter(s => s.lines.includes(name));
                const lowerName = name.toLowerCase();
                const ordered = lineStations.sort((a, b) => {
                    const idA = parseInt(a.id?.split('-')[1] || '0');
                    const idB = parseInt(b.id?.split('-')[1] || '0');
                    return idA - idB;
                });

                if (ordered.length >= 2) {
                    this.lineRoutes[name] = ordered.map(s => {
                        const [lat, lng] = getCoords(s.name, s.lat, s.lng);
                        const { x, y } = latLngToScene(lat, lng);
                        return new THREE.Vector3(x, y, 0);
                    });
                }
            });

            // RE1
            const re1Ordered = re1Stations; // Already ordered list in re1Stations
            if (re1Ordered.length >= 2) {
                this.lineRoutes['RE1'] = re1Ordered.map(s => {
                    const [lat, lng] = getCoords(s.name, s.lat, s.lng);
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

        // Fetch trains directly from BVG API (client-side for per-client rate limiting)
        async fetchTrains() {
            const { useApiStore } = await import('./apiStore');
            const apiStore = useApiStore();

            // Use priority based on last hovered line
            const priority = apiStore.lastHoveredLine ? 'normal' : 'low';

            const result = await apiStore.executeRequest('trains', async () => {
                // Bounding box covering full RE1: Magdeburg to Frankfurt (Oder)
                const north = 52.65;
                const south = 52.05;
                const west = 11.50;
                const east = 14.60;

                const url = `https://v6.bvg.transport.rest/radar?north=${north}&west=${west}&south=${south}&east=${east}&results=512&duration=30&frames=1&_t=${Date.now()}`;
                const response = await fetch(url);

                if (!response.ok) {
                    throw new Error(`BVG API error: ${response.status}`);
                }

                const data = await response.json();

                // Filter for supported products
                const trains = data.movements
                    .filter((m: any) =>
                        ['subway', 'suburban', 'regional', 'tram'].includes(m.line?.product) &&
                        allLineColors[m.line?.name] && // Only lines we have colors for (controlled list)
                        m.location?.latitude &&
                        m.location?.longitude
                    )
                    .map((m: any) => {
                        const nextStop = m.nextStopovers?.[0];
                        const delayBytes = nextStop?.departureDelay || 0;

                        // Calculate time to next station
                        let timeStr = '';
                        if (nextStop?.arrival) {
                            const arrivalTime = new Date(nextStop.arrival).getTime();
                            const now = Date.now();
                            const diffMins = Math.max(0, Math.round((arrivalTime - now) / 60000));
                            timeStr = `${diffMins} min`;
                        } else {
                            timeStr = '?';
                        }

                        return {
                            tripId: m.tripId,
                            latitude: m.location.latitude,
                            longitude: m.location.longitude,
                            direction: m.direction,
                            lineName: m.line.name,
                            product: m.line.product,
                            delay: delayBytes,
                            nextStation: nextStop?.stop?.name,
                            nextStationTime: timeStr,
                            platform: nextStop?.arrivalPlatform || nextStop?.departurePlatform
                        };
                    });

                return { trains };
            }, priority);

            if (result?.trains && Array.isArray(result.trains)) {
                this.trains = result.trains.map((t: any) => ({
                    tripId: t.tripId,
                    lat: t.latitude,
                    lng: t.longitude,
                    lineName: t.lineName,
                    direction: t.direction,
                    delay: t.delay,
                    nextStation: t.nextStation,
                    nextStationTime: t.nextStationTime,
                    platform: t.platform
                }));
                this.trainCount = this.visibleTrains.length;
            }

            this.loading = false;
        },

        // Fetch departures directly from BVG API (client-side for per-client rate limiting)
        async fetchDepartures(stationName: string, isHovered: boolean = false) {
            const cached = this.departuresCache.get(stationName);
            if (cached) return cached;

            const { useApiStore } = await import('./apiStore');
            const apiStore = useApiStore();

            // High priority if this is the hovered station
            const priority = isHovered || apiStore.lastHoveredStation === stationName ? 'high' : 'normal';

            const result = await apiStore.executeRequest('departures', async () => {
                // Search for the station
                const searchUrl = `https://v6.bvg.transport.rest/locations?query=${encodeURIComponent(stationName)}&results=5&addresses=false&poi=false&_t=${Date.now()}`;
                const searchResponse = await fetch(searchUrl);
                const searchData = await searchResponse.json();

                if (!searchData || !Array.isArray(searchData) || searchData.length === 0) {
                    console.warn('No station found for:', stationName);
                    return { departures: [], stationId: null, grouped: {} };
                }

                // Find best match (prefer stops over addresses)
                const station = searchData.find((s: any) => s.type === 'stop') || searchData[0];

                if (!station || !station.id) {
                    console.warn('Station found but no ID:', station);
                    return { departures: [], stationId: null, grouped: {} };
                }

                const stationId = station.id;

                // Fetch departures
                const departuresUrl = `https://v6.bvg.transport.rest/stops/${stationId}/departures?duration=60&results=30&_t=${Date.now()}`;
                const depsResponse = await fetch(departuresUrl);
                const depsData = await depsResponse.json();

                const allDepartures = (depsData.departures || []).map((d: any) => {
                    const product = d.line?.product;
                    let category = 'other';

                    if (product === 'subway' || d.line?.name?.startsWith('U')) {
                        category = 'U-Bahn';
                    } else if (product === 'suburban' || d.line?.name?.startsWith('S')) {
                        category = 'S-Bahn';
                    } else if (product === 'regional' || d.line?.name?.startsWith('RE') || d.line?.name?.startsWith('RB')) {
                        category = 'Regional';
                    } else if (product === 'tram') {
                        category = 'Tram';
                    } else if (product === 'bus') {
                        category = 'Bus';
                    }

                    return {
                        line: d.line?.name || 'Unknown',
                        destination: d.destination?.name || d.direction || 'Unknown',
                        plannedTime: d.plannedWhen,
                        actualTime: d.when,
                        delay: d.delay || 0,
                        platform: d.platform || d.plannedPlatform || null,
                        product: d.line?.product,
                        category
                    };
                });

                // Group by category with priority order: U-Bahn, Regional, S-Bahn, Tram, Bus
                const grouped: Record<string, any[]> = {};
                const categoryOrder = ['U-Bahn', 'Regional', 'S-Bahn', 'Tram', 'Bus', 'other'];

                categoryOrder.forEach(cat => {
                    const deps = allDepartures
                        .filter((d: any) => d.category === cat)
                        .slice(0, 5); // Max 5 per category

                    if (deps.length > 0) {
                        grouped[cat] = deps;
                    }
                });

                return {
                    stationId,
                    stationName: station.name,
                    departures: allDepartures.slice(0, 15),
                    grouped
                };
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
