import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const stations = require('vbb-stations/full.json');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Filter for stations that are likely relevant (have S-Bahn or U-Bahn or Tram or Regional)
// Although the user said "fetch all", the list is huge (~13k). 
// Let's at least ensure they have coordinates.

console.log('Fetching stations from full.json...');

console.log('Fetching stations from full.json...');

const allStations = [];
let logged = false;
for (const station of Object.values(stations)) {
    if (station.location && station.location.latitude && station.location.longitude) {
        // Heuristics for S-Bahn and U-Bahn since vbb-stations doesn't provide products
        const name = station.name;
        const isS = /^S\s|S\+U/.test(name);
        const isU = /^U\s|S\+U/.test(name);

        // Trams and Regional are hard to detect solely by name without line data.
        // We will label them as 'other' for now, or just rely on S/U toggles.

        allStations.push({
            id: station.id,
            name: station.name,
            lat: station.location.latitude,
            lng: station.location.longitude,
            products: {
                s: isS,
                u: isU,
                // t: ?, r: ?
            }
        });
    }
}

// Sort by name
allStations.sort((a, b) => a.name.localeCompare(b.name));

console.log(`Found ${allStations.length} stations.`);

const outputPath = path.resolve(__dirname, '../src/data/bvg_stations.json');

fs.writeFileSync(outputPath, JSON.stringify(allStations, null, 2));

console.log(`Wrote stations to ${outputPath}`);
