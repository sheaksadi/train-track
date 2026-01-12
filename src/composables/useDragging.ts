// Dragging State and Handlers
import { ref } from 'vue';
import type { EditorStation, EditorTrack, TextNode, Waypoint } from '@/stores/editor/types';

export interface DraggingLabel {
    stationId: string;
    startX: number;
    startY: number;
    startOffsetX: number;
    startOffsetY: number;
}

export interface ResizingLabel {
    stationId: string;
    startFontSize: number;
    startX: number;
    startY: number;
    startWidth?: number;
    startHeight?: number;
}

export interface ResizingLabelBox {
    stationId: string;
    startWidth: number;
    startHeight: number;
    startX: number;
    startY: number;
    edge: 'r' | 'b';
}

export interface DraggingTextNode {
    id: string;
    startX: number;
    startY: number;
    startNodeX: number;
    startNodeY: number;
}

export interface ResizingTextBox {
    id: string;
    startWidth: number;
    startHeight: number;
    startX: number;
    startY: number;
    edge: string;
}

export interface DraggingEndpoint {
    trackId: string;
    endpoint: 1 | 2;
    stationId: string;
}

export interface DraggingWaypoint {
    trackId: string;
    index: number;
    waypointId?: string;
}

export function useDragging() {
    // Dragging state refs
    const draggingStationId = ref<string | null>(null);
    const draggingWaypoint = ref<DraggingWaypoint | null>(null);
    const draggingEndpoint = ref<DraggingEndpoint | null>(null);
    const draggingLabel = ref<DraggingLabel | null>(null);
    const resizingLabel = ref<ResizingLabel | null>(null);
    const resizingLabelBox = ref<ResizingLabelBox | null>(null);
    const draggingTextNode = ref<DraggingTextNode | null>(null);
    const resizingTextNode = ref<{ id: string; startX: number; startFontSize: number } | null>(null);
    const resizingTextBox = ref<ResizingTextBox | null>(null);

    function clearAllDragging() {
        draggingStationId.value = null;
        draggingWaypoint.value = null;
        draggingEndpoint.value = null;
        draggingLabel.value = null;
        resizingLabel.value = null;
        resizingLabelBox.value = null;
        draggingTextNode.value = null;
        resizingTextNode.value = null;
        resizingTextBox.value = null;
    }

    function isDragging(): boolean {
        return !!(
            draggingStationId.value ||
            draggingWaypoint.value ||
            draggingEndpoint.value ||
            draggingLabel.value ||
            resizingLabel.value ||
            resizingLabelBox.value ||
            draggingTextNode.value ||
            resizingTextNode.value ||
            resizingTextBox.value
        );
    }

    // Station dragging
    function startStationDrag(stationId: string) {
        draggingStationId.value = stationId;
    }

    // Waypoint dragging
    function startWaypointDrag(trackId: string, waypoint: Waypoint, index: number) {
        draggingWaypoint.value = { trackId, index, waypointId: waypoint.id };
    }

    // Endpoint dragging
    function startEndpointDrag(track: EditorTrack, endpoint: 1 | 2) {
        const stationId = track.stationIds[endpoint - 1];
        draggingEndpoint.value = { trackId: track.id, endpoint, stationId };
    }

    // Label dragging
    function startLabelDrag(station: EditorStation, clientX: number, clientY: number) {
        draggingLabel.value = {
            stationId: station.id,
            startX: clientX,
            startY: clientY,
            startOffsetX: station.labelOffsetX || 0,
            startOffsetY: station.labelOffsetY ?? -15,
        };
    }

    // Label resizing (font size)
    function startLabelResize(station: EditorStation, clientX: number, clientY: number) {
        resizingLabel.value = {
            stationId: station.id,
            startX: clientX,
            startY: clientY,
            startFontSize: station.labelFontSize || 8,
            startWidth: station.labelWidth,
            startHeight: station.labelHeight,
        };
    }

    // Label box resizing (width/height)
    function startLabelBoxResize(station: EditorStation, clientX: number, clientY: number, edge: 'r' | 'b', measureTextWidth: (text: string, fontSize: number) => number) {
        resizingLabelBox.value = {
            stationId: station.id,
            edge,
            startX: clientX,
            startY: clientY,
            startWidth: station.labelWidth || measureTextWidth(station.name, station.labelFontSize || 8) + 8,
            startHeight: station.labelHeight || (station.labelFontSize || 8) * 1.4,
        };
    }

    // Text node dragging
    function startTextNodeDrag(textNode: TextNode, clientX: number, clientY: number, posX: number, posY: number) {
        draggingTextNode.value = {
            id: textNode.id,
            startX: clientX,
            startY: clientY,
            startNodeX: posX,
            startNodeY: posY,
        };
    }

    // Text node resizing
    function startTextNodeResize(textNode: TextNode, clientX: number) {
        resizingTextNode.value = {
            id: textNode.id,
            startX: clientX,
            startFontSize: textNode.fontSize,
        };
    }

    // Text box resizing
    function startTextBoxResize(textNode: TextNode, clientX: number, clientY: number, edge: string) {
        resizingTextBox.value = {
            id: textNode.id,
            edge,
            startX: clientX,
            startY: clientY,
            startWidth: textNode.width || 80,
            startHeight: textNode.height || 24,
        };
    }

    return {
        // State
        draggingStationId,
        draggingWaypoint,
        draggingEndpoint,
        draggingLabel,
        resizingLabel,
        resizingLabelBox,
        draggingTextNode,
        resizingTextNode,
        resizingTextBox,

        // Methods
        clearAllDragging,
        isDragging,
        startStationDrag,
        startWaypointDrag,
        startEndpointDrag,
        startLabelDrag,
        startLabelResize,
        startLabelBoxResize,
        startTextNodeDrag,
        startTextNodeResize,
        startTextBoxResize,
    };
}
