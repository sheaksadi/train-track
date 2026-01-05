import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// TYPES
interface TransitData {
    lines: Record<string, string[]>; // Line Name -> List of Station Names (Ordered)
    stations: Record<string, {
        name: string;
        id: string;
        lat: number;
        lng: number;
    }>;
}

const data: TransitData = {
    lines: {},
    stations: {}
};

// LINES TO FETCH
const LINES = {
    ubahn: ['U1', 'U2', 'U3', 'U4', 'U5', 'U6', 'U7', 'U8', 'U9', 'U55'],
    sbahn: ['S1', 'S2', 'S3', 'S5', 'S7', 'S9', 'S41', 'S42', 'S8', 'S85'],
    tram: ['M10', 'M13', 'M17'], // Example explicit trams
    magdeburg: ['1', '2', '4', '6', '9', '10'], // Magdeburg Trams
    regional: ['RE1', 'RE2', 'RE7', 'RB14', 'FEX'] // Key regional lines
};

// UTILS
const DELAY_MS = 500;
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithRetry(url: string, retries = 3): Promise<any> {
    for (let i = 0; i < retries; i++) {
        try {
            const res = await fetch(url, {
                headers: { 'User-Agent': 'TrainTrackApp/1.0 (contact@example.com)' }
            });
            if (!res.ok) throw new Error(`Status ${res.status}`);
            return await res.json();
        } catch (e) {
            console.error(`Fetch error ${url}: ${(e as Error).message}. Retrying...`);
            await sleep(1000 * (i + 1));
        }
    }
    return null;
}

const BASE_URL_BVG = 'https://v6.bvg.transport.rest';
const BASE_URL_DB = 'https://v6.db.transport.rest';

async function processLine(lineName: string, product: string, useDbApi = false) {
    console.log(`Processing ${lineName}...`);
    const baseUrl = useDbApi ? BASE_URL_DB : BASE_URL_BVG;

    // 1. Search for a trip for this line to get the full route
    // Hubs to check for different modes
    const hubs = {
        'subway': '900100003', // Alexanderplatz
        'suburban': '900100003', // Alexanderplatz
        'tram': '900100003', // Alexanderplatz
        'regional': '900003201', // Hauptbahnhof (Berlin)
        'magdeburg_tram': '953332', // Alter Markt, Magdeburg (found via DB API)
        'regional_magdeburg': '900550094' // Magdeburg Hbf
    };

    let startStationId = hubs['subway'];
    if (LINES.sbahn.includes(lineName)) startStationId = hubs['suburban'];
    if (LINES.tram.includes(lineName)) startStationId = hubs['tram'];

    // Custom hubs for specific lines if they don't pass through Alex/Hbf
    if (lineName === 'M10') startStationId = '900007102'; // S Nordbahnhof
    if (lineName === 'M13') startStationId = '900120004'; // S+U Warschauer Str
    if (lineName === 'M17') startStationId = '900160001'; // S Karlshorst (Estimate)

    if (lineName === 'U9') startStationId = '900023201'; // Zoologischer Garten
    if (lineName === 'U7') startStationId = '900078101'; // Hermannplatz
    if (lineName === 'U4') startStationId = '900056102'; // Nollendorfplatz
    if (lineName === 'U3') startStationId = '900056101'; // Wittenbergplatz
    if (lineName === 'U1') startStationId = '900056101'; // Wittenbergplatz

    // Regional adjustments
    if (LINES.regional.includes(lineName)) {
        startStationId = hubs['regional'];
        if (lineName === 'RE1') startStationId = hubs['regional_magdeburg']; // Start RE1 from Magdeburg
    }

    // Magdeburg Trams
    if (LINES.magdeburg.includes(lineName)) {
        startStationId = hubs['magdeburg_tram'];
        product = 'tram'; // Ensure product is tram
    }

    // 2. Fetch departures to find a tripId
    const depUrl = `${baseUrl}/stops/${startStationId}/departures?duration=120&results=50&linesOfStops=false`;
    const depData = await fetchWithRetry(depUrl);

    if (!depData || !depData.departures) {
        console.warn(`No departures found for ${lineName} at ${startStationId}`);
        return;
    }

    // Find a departure for our line
    const departure = depData.departures.find((d: any) => {
        if (useDbApi) {
            // DB API uses "STR 6" for "6"
            return d.line?.name === lineName || d.line?.name === `STR ${lineName}`;
        }
        return d.line?.name === lineName;
    });

    if (!departure) {
        console.warn(`No active trip found for ${lineName} at start hub. Trying to search...`);
        return;
    }

    const tripId = departure.tripId;
    const direction = departure.direction;
    console.log(`Found trip ${tripId} for ${lineName} -> ${direction}`);

    // 3. Fetch Trip Details (Stopovers) - Encode tripId!
    const tripUrl = `${baseUrl}/trips/${encodeURIComponent(tripId)}?stopovers=true&polyline=false`; // No Polyline needed
    const tripData = await fetchWithRetry(tripUrl);

    // Verify structure - JSON response might be { trip: { ... } } or directly { ... }
    const tripObj = tripData?.trip || tripData;

    if (!tripObj || !tripObj.stopovers) {
        console.warn(`Failed to fetch trip details for ${lineName}`);
        return;
    }

    // Capture ordered station list for the line
    const orderedStations: string[] = [];

    // Process Stations
    tripObj.stopovers.forEach((stop: any) => {
        const s = stop.stop;
        if (!s) return;

        orderedStations.push(s.name);

        // Save station data if not exists
        if (!data.stations[s.name]) {
            data.stations[s.name] = {
                name: s.name,
                id: s.id,
                lat: s.location.latitude,
                lng: s.location.longitude
            };
        }
    });

    // Remove duplicates if any (circular lines might need care, but strict order is key)
    // For now, keep as is.
    data.lines[lineName] = orderedStations;
    await sleep(DELAY_MS);
}

// 4. Save to JSON
async function main() {
    // U-Bahn
    for (const line of LINES.ubahn) await processLine(line, 'subway');
    // S-Bahn
    for (const line of LINES.sbahn) await processLine(line, 'suburban');
    // Tram (M lines)
    for (const line of LINES.tram) await processLine(line, 'tram');
    // Regional
    // Regional
    for (const line of LINES.regional) await processLine(line, 'regional');
    // Magdeburg Trams (Use DB API)
    for (const line of LINES.magdeburg) await processLine(line, 'tram', true);

    const outputPath = path.resolve(__dirname, '../public/data/transit_data.json');
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
    console.log(`Saved topological data to ${outputPath}`);
}

main();
