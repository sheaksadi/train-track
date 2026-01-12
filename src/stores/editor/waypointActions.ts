// Waypoint Actions
import { type Ref } from 'vue';
import type { EditorTrack, Waypoint } from './types';

export function useWaypointActions(
    tracks: Ref<EditorTrack[]>,
    selectedWaypointId: Ref<string | null>,
    selectedStationId: Ref<string | null>,
    generateId: () => string,
    pushHistory: () => void,
    saveToLocalStorage: () => void
) {
    function addWaypoint(trackId: string, x: number, y: number, insertIndex?: number): Waypoint | null {
        pushHistory();
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
        pushHistory();
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
        pushHistory();
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

    return {
        addWaypoint,
        updateWaypoint,
        removeWaypoint,
        selectWaypoint,
    };
}
