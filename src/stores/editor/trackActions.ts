// Track Actions
import { type Ref } from 'vue';
import type { EditorStation, EditorTrack } from './types';

export function useTrackActions(
    stations: Ref<EditorStation[]>,
    tracks: Ref<EditorTrack[]>,
    selectedTrackId: Ref<string | null>,
    selectedStationId: Ref<string | null>,
    selectedWaypointId: Ref<string | null>,
    generateId: () => string,
    pushHistory: () => void,
    saveToLocalStorage: () => void
) {
    function addTrack(stationId1: string, stationId2: string, line: string): EditorTrack | null {
        pushHistory();
        // Check if stations exist
        const s1 = stations.value.find(s => s.id === stationId1);
        const s2 = stations.value.find(s => s.id === stationId2);
        if (!s1 || !s2 || stationId1 === stationId2) return null;

        // Check if track with same line already exists between these stations
        const existingTrack = tracks.value.find(
            t => t.line === line && (
                (t.stationIds[0] === stationId1 && t.stationIds[1] === stationId2) ||
                (t.stationIds[0] === stationId2 && t.stationIds[1] === stationId1)
            )
        );
        if (existingTrack) return null;

        const track: EditorTrack = {
            id: generateId(),
            stationIds: [stationId1, stationId2],
            line,
            waypoints: [],
            stationOffsets: {
                start: 0,
                end: 0
            },
            cornerRadius: 5,
        };
        tracks.value.push(track);
        saveToLocalStorage();
        return track;
    }

    function removeTrack(id: string): void {
        pushHistory();
        tracks.value = tracks.value.filter(t => t.id !== id);
        if (selectedTrackId.value === id) {
            selectedTrackId.value = null;
            selectedWaypointId.value = null;
        }
        saveToLocalStorage();
    }

    function updateTrackOffset(trackId: string, endpoint: 1 | 2, offset: number, lateralOffset?: number): void {
        pushHistory();
        const track = tracks.value.find(t => t.id === trackId);
        if (track) {
            if (endpoint === 1) {
                track.stationOffsets.start = offset;
                if (lateralOffset !== undefined) track.stationOffsets.startLateral = lateralOffset;
            } else {
                track.stationOffsets.end = offset;
                if (lateralOffset !== undefined) track.stationOffsets.endLateral = lateralOffset;
            }
            saveToLocalStorage();
        }
    }

    function updateTrackCornerRadius(trackId: string, radius: number): void {
        pushHistory();
        const track = tracks.value.find(t => t.id === trackId);
        if (track) {
            track.cornerRadius = radius;
            saveToLocalStorage();
        }
    }

    function selectTrack(id: string | null): void {
        selectedTrackId.value = id;
        selectedStationId.value = null;
    }

    return {
        addTrack,
        removeTrack,
        updateTrackOffset,
        updateTrackCornerRadius,
        selectTrack,
    };
}
