import { allBvgStations } from './src/data/stationNames.ts';

console.log('Stations found:', allBvgStations.length);
if (allBvgStations.length > 0) {
    console.log('Sample:', allBvgStations[0]);
} else {
    console.log('Docs/ManualData seems empty?');
    // Read raw json to check
    const fs = require('fs');
    try {
        const raw = JSON.parse(fs.readFileSync('./src/data/manual_stations.json', 'utf8'));
        console.log('Raw JSON keys:', Object.keys(raw));
        console.log('StationDetails count:', Object.keys(raw.stationDetails || {}).length);
    } catch (e) {
        console.error('Error reading JSON:', e.message);
    }
}
