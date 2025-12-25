import fs from 'fs';
import https from 'https';

const OVERPASS_URL = 'https://overpass.kumi.systems/api/interpreter';

// Query for S-Bahn and Tram routes in Berlin (VBB network)
// We get relations (routes) and their members (stops/platforms)
const query = `
[out:json][timeout:60];
(
  relation["network"="Verkehrsverbund Berlin-Brandenburg"]["route"="train"](52.3,13.0,52.7,13.8);
  relation["network"="Verkehrsverbund Berlin-Brandenburg"]["route"="tram"](52.3,13.0,52.7,13.8);
  relation["network"="Verkehrsverbund Berlin-Brandenburg"]["route"="light_rail"](52.3,13.0,52.7,13.8);
);
out body;
>;
out body qt;
`;

// Helper to post to Overpass
function fetchOverpass(query) {
    return new Promise((resolve, reject) => {
        const req = https.request(OVERPASS_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'TrainTrackApp/1.0'
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    console.error("Overpass Response:", data);
                    reject(e);
                }
            });
        });
        req.on('error', reject);
        req.write('data=' + encodeURIComponent(query));
        req.end();
    });
}

function processData(osmData) {
    const nodes = {};
    const stations = {}; // Key: "lat-lng", Value: { name, lat, lng, lines: Set }

    // First pass: Index nodes
    osmData.elements.forEach(el => {
        if (el.type === 'node') {
            nodes[el.id] = { lat: el.lat, lon: el.lon, name: el.tags?.name };
        }
    });

    console.log(`Indexed ${Object.keys(nodes).length} nodes.`);

    // Second pass: Process relations (routes)
    let relationCount = 0;
    const routes = {}; // Key: "S1", Value: [[lat,lng], ...]

    osmData.elements.forEach(el => {
        if (el.type === 'relation' && el.tags && el.tags.ref) {
            relationCount++;
            // Clean line name: "Tram M10" -> "M10", "Train S1" -> "S1"
            let lineName = el.tags.ref.replace(/^(Train|Tram|Bus|Subway) /, '').replace(/\s+/g, '');

            // Collect ordered points only
            const routePoints = [];
            const members = el.members || [];

            members.forEach(member => {
                if (member.type === 'node') {
                    const node = nodes[member.ref];
                    if (node) {
                        routePoints.push([node.lat, node.lon]);

                        // Station logic (keep existing)
                        if (node.name) {
                            const key = node.name;
                            if (!stations[key]) {
                                stations[key] = {
                                    name: node.name,
                                    lat: node.lat,
                                    lng: node.lon,
                                    lines: new Set()
                                };
                            }
                            stations[key].lines.add(lineName);
                        }
                    }
                }
            });

            // If valid route, store it. 
            // Note: Relations might be fragmented. Simple overwrite for now, ideally merge.
            if (routePoints.length > 2) {
                // If route already exists (e.g. direction 2), maybe append or store separately?
                // For simplicity: Longest wins or just overwrite.
                if (!routes[lineName] || routes[lineName].length < routePoints.length) {
                    routes[lineName] = routePoints;
                }
            }
        }
    });
    console.log(`Found ${relationCount} route relations.`);

    // Convert Sets to Arrays
    const stationList = Object.values(stations).map(s => ({
        ...s,
        lines: Array.from(s.lines)
    }));

    return { stations: stationList, routes };
}

async function run() {
    console.log('Fetching data from Overpass...');
    try {
        const data = await fetchOverpass(query);
        console.log(`Received ${data.elements.length} elements.`);

        const processed = processData(data);
        console.log(`Processed ${processed.stations.length} stations and ${Object.keys(processed.routes).length} routes.`);

        fs.writeFileSync('public/data/generated_stations.json', JSON.stringify(processed, null, 2));
        console.log('Saved to public/data/generated_stations.json');
    } catch (e) {
        console.error('Error:', e);
    }
}

run();
