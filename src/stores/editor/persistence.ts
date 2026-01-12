// Persistence (localStorage & file import/export)
import { type Ref } from 'vue';
import type { EditorStation, EditorTrack, TextNode, MapData } from './types';
import { STORAGE_KEY } from './types';

export function usePersistence(
    stations: Ref<EditorStation[]>,
    tracks: Ref<EditorTrack[]>,
    textNodes: Ref<TextNode[]>,
    selectedStationId: Ref<string | null>,
    selectedTrackId: Ref<string | null>,
    selectedTextNodeId: Ref<string | null>,
    multiConnectStations: Ref<string[]>
) {
    function saveToLocalStorage(): void {
        const data: MapData = {
            version: '1.0',
            stations: stations.value,
            tracks: tracks.value,
            textNodes: textNodes.value,
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
                        labelOffsetX: s.labelOffsetX ?? 0,
                        labelOffsetY: s.labelOffsetY ?? -15,
                        labelFontSize: s.labelFontSize ?? 8,
                    };
                });
                // Migrate old tracks: ensure waypoints, stationOffsets, and cornerRadius exist
                tracks.value = (data.tracks || []).map((t: any) => ({
                    ...t,
                    waypoints: t.waypoints || [],
                    // Migrate offset1/offset2 to stationOffsets
                    stationOffsets: t.stationOffsets || {
                        start: t.offset1 ?? 0,
                        end: t.offset2 ?? 0
                    },
                    cornerRadius: t.cornerRadius ?? 5,
                }));
                // Load text nodes
                textNodes.value = data.textNodes || [];
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
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            stations: stations.value,
            tracks: tracks.value,
            textNodes: textNodes.value,
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `map-data-${new Date().toISOString().split('T')[0]}.json`;
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
                        labelOffsetX: s.labelOffsetX ?? 0,
                        labelOffsetY: s.labelOffsetY ?? -15,
                        labelFontSize: s.labelFontSize ?? 8,
                    }));
                    // Migrate old tracks: ensure waypoints, stationOffsets, and cornerRadius exist
                    tracks.value = (data.tracks || []).map((t: any) => ({
                        ...t,
                        waypoints: t.waypoints || [],
                        // Migrate offset1/offset2 to stationOffsets
                        stationOffsets: t.stationOffsets || {
                            start: t.offset1 ?? 0,
                            end: t.offset2 ?? 0
                        },
                        cornerRadius: t.cornerRadius ?? 5,
                    }));
                    // Load text nodes
                    textNodes.value = data.textNodes || [];
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
        textNodes.value = [];
        selectedStationId.value = null;
        selectedTrackId.value = null;
        selectedTextNodeId.value = null;
        multiConnectStations.value = [];
        saveToLocalStorage();
    }

    return {
        saveToLocalStorage,
        loadFromLocalStorage,
        exportToFile,
        importFromFile,
        clearAll,
    };
}
