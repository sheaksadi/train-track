import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';

export interface EditorStation {
    id: string;
    name: string;
    x: number;
    y: number;
    lines: string[];
    rotation: number;  // Rotation in degrees
    length: number;    // Length of the pill shape
}

export interface Waypoint {
    id: string;
    x: number;
    y: number;
}

export interface EditorTrack {
    id: string;
    stationIds: [string, string];
    line: string;
    waypoints: Waypoint[];  // Control points for bending the track
}

export interface MapData {
    version: string;
    stations: EditorStation[];
    tracks: EditorTrack[];
}

const STORAGE_KEY = 'train-track-editor';

export const useEditorStore = defineStore('editor', () => {
    // State
    const stations = ref<EditorStation[]>([]);
    const tracks = ref<EditorTrack[]>([]);
    const selectedTool = ref<'select' | 'move' | 'station' | 'track' | 'multiConnect' | 'bend'>('select');
    const selectedStationId = ref<string | null>(null);
    const selectedTrackId = ref<string | null>(null);
    const selectedWaypointId = ref<string | null>(null);
    const mapOpacity = ref(50);
    const zoom = ref(1);
    const pan = ref({ x: 0, y: 0 });

    // Multi-connect mode state
    const multiConnectStations = ref<string[]>([]);
    const currentLine = ref('U1');

    // Computed
    const selectedStation = computed(() =>
        stations.value.find(s => s.id === selectedStationId.value) || null
    );

    const selectedTrack = computed(() =>
        tracks.value.find(t => t.id === selectedTrackId.value) || null
    );

    // Generate unique ID
    function generateId(): string {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    // Actions
    function addStation(x: number, y: number, name: string = 'New Station'): EditorStation {
        const station: EditorStation = {
            id: generateId(),
            name,
            x,
            y,
            lines: [currentLine.value],
            rotation: 0,
            length: 0,  // 0 = circle, > 10 = pill shape
        };
        stations.value.push(station);
        saveToLocalStorage();
        return station;
    }

    function removeStation(id: string): void {
        // Remove connected tracks
        tracks.value = tracks.value.filter(
            t => t.stationIds[0] !== id && t.stationIds[1] !== id
        );
        // Remove station
        stations.value = stations.value.filter(s => s.id !== id);
        if (selectedStationId.value === id) {
            selectedStationId.value = null;
        }
        saveToLocalStorage();
    }

    function updateStation(id: string, updates: Partial<Omit<EditorStation, 'id'>>): void {
        const station = stations.value.find(s => s.id === id);
        if (station) {
            Object.assign(station, updates);
            saveToLocalStorage();
        }
    }

    function addTrack(stationId1: string, stationId2: string, line: string): EditorTrack | null {
        // Check if stations exist
        const s1 = stations.value.find(s => s.id === stationId1);
        const s2 = stations.value.find(s => s.id === stationId2);
        if (!s1 || !s2 || stationId1 === stationId2) return null;

        // Check if track already exists
        const existingTrack = tracks.value.find(
            t => (t.stationIds[0] === stationId1 && t.stationIds[1] === stationId2) ||
                (t.stationIds[0] === stationId2 && t.stationIds[1] === stationId1)
        );
        if (existingTrack) return null;

        const track: EditorTrack = {
            id: generateId(),
            stationIds: [stationId1, stationId2],
            line,
            waypoints: [],
        };
        tracks.value.push(track);
        saveToLocalStorage();
        return track;
    }

    function removeTrack(id: string): void {
        tracks.value = tracks.value.filter(t => t.id !== id);
        if (selectedTrackId.value === id) {
            selectedTrackId.value = null;
            selectedWaypointId.value = null;
        }
        saveToLocalStorage();
    }

    function addWaypoint(trackId: string, x: number, y: number, insertIndex?: number): Waypoint | null {
        const track = tracks.value.find(t => t.id === trackId);
        if (!track) return null;

        const waypoint: Waypoint = {
            id: generateId(),
            x,
            y,
        };

        if (insertIndex !== undefined && insertIndex >= 0) {
            track.waypoints.splice(insertIndex, 0, waypoint);
        } else {
            track.waypoints.push(waypoint);
        }

        saveToLocalStorage();
        return waypoint;
    }

    function updateWaypoint(trackId: string, waypointId: string, x: number, y: number): void {
        const track = tracks.value.find(t => t.id === trackId);
        if (!track) return;

        const waypoint = track.waypoints.find(w => w.id === waypointId);
        if (waypoint) {
            waypoint.x = x;
            waypoint.y = y;
            saveToLocalStorage();
        }
    }

    function removeWaypoint(trackId: string, waypointId: string): void {
        const track = tracks.value.find(t => t.id === trackId);
        if (!track) return;

        track.waypoints = track.waypoints.filter(w => w.id !== waypointId);
        if (selectedWaypointId.value === waypointId) {
            selectedWaypointId.value = null;
        }
        saveToLocalStorage();
    }

    function selectWaypoint(waypointId: string | null): void {
        selectedWaypointId.value = waypointId;
        selectedStationId.value = null;
    }

    function selectStation(id: string | null): void {
        selectedStationId.value = id;
        selectedTrackId.value = null;
    }

    function selectTrack(id: string | null): void {
        selectedTrackId.value = id;
        selectedStationId.value = null;
    }

    function clearSelection(): void {
        selectedStationId.value = null;
        selectedTrackId.value = null;
        multiConnectStations.value = [];
    }

    function addToMultiConnect(stationId: string): void {
        if (multiConnectStations.value.length > 0) {
            const lastStation = multiConnectStations.value[multiConnectStations.value.length - 1];
            addTrack(lastStation, stationId, currentLine.value);
        }
        multiConnectStations.value.push(stationId);
    }

    function finishMultiConnect(): void {
        multiConnectStations.value = [];
    }

    // Persistence
    function saveToLocalStorage(): void {
        const data: MapData = {
            version: '1.0',
            stations: stations.value,
            tracks: tracks.value,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }

    function loadFromLocalStorage(): boolean {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const data: MapData = JSON.parse(saved);
                // Migrate old stations: circles for single-line, pills for multi-line
                stations.value = (data.stations || []).map(s => {
                    // If length is 20 (old default) or undefined, recalculate based on line count
                    const needsLengthReset = s.length === undefined || s.length === 20;
                    const newLength = needsLengthReset
                        ? (s.lines && s.lines.length > 1 ? 20 : 0)
                        : s.length;
                    return {
                        ...s,
                        rotation: s.rotation ?? 0,
                        length: newLength,
                    };
                });
                // Migrate old tracks that don't have waypoints
                tracks.value = (data.tracks || []).map(t => ({
                    ...t,
                    waypoints: t.waypoints || [],
                }));
                return true;
            } catch (e) {
                console.error('Failed to load from localStorage:', e);
            }
        }
        return false;
    }

    function exportToFile(): void {
        const data: MapData = {
            version: '1.0',
            stations: stations.value,
            tracks: tracks.value,
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'map-data.json';
        a.click();
        URL.revokeObjectURL(url);
    }

    function importFromFile(file: File): Promise<boolean> {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data: MapData = JSON.parse(e.target?.result as string);
                    // Migrate old stations: circles for single-line, pills for multi-line
                    stations.value = (data.stations || []).map(s => ({
                        ...s,
                        rotation: s.rotation ?? 0,
                        length: s.length !== undefined ? s.length : (s.lines && s.lines.length > 1 ? 20 : 0),
                    }));
                    // Migrate old tracks that don't have waypoints
                    tracks.value = (data.tracks || []).map(t => ({
                        ...t,
                        waypoints: t.waypoints || [],
                    }));
                    saveToLocalStorage();
                    resolve(true);
                } catch (err) {
                    console.error('Failed to parse file:', err);
                    resolve(false);
                }
            };
            reader.onerror = () => resolve(false);
            reader.readAsText(file);
        });
    }

    function clearAll(): void {
        stations.value = [];
        tracks.value = [];
        selectedStationId.value = null;
        selectedTrackId.value = null;
        multiConnectStations.value = [];
        saveToLocalStorage();
    }

    // Initialize from localStorage
    loadFromLocalStorage();

    return {
        // State
        stations,
        tracks,
        selectedTool,
        selectedStationId,
        selectedTrackId,
        selectedWaypointId,
        mapOpacity,
        zoom,
        pan,
        multiConnectStations,
        currentLine,

        // Computed
        selectedStation,
        selectedTrack,

        // Actions
        addStation,
        removeStation,
        updateStation,
        addTrack,
        removeTrack,
        addWaypoint,
        updateWaypoint,
        removeWaypoint,
        selectStation,
        selectTrack,
        selectWaypoint,
        clearSelection,
        addToMultiConnect,
        finishMultiConnect,
        saveToLocalStorage,
        loadFromLocalStorage,
        exportToFile,
        importFromFile,
        clearAll,
    };
});
