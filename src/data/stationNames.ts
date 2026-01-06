// All available station names for the editor dropdown
// Extracted from ubahn.ts and sbahn.ts

import { ubahnStations, ubahnColors } from './ubahn';
import { sbahnStations, sbahnColors } from './sbahn';

// Get all unique station names
export const allStationNames: string[] = [
    ...new Set([
        ...Object.keys(ubahnStations),
        ...Object.keys(sbahnStations),
    ])
].sort();

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
