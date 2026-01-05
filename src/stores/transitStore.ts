
// Transit Data Store - Lines, Stations, Trains
import { defineStore } from 'pinia';
import * as THREE from 'three';
import { ubahnColors, ubahnStations } from '~/data/ubahn';
import { regionalColors, re1Stations } from '~/data/regional';
import { sbahnColors } from '~/data/sbahn';
import { tramColors, magdeburgTramColors } from '~/data/tram';

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
export const allLineColors: Record<string, string> = { ...ubahnColors, ...regionalColors, ...sbahnColors, ...tramColors, ...magdeburgTramColors };

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

export function sceneToLatLng(x: number, y: number): { lat: number; lng: number } {
    const centerLat = 52.52; // Berlin
    const centerLng = 13.40;
    const scale = 1000;
    return {
        lat: y / scale + centerLat,
        lng: x / scale + centerLng
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
        // Initialize from static data for better first paint
        canonicalCoordinates: [...ubahnStations, ...re1Stations].reduce((acc, s) => {
            acc[s.name] = { lat: s.lat, lng: s.lng };
            return acc;
        }, {} as Record<string, { lat: number, lng: number }>),

        // Dynamic stations list derived from topology
        dynamicStations: [] as Station[],

        // Departures cache
        departuresCache: new Map<string, any>(),

        // Station ID cache (permanent for session)
        stationIdCache: new Map<string, string>(),

        // Transit Data (JSON)
        transitData: null as any,
    }),

    getters: {
        allStations(): Station[] {
            // If we have dynamic stations from the fetched topology, use them!
            // This ensures every station on a track is rendered as a dot.
            if (this.dynamicStations.length > 0) {
                return this.dynamicStations;
            }
            // Fallback to static if data hasn't loaded
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
        async loadTransitData() {
            try {
                const res = await fetch('/data/transit_data.json');
                if (!res.ok) throw new Error('Failed to load transit data');
                this.transitData = await res.json();

                // 1. Process Stations and Lines from Topology
                const stationMap: Record<string, Station> = {};

                if (this.transitData.stations) {
                    // Initialize from station dictionary
                    Object.values(this.transitData.stations).forEach((s: any) => {
                        stationMap[s.name] = {
                            name: s.name,
                            id: s.id,
                            lat: s.lat,
                            lng: s.lng,
                            lines: [] // Will populate next
                        };
                    });
                }

                // 2. Populate 'lines' array for each station based on the tracks
                if (this.transitData.lines) {
                    Object.entries(this.transitData.lines).forEach(([lineName, stations]: [string, any]) => {
                        (stations as string[]).forEach(stationName => {
                            if (stationMap[stationName]) {
                                if (!stationMap[stationName].lines.includes(lineName)) {
                                    stationMap[stationName].lines.push(lineName);
                                }
                            }
                        });
                    });
                }

                // 3. Update State
                this.dynamicStations = Object.values(stationMap);

                // 4. Update Canonical Coordinates (for fallback or other lookups)
                const updates: Record<string, { lat: number, lng: number }> = {};
                this.dynamicStations.forEach(s => {
                    updates[s.name] = { lat: s.lat, lng: s.lng };
                });
                this.updateRouteCoordinates(updates);

                // 5. Rebuild routes
                this.buildLineRoutes();
            } catch (e) {
                console.error('Transit data load error:', e);
            }
        },

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

            // 1. TOPOLOGY BASED RENDERING (Node -> Edge)
            // Use lines from transit_data.json which now contains ordered station names
            if (this.transitData?.lines) {
                Object.entries(this.transitData.lines).forEach(([name, stationNames]: [string, any]) => {
                    // stationNames is string[]
                    if (!Array.isArray(stationNames) || stationNames.length < 2) return;

                    const points = stationNames.map((stationName: string) => {
                        let lat, lng;
                        // Priority: 1. Canonical (Live/Updated), 2. Transit Data (Static Fetch)
                        if (this.canonicalCoordinates[stationName]) {
                            ({ lat, lng } = this.canonicalCoordinates[stationName]);
                        } else if (this.transitData.stations && this.transitData.stations[stationName]) {
                            ({ lat, lng } = this.transitData.stations[stationName]);
                        } else {
                            // Try to find in existing static data?
                            const staticU = ubahnStations.find(s => s.name === stationName);
                            if (staticU) {
                                ({ lat, lng } = staticU);
                            } else {
                                const staticR = re1Stations.find(s => s.name === stationName);
                                if (staticR) {
                                    ({ lat, lng } = staticR);
                                } else {
                                    return null;
                                }
                            }
                        }

                        const { x, y } = latLngToScene(lat, lng);
                        return new THREE.Vector3(x, y, 0);
                    }).filter((p): p is THREE.Vector3 => p !== null);

                    if (points.length >= 2) {
                        this.lineRoutes[name] = points;
                    }
                });
            }

            // 2. Fallback for U-Bahn lines not in JSON (or if JSON failed)
            Object.keys(ubahnColors).forEach(name => {
                if (this.lineRoutes[name] && this.lineRoutes[name].length > 2) {
                    return; // Already built from topology
                }

                // Fallback logic
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

            // RE1 Fallback logic
            if (!this.lineRoutes['RE1'] || this.lineRoutes['RE1'].length < 2) {
                const re1Ordered = re1Stations;
                if (re1Ordered.length >= 2) {
                    this.lineRoutes['RE1'] = re1Ordered.map(s => {
                        const [lat, lng] = getCoords(s.name, s.lat, s.lng);
                        const { x, y } = latLngToScene(lat, lng);
                        return new THREE.Vector3(x, y, 0);
                    });
                }
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

        // Fetch trains directly from BVG API
        async fetchTrains(bounds?: { north: number, south: number, west: number, east: number }) {
            const { useApiStore } = await import('./apiStore');
            const apiStore = useApiStore();

            const priority = apiStore.lastHoveredLine ? 'normal' : 'low';

            const result = await apiStore.executeRequest('trains', async () => {
                let north = 52.65;
                let south = 52.05;
                let west = 11.50;
                let east = 14.60;

                if (bounds) {
                    north = bounds.north;
                    south = bounds.south;
                    west = bounds.west;
                    east = bounds.east;

                    const latBuffer = 0.1;
                    const lngBuffer = 0.2;
                    north += latBuffer;
                    south -= latBuffer;
                    east += lngBuffer;
                    west -= lngBuffer;
                }

                const url = `https://v6.bvg.transport.rest/radar?north=${north}&west=${west}&south=${south}&east=${east}&results=512&duration=30&frames=1&_t=${Date.now()}`;
                const response = await fetch(url);

                if (!response.ok) {
                    throw new Error(`BVG API error: ${response.status}`);
                }

                const data = await response.json();

                const trains = data.movements
                    .filter((m: any) =>
                        ['subway', 'suburban', 'regional', 'tram'].includes(m.line?.product) &&
                        allLineColors[m.line?.name] &&
                        m.location?.latitude &&
                        m.location?.longitude
                    )
                    .map((m: any) => {
                        const nextStop = m.nextStopovers?.[0];
                        const delayBytes = nextStop?.departureDelay || 0;

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

        async getStationId(stationName: string, apiStore: any): Promise<string | null> {
            if (this.stationIdCache.has(stationName)) {
                return this.stationIdCache.get(stationName) || null;
            }

            const searchResult = await apiStore.executeRequest('locations', async () => {
                const searchUrl = `https://v6.bvg.transport.rest/locations?query=${encodeURIComponent(stationName)}&results=5&addresses=false&poi=false&_t=${Date.now()}`;
                const searchResponse = await fetch(searchUrl);
                return await searchResponse.json();
            });

            if (!searchResult || !Array.isArray(searchResult) || searchResult.length === 0) {
                console.warn('No station found for:', stationName);
                return null;
            }

            const station = searchResult.find((s: any) => s.type === 'stop') || searchResult[0];

            if (station && station.id) {
                this.stationIdCache.set(stationName, station.id);
                return station.id;
            }

            return null;
        },

        async fetchDepartures(stationName: string, isHovered: boolean = false) {
            const cached = this.departuresCache.get(stationName);
            if (cached) return cached;

            const { useApiStore } = await import('./apiStore');
            const apiStore = useApiStore();

            const priority = isHovered || apiStore.lastHoveredStation === stationName ? 'high' : 'normal';

            const stationId = await this.getStationId(stationName, apiStore);
            if (!stationId) {
                return { grouped: {} };
            }

            const result = await apiStore.executeRequest('departures', async () => {
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

                const grouped: Record<string, any[]> = {};
                const categoryOrder = ['U-Bahn', 'Regional', 'S-Bahn', 'Tram', 'Bus', 'other'];

                categoryOrder.forEach(cat => {
                    const deps = allDepartures
                        .filter((d: any) => d.category === cat)
                        .slice(0, 5);

                    if (deps.length > 0) {
                        grouped[cat] = deps;
                    }
                });

                return {
                    stationId,
                    stationName,
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
