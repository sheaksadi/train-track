import manualData from './manual_stations.json';
import { ubahnStations, ubahnColors, ubahnLines } from './ubahn';
import { sbahnStations, sbahnColors, sbahnLines } from './sbahn';

export interface BvgStation {
    id: string;
    name: string;
    lat: number;
    lng: number;
    lines?: string[];
}

const rawData = manualData as any;
const data = rawData.default || rawData;

const { stationsByLine, stationDetails } = data as {
    stationsByLine: Record<string, string[]>,
    stationDetails: Record<string, BvgStation>
};

console.log('[stationNames] Loading manual data...', {
    hasDefault: !!rawData.default,
    keys: Object.keys(data || {}),
    stationCount: Object.keys(stationDetails || {}).length
});

// Map for fast lookup
const stationMap = new Map<string, BvgStation>(Object.entries(stationDetails || {}));

// Get all unique station names from the manual list
export const allStationNames: string[] = Object.keys(stationDetails || {}).sort();

export const allBvgStations: BvgStation[] = Object.values(stationDetails || {});

export function getStationInfo(name: string): BvgStation | undefined {
    return stationMap.get(name);
}

// Helper to get stations for a specific line
export function getStationsForLine(line: string): string[] {
    if (ubahnLines[line]) return ubahnLines[line];
    if (sbahnLines[line]) return sbahnLines[line];
    return (stationsByLine && stationsByLine[line]) || [];
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
