
async function main() {
    // DB API
    const query = 'Magdeburg Alter Markt';
    const url = `https://v6.db.transport.rest/locations?query=${encodeURIComponent(query)}&results=5`;

    console.log(`Searching DB API for ${query}...`);
    try {
        const res = await fetch(url);
        const data = await res.json();

        if (Array.isArray(data)) {
            console.log(`Found ${data.length} locations.`);
            for (const loc of data) {
                console.log(`[${loc.id}] ${loc.name} (Products: ${JSON.stringify(loc.products)})`);

                // If found, try fetching departures to see if lines appear
                if (loc.type === 'stop') {
                    const depUrl = `https://v6.db.transport.rest/stops/${loc.id}/departures?duration=60&results=20`;
                    const depRes = await fetch(depUrl);
                    const depData = await depRes.json();
                    if (depData.departures) {
                        console.log(`  Departures for ${loc.name} (${loc.id}):`);
                        depData.departures.forEach((d) => {
                            console.log(`    [${d.line.product}] ${d.line.name} -> ${d.direction}`);
                        });
                    }
                }
            }
        } else {
            console.log('No locations found.', data);
        }
    } catch (e) {
        console.error(e);
    }
}

main();
