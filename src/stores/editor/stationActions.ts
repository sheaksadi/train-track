// Station Actions
import { type Ref } from 'vue';
import type { EditorStation, EditorTrack } from './types';
import { getStationInfo } from '@/data/stationNames';

export function useStationActions(
    stations: Ref<EditorStation[]>,
    tracks: Ref<EditorTrack[]>,
    selectedStationId: Ref<string | null>,
    selectedTrackId: Ref<string | null>,
    currentLine: Ref<string>,
    generateId: () => string,
    pushHistory: () => void,
    saveToLocalStorage: () => void
) {
    function addStation(x: number, y: number, name: string = 'New Station'): EditorStation {
        pushHistory();
        const stationInfo = getStationInfo(name);
        const station: EditorStation = {
            id: generateId(),
            name,
            x,
            y,
            lat: stationInfo?.lat,
            lng: stationInfo?.lng,
            lines: [currentLine.value],
            rotation: 0,
            length: 0,  // 0 = circle, > 10 = pill shape
            labelOffsetX: 0,
            labelOffsetY: -15,  // Default: above station
            labelFontSize: 8,
        };
        stations.value.push(station);
        saveToLocalStorage();
        return station;
    }

    function removeStation(id: string): void {
        pushHistory();
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
        pushHistory();
        const station = stations.value.find(s => s.id === id);
        if (station) {
            // If name is changing, look up new coordinates if not explicitly provided
            if (updates.name && updates.name !== station.name && !updates.lat && !updates.lng) {
                const info = getStationInfo(updates.name);
                if (info) {
                    updates.lat = info.lat;
                    updates.lng = info.lng;
                }
            }
            Object.assign(station, updates);
            saveToLocalStorage();
        }
    }

    function selectStation(id: string | null): void {
        selectedStationId.value = id;
        selectedTrackId.value = null;
    }

    return {
        addStation,
        removeStation,
        updateStation,
        selectStation,
    };
}
