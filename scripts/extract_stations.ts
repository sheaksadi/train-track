/**
 * Extract station data from line segment names and coordinates
 * 
 * The sbahn_map_data.json contains segment names like:
 * "S1_zehlendorf-sundgauerstrasse" which indicates stations
 * at the start and end of that segment.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Segment {
    id: string;
    name: string;
    coordinates: number[][][];
}

interface LineData {
    name: string;
    product: string;
    color?: string;
    segments: Segment[];
}

interface TransitData {
    lines: Record<string, LineData>;
}

interface ExtractedStation {
    name: string;
    displayName: string;
    lat: number;
    lng: number;
    lines: string[];
}

// Clean up station name from segment
function cleanStationName(name: string): string {
    return name
        .replace(/_/g, ' ')
        .replace(/-/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

// Parse segment name to extract station names
function parseSegmentName(segmentName: string): { from: string; to: string } | null {
    // Format: "S1_station1-station2" or similar
    const match = segmentName.match(/^([A-Z]+\d+)_(.+)-(.+)$/i);
    if (match) {
        return {
            from: cleanStationName(match[2]),
            to: cleanStationName(match[3])
        };
    }

    // Try just splitting by underscore and hyphen
    const parts = segmentName.split('_');
    if (parts.length >= 2) {
        const stationPart = parts.slice(1).join('_');
        const stations = stationPart.split('-');
        if (stations.length >= 2) {
            return {
                from: cleanStationName(stations[0]),
                to: cleanStationName(stations[stations.length - 1])
            };
        }
    }

    return null;
}

async function main() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  Extract Stations from Line Segments');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Load transit data
    const dataPath = path.resolve(__dirname, '../public/data/sbahn_map_data.json');
    const transitData: TransitData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

    const stations = new Map<string, ExtractedStation>();

    // Process each line
    for (const [lineName, line] of Object.entries(transitData.lines)) {
        console.log(`Processing ${lineName}...`);

        for (const segment of line.segments) {
            if (!segment.name || segment.coordinates.length === 0) continue;

            const parsed = parseSegmentName(segment.name);
            if (!parsed) continue;

            // Get first and last coordinates
            const coords = segment.coordinates[0];
            if (!coords || coords.length < 2) continue;

            const firstCoord = coords[0];
            const lastCoord = coords[coords.length - 1];

            // Add "from" station
            const fromKey = parsed.from.toLowerCase();
            if (!stations.has(fromKey)) {
                stations.set(fromKey, {
                    name: fromKey,
                    displayName: parsed.from,
                    lng: firstCoord[0],
                    lat: firstCoord[1],
                    lines: [lineName]
                });
            } else {
                const s = stations.get(fromKey)!;
                if (!s.lines.includes(lineName)) {
                    s.lines.push(lineName);
                }
            }

            // Add "to" station
            const toKey = parsed.to.toLowerCase();
            if (!stations.has(toKey)) {
                stations.set(toKey, {
                    name: toKey,
                    displayName: parsed.to,
                    lng: lastCoord[0],
                    lat: lastCoord[1],
                    lines: [lineName]
                });
            } else {
                const s = stations.get(toKey)!;
                if (!s.lines.includes(lineName)) {
                    s.lines.push(lineName);
                }
            }
        }
    }

    console.log(`\nExtracted ${stations.size} unique stations`);

    // Convert to array and sort
    const stationsArray = Array.from(stations.values())
        .sort((a, b) => a.displayName.localeCompare(b.displayName));

    // Save stations
    const outputPath = path.resolve(__dirname, '../public/data/extracted_stations.json');
    fs.writeFileSync(outputPath, JSON.stringify({
        stations: stationsArray,
        count: stationsArray.length,
        extractedAt: new Date().toISOString()
    }, null, 2));

    console.log(`✓ Saved to ${outputPath}`);

    // Show sample
    console.log('\nSample stations:');
    stationsArray.slice(0, 10).forEach(s => {
        console.log(`  ${s.displayName}: [${s.lng.toFixed(4)}, ${s.lat.toFixed(4)}] - ${s.lines.join(', ')}`);
    });
}

main().catch(console.error);
