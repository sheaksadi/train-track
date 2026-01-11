import bvgStations from './bvg_stations.json';
import { ubahnStations, ubahnColors } from './ubahn';
import { sbahnStations, sbahnColors } from './sbahn';

export interface BvgStation {
    id: string;
    name: string;
    lat: number;
    lng: number;
    products?: Record<string, boolean>;
}

// Map for fast lookup
const stationMap = new Map<string, BvgStation>();
(bvgStations as any[]).forEach((s: any) => stationMap.set(s.name, s));

// Get all unique station names from the comprehensive BVG list
export const allStationNames: string[] = (bvgStations as any[]).map((s: any) => s.name).sort();

export const allBvgStations: BvgStation[] = bvgStations as unknown as BvgStation[];

export function getStationInfo(name: string): BvgStation | undefined {
    return stationMap.get(name);
}

// All line colors combined
export const allLineColors: Record<string, string> = {
    ...ubahnColors,
    ...sbahnColors,
};

// All available lines
export const allLines: string[] = [
    // U-Bahn
    'U1', 'U2', 'U3', 'U4', 'U5', 'U6', 'U7', 'U8', 'U9',
    // S-Bahn
    'S1', 'S2', 'S25', 'S26', 'S3', 'S41', 'S42', 'S45', 'S46', 'S47',
    'S5', 'S7', 'S75', 'S8', 'S85', 'S9',
];

// Get color for a line, with fallback
export function getLineColor(line: string): string {
    return allLineColors[line] || '#888888';
}
