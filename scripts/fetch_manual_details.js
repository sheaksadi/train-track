import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const vbbStations = require('vbb-stations/full.json');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputPath = path.resolve(__dirname, 'cleaned_station_names.json');
const manualNames = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));

// We need to map Manual Name -> VBB ID, Lat, Lng, LINES.
// VBB Stations (npm) does NOT have lines. The API does.
// However, the user said "get from bvg api NOT the npm package".
// So we MUST use the API to get the lines.
// We will iterate and fetch from v6.bvg.transport.rest/locations?query={name}

// We will do this sequentially to respect rate limits (100 req/min).
// 350 stations / 100 = 3.5 minutes minimum.

const API_DELAY = 600; // ms
const results = {}; // Map Name -> Data

async function fetchStationData(name) {
    try {
        const url = `https://v6.bvg.transport.rest/locations?query=${encodeURIComponent(name)}&results=1&linesOfStops=true`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(res.statusText);
        const data = await res.json();
        return data[0]; // Best match
    } catch (e) {
        console.error(`Error fetching ${name}:`, e.message);
        return null;
    }
}

async function run() {
    console.log(`Fetching data for ${manualNames.length} stations...`);

    // Check if we have a cache to avoid re-fetching
    const cachePath = path.resolve(__dirname, 'manual_stations_enriched.json');
    if (fs.existsSync(cachePath)) {
        console.log("Found existing enriched file. Use it? (Assuming no for now to ensure freshness)");
    }

    const stationsByLine = {}; // Line -> [Stations]
    const stationDetails = {}; // Name -> {id, lat, lng, lines}

    // We already have some lines in the list (RE1, etc) which our regex missed?
    // User list had "RE1", "RB23". My regex filter might have put them in "stations" if they didn't match perfectly.
    // "RE1" match regex `^[A-Z]+\s?[0-9]+$`? Yes.
    // Let's re-verify the regex in the previous step or just robustly handle "lines" here.

    // Actually, asking the API for "RE1" gives a line or a station? usually a line.
    // We only want Stations here.

    let processed = 0;

    for (const name of manualNames) {
        // Skip obvious lines if any slipped through
        if (name.match(/^(RE|RB|S|U|FEX)[0-9]+$/)) {
            console.log(`Skipping likely line name: ${name}`);
            continue;
        }

        // Fetch
        const data = await fetchStationData(name);

        if (data && data.type === 'stop' && data.location) {
            const stationInfo = {
                id: data.id,
                name: data.name, // Use official name? Or manual? User wants manual list but official data.
                // Let's use Manual Name as key, but store Official Name too.
                officialName: data.name,
                lat: data.location.latitude,
                lng: data.location.longitude,
                lines: []
            };

            if (data.lines) {
                stationInfo.lines = data.lines.map(l => l.name);

                // Add to line groups
                for (const line of data.lines) {
                    const lname = line.name; // e.g. "U8", "S1"
                    // Filter for only S, U, Regional?
                    if (!stationsByLine[lname]) stationsByLine[lname] = [];
                    // Avoid duplicates
                    if (!stationsByLine[lname].includes(name)) {
                        stationsByLine[lname].push(name);
                    }
                }
            }

            stationDetails[name] = stationInfo;
            process.stdout.write('.');
        } else {
            console.log(`\nNo match for: ${name}`);
        }

        processed++;
        // Rate limit delay
        await new Promise(r => setTimeout(r, API_DELAY));
    }

    console.log('\nDone.');

    // Output
    const finalData = {
        stationsByLine,
        stationDetails
    };

    fs.writeFileSync(cachePath, JSON.stringify(finalData, null, 2));
    console.log(`Saved enriched data to ${cachePath}`);
}

run();
