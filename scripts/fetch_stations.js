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
    osmData.elements.forEach(el => {
        if (el.type === 'relation' && el.tags && el.tags.ref) {
            relationCount++;
            const lineName = el.tags.ref;
            const members = el.members || [];

            members.forEach(member => {
                if (member.type === 'node') {
                    const node = nodes[member.ref];
                    if (node && node.name) {
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
            });
        }
    });
    console.log(`Found ${relationCount} route relations.`);

    // Convert Sets to Arrays
    return Object.values(stations).map(s => ({
        ...s,
        lines: Array.from(s.lines)
    }));
}

async function run() {
    console.log('Fetching data from Overpass...');
    try {
        const data = await fetchOverpass(query);
        console.log(`Received ${data.elements.length} elements.`);

        const processed = processData(data);
        console.log(`Processed ${processed.length} stations.`);

        fs.writeFileSync('public/data/generated_stations.json', JSON.stringify(processed, null, 2));
        console.log('Saved to public/data/generated_stations.json');
    } catch (e) {
        console.error('Error:', e);
    }
}

run();
