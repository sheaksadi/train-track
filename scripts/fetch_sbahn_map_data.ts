/**
 * Fetch Transit Map Data from S-Bahn Berlin API
 * 
 * This script extracts comprehensive transit data from the official S-Bahn Berlin
 * interactive map API, including:
 * - S-Bahn lines (S1-S9, S25, S26, S41, S42, S45, S46, S47, S75, S85)
 * - U-Bahn lines (U1-U9, U55)
 * - Regional trains (RE, RB)
 * - GeoJSON line geometries with coordinates
 * - Line colors and metadata
 * 
 * API Source: https://map.sbahn.berlin
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const BASE_URL = 'https://map.sbahn.berlin/api/v1';
const DELAY_MS = 300;
const USER_AGENT = 'TrainTrackApp/1.0 (transit-data-fetcher)';

// Types
interface LineData {
    name: string;
    product: string;
    color?: string;
    segments: GeoSegment[];
}

interface GeoSegment {
    id: string;
    name: string;
    coordinates: number[][][];
}

interface StopData {
    name: string;
    id: string;
    lat: number;
    lng: number;
    lines?: string[];
}

interface TransitMapData {
    lines: Record<string, LineData>;
    stops: Record<string, StopData>;
    geojson: {
        type: 'FeatureCollection';
        features: any[];
    };
    metadata: {
        fetchedAt: string;
        source: string;
        lineCount: number;
        stopCount: number;
    };
}

// Line colors from S-Bahn Berlin official colors
const LINE_COLORS: Record<string, string> = {
    // S-Bahn
    'S1': '#DE4DA4',
    'S2': '#005F27',
    'S25': '#005F27',
    'S26': '#005F27',
    'S3': '#0A4C99',
    'S41': '#A23B1E',
    'S42': '#C66D38',
    'S45': '#C38737',
    'S46': '#C38737',
    'S47': '#C38737',
    'S5': '#FF5900',
    'S7': '#6F4E9C',
    'S75': '#6F4E9C',
    'S8': '#55A822',
    'S85': '#55A822',
    'S9': '#8B1C52',
    // U-Bahn
    'U1': '#7DAD4C',
    'U2': '#DA421E',
    'U3': '#007A5B',
    'U4': '#F0D722',
    'U5': '#7E5330',
    'U55': '#7E5330',
    'U6': '#8C6DAB',
    'U7': '#528DBA',
    'U8': '#224F86',
    'U9': '#F3791D',
};

// S-Bahn lines to fetch individually (for detailed segment data)
const SBAHN_LINES = [
    'S1', 'S2', 'S25', 'S26', 'S3', 'S41', 'S42',
    'S45', 'S46', 'S47', 'S5', 'S7', 'S75', 'S8', 'S85', 'S9'
];

// U-Bahn lines
const UBAHN_LINES = ['U1', 'U2', 'U3', 'U4', 'U5', 'U55', 'U6', 'U7', 'U8', 'U9'];

// Utils
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithRetry(url: string, retries = 3): Promise<any> {
    for (let i = 0; i < retries; i++) {
        try {
            const res = await fetch(url, {
                headers: { 'User-Agent': USER_AGENT }
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            return await res.json();
        } catch (e) {
            console.error(`  ⚠ Fetch error (attempt ${i + 1}/${retries}): ${(e as Error).message}`);
            if (i < retries - 1) await sleep(1000 * (i + 1));
        }
    }
    return null;
}

/**
 * Fetch detailed line data from line-specific endpoint
 */
async function fetchLineData(lineName: string): Promise<LineData | null> {
    console.log(`  Fetching ${lineName}...`);
    const url = `${BASE_URL}/maps/sb_slnp/lines/${lineName}`;
    const data = await fetchWithRetry(url);

    if (!data?.data?.layer?.features) {
        console.warn(`  ⚠ No data for ${lineName}`);
        return null;
    }

    const layer = data.data.layer;
    const segments: GeoSegment[] = layer.features.map((f: any) => ({
        id: f.id,
        name: f.properties?.name || '',
        coordinates: f.geometry?.coordinates || []
    }));

    return {
        name: lineName,
        product: lineName.startsWith('S') ? 'suburban' :
            lineName.startsWith('U') ? 'subway' :
                lineName.startsWith('RE') ? 'regional' : 'regional',
        color: data.data.styles?.color || LINE_COLORS[lineName] || '#888888',
        segments
    };
}

/**
 * Fetch bulk transit layer data (WFS layer 18)
 * Contains all lines including U-Bahn and Regional
 */
async function fetchBulkTransitData(): Promise<any[]> {
    console.log('Fetching bulk transit data (WFS layer 18)...');
    const url = `${BASE_URL}/wfs-layers/18/features?limit=1000`;
    const data = await fetchWithRetry(url);

    if (!data?.data?.features) {
        console.warn('⚠ No bulk data available');
        return [];
    }

    return data.data.features;
}

/**
 * Parse bulk features to extract line data
 */
