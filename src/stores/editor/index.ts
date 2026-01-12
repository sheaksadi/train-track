// Editor Store - Main Entry Point
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

// Types
import type { EditorStation, EditorTrack, TextNode, ToolType } from './types';
export type { EditorStation, EditorTrack, TextNode, Waypoint, MapData, ToolType } from './types';

// Action modules
import { useHistory } from './history';
import { useStationActions } from './stationActions';
import { useTrackActions } from './trackActions';
import { useWaypointActions } from './waypointActions';
import { useTextNodeActions } from './textNodeActions';
import { usePersistence } from './persistence';

export const useEditorStore = defineStore('editor', () => {
    // Core State
    const stations = ref<EditorStation[]>([]);
    const tracks = ref<EditorTrack[]>([]);
    const textNodes = ref<TextNode[]>([]);

    // UI State
    const selectedTool = ref<ToolType>('select');
    const selectedStationId = ref<string | null>(null);
    const selectedTrackId = ref<string | null>(null);
    const selectedTextNodeId = ref<string | null>(null);
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

    const selectedTextNode = computed(() =>
        textNodes.value.find(t => t.id === selectedTextNodeId.value) || null
    );

    // Generate unique ID
    function generateId(): string {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    // Initialize persistence first (needed by history)
    const persistence = usePersistence(
        stations,
        tracks,
        textNodes,
        selectedStationId,
        selectedTrackId,
        selectedTextNodeId,
        multiConnectStations
    );

    // Initialize history
    const history = useHistory(
        stations,
        tracks,
        textNodes,
        persistence.saveToLocalStorage
    );

    // Initialize action modules
    const stationActions = useStationActions(
        stations,
        tracks,
        selectedStationId,
        selectedTrackId,
        currentLine,
        generateId,
        history.pushHistory,
        persistence.saveToLocalStorage
    );

    const trackActions = useTrackActions(
        stations,
        tracks,
        selectedTrackId,
        selectedStationId,
        selectedWaypointId,
        generateId,
        history.pushHistory,
        persistence.saveToLocalStorage
    );

    const waypointActions = useWaypointActions(
        tracks,
        selectedWaypointId,
        selectedStationId,
        generateId,
        history.pushHistory,
        persistence.saveToLocalStorage
    );

    const textNodeActions = useTextNodeActions(
        textNodes,
        selectedTextNodeId,
        selectedStationId,
        selectedTrackId,
        generateId,
        history.pushHistory,
        persistence.saveToLocalStorage
    );

    // Selection
    function clearSelection(): void {
        selectedStationId.value = null;
        selectedTrackId.value = null;
        selectedTextNodeId.value = null;
        multiConnectStations.value = [];
    }

    // Multi-connect
    function addToMultiConnect(stationId: string): void {
        if (multiConnectStations.value.length > 0) {
            const lastStation = multiConnectStations.value[multiConnectStations.value.length - 1];
            trackActions.addTrack(lastStation, stationId, currentLine.value);
        }
        multiConnectStations.value.push(stationId);
    }

    function finishMultiConnect(): void {
        multiConnectStations.value = [];
    }

    // Initialize from localStorage
    persistence.loadFromLocalStorage();

    return {
        // State
        stations,
        tracks,
        textNodes,
        selectedTool,
        selectedStationId,
        selectedTrackId,
        selectedTextNodeId,
        selectedWaypointId,
        mapOpacity,
        zoom,
        pan,
        multiConnectStations,
        currentLine,

        // Computed
        selectedStation,
        selectedTrack,
        selectedTextNode,

        // History
        undo: history.undo,
        redo: history.redo,
        pushHistory: history.pushHistory,

        // Station Actions
        addStation: stationActions.addStation,
        removeStation: stationActions.removeStation,
        updateStation: stationActions.updateStation,
        selectStation: stationActions.selectStation,

        // Track Actions
        addTrack: trackActions.addTrack,
        removeTrack: trackActions.removeTrack,
        updateTrackOffset: trackActions.updateTrackOffset,
        updateTrackCornerRadius: trackActions.updateTrackCornerRadius,
        selectTrack: trackActions.selectTrack,

        // Waypoint Actions
        addWaypoint: waypointActions.addWaypoint,
        updateWaypoint: waypointActions.updateWaypoint,
        removeWaypoint: waypointActions.removeWaypoint,
        selectWaypoint: waypointActions.selectWaypoint,

        // Text Node Actions
        addTextNode: textNodeActions.addTextNode,
        removeTextNode: textNodeActions.removeTextNode,
        updateTextNode: textNodeActions.updateTextNode,
        selectTextNode: textNodeActions.selectTextNode,

        // Selection
        clearSelection,

        // Multi-connect
        addToMultiConnect,
        finishMultiConnect,

        // Persistence
        saveToLocalStorage: persistence.saveToLocalStorage,
        loadFromLocalStorage: persistence.loadFromLocalStorage,
        exportToFile: persistence.exportToFile,
        importFromFile: persistence.importFromFile,
        clearAll: persistence.clearAll,
    };
});
