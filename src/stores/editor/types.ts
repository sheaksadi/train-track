// Editor Store Types

export interface EditorStation {
    id: string;
    name: string;
    x: number;
    y: number;
    lines: string[];
    rotation: number;  // Rotation in degrees
    length: number;    // Length of the pill shape (horizontal)
    width?: number;    // Width/height of the pill shape (vertical)
    labelOffsetX: number;  // Label X offset from station center
    labelOffsetY: number;  // Label Y offset from station center
    labelFontSize: number; // Label font size (resizable)
    labelBold?: boolean;   // Label bold style
    labelWidth?: number;   // Text box width for multi-line
    labelHeight?: number;  // Text box height
    lat?: number;
    lng?: number;
}

export interface Waypoint {
    id: string;
    x: number;
    y: number;
}

export interface EditorTrack {
    id: string;
    stationIds: [string, string]; // [start, end]
    line: string;
    waypoints: Waypoint[];  // Control points for bending the track
    stationOffsets: {
        start: number; // 0-1 offset along the station perimeter/length
        end: number;
        startLateral?: number; // -1 to 1 offset perpendicular to station length/width
        endLateral?: number;
    };
    cornerRadius?: number;
}

export interface TextNode {
    id: string;
    text: string;
    x: number;
    y: number;
    fontSize: number;
    width?: number;        // Text box width for multi-line
    height?: number;       // Text box height
    stationId?: string;    // Optional: links text to a station
    isBold?: boolean;      // Bold text style
}

export interface MapData {
    version: string;
    createdAt?: string;
    updatedAt?: string;
    stations: EditorStation[];
    tracks: EditorTrack[];
    textNodes?: TextNode[];
}

export const STORAGE_KEY = 'train-track-editor';

export type ToolType = 'select' | 'pan' | 'move' | 'station' | 'track' | 'multiConnect' | 'bend' | 'text';