function parseBulkFeatures(features: any[]): Map<string, LineData> {
    const lines = new Map<string, LineData>();

    for (const feature of features) {
        const props = feature.properties || {};
        const lineName = props.name || props.title || '';
        const product = props.produkt || '';

        // Skip bus lines and unnamed features
        if (product === 'bus' || !lineName) continue;

        // Handle multi-line entries (e.g., "S8 · S85")
        const lineNames = lineName.split(' · ').map((n: string) => n.trim());

        for (const name of lineNames) {
            // Skip if not a transit line we care about
            if (!name.match(/^(S\d+|U\d+|RE\d*|RB\d*|FEX)/)) continue;

            if (!lines.has(name)) {
                lines.set(name, {
                    name,
                    product: name.startsWith('S') ? 'suburban' :
                        name.startsWith('U') ? 'subway' :
                            'regional',
                    color: LINE_COLORS[name],
                    segments: []
                });
            }

            const line = lines.get(name)!;
            if (feature.geometry?.coordinates) {
                line.segments.push({
                    id: feature.id || `${name}-${line.segments.length}`,
                    name: '',
                    coordinates: feature.geometry.coordinates
                });
            }
        }
    }

    return lines;
}

/**
 * Fetch stop/station data
 */
async function fetchStopData(): Promise<Record<string, StopData>> {
    console.log('Fetching stop data...');
    const url = `${BASE_URL}/wfs-layers/19/features?limit=500`;
    const data = await fetchWithRetry(url);

    const stops: Record<string, StopData> = {};

    if (!data?.data?.features) {
        console.warn('⚠ No stop data available');
        return stops;
    }

    for (const feature of data.data.features) {
        const props = feature.properties || {};
        const coords = feature.geometry?.coordinates;

        if (!props.name || !coords) continue;

        const name = props.name;
        stops[name] = {
            name,
            id: props.uid || props.id || '',
            lat: coords[1],
            lng: coords[0],
            lines: props.lines ? props.lines.split(',').map((l: string) => l.trim()) : undefined
        };
    }

    return stops;
}

/**
 * Main function to fetch and compile all transit data
 */
async function main() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  S-Bahn Berlin Transit Map Data Fetcher');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log();

    const result: TransitMapData = {
        lines: {},
        stops: {},
        geojson: { type: 'FeatureCollection', features: [] },
        metadata: {
            fetchedAt: new Date().toISOString(),
            source: 'https://map.sbahn.berlin',
            lineCount: 0,
            stopCount: 0
        }
    };

    // 1. Fetch bulk data first (contains all lines)
    const bulkFeatures = await fetchBulkTransitData();
    const bulkLines = parseBulkFeatures(bulkFeatures);
    console.log(`  Found ${bulkLines.size} lines in bulk data`);

    // Add bulk data to result
    for (const [name, line] of bulkLines) {
        result.lines[name] = line;
    }

    await sleep(DELAY_MS);

    // 2. Fetch detailed S-Bahn line data (better segment info)
    console.log('\nFetching detailed S-Bahn line data...');
    for (const lineName of SBAHN_LINES) {
        const lineData = await fetchLineData(lineName);
        if (lineData) {
            // Merge with existing or add new
            if (result.lines[lineName]) {
                result.lines[lineName].segments = lineData.segments;
                result.lines[lineName].color = lineData.color;
            } else {
                result.lines[lineName] = lineData;
            }
        }
        await sleep(DELAY_MS);
    }

    // 3. Fetch stop data
    console.log('\nFetching stop data...');
    result.stops = await fetchStopData();
    await sleep(DELAY_MS);

    // 4. Build GeoJSON FeatureCollection
    console.log('\nBuilding GeoJSON output...');
    for (const [lineName, line] of Object.entries(result.lines)) {
        for (const segment of line.segments) {
            result.geojson.features.push({
                type: 'Feature',
                properties: {
                    line: lineName,
                    product: line.product,
                    color: line.color,
                    segmentId: segment.id,
                    segmentName: segment.name
                },
                geometry: {
                    type: 'MultiLineString',
                    coordinates: segment.coordinates
                }
            });
        }
    }

    // Update metadata
    result.metadata.lineCount = Object.keys(result.lines).length;
    result.metadata.stopCount = Object.keys(result.stops).length;

    // 5. Save outputs
    const outputDir = path.resolve(__dirname, '../public/data');

    // Full data JSON
    const fullOutputPath = path.join(outputDir, 'sbahn_map_data.json');
    fs.writeFileSync(fullOutputPath, JSON.stringify(result, null, 2));
    console.log(`\n✓ Saved full data to ${fullOutputPath}`);

    // GeoJSON only (for map rendering)
    const geojsonPath = path.join(outputDir, 'transit_lines.geojson');
    fs.writeFileSync(geojsonPath, JSON.stringify(result.geojson, null, 2));
    console.log(`✓ Saved GeoJSON to ${geojsonPath}`);

    // Summary
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  Summary');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`  Lines fetched: ${result.metadata.lineCount}`);
    console.log(`  Stops fetched: ${result.metadata.stopCount}`);
    console.log(`  GeoJSON features: ${result.geojson.features.length}`);
    console.log();

    // List lines by product
    const byProduct: Record<string, string[]> = {};
    for (const [name, line] of Object.entries(result.lines)) {
        if (!byProduct[line.product]) byProduct[line.product] = [];
        byProduct[line.product].push(name);
    }

    for (const [product, names] of Object.entries(byProduct)) {
        console.log(`  ${product}: ${names.sort().join(', ')}`);
    }

    console.log('\n✓ Done!');
}

main().catch(console.error);
