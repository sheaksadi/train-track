// Server API to fetch station departures from BVG - ALL transport types
export default defineEventHandler(async (event) => {
    const query = getQuery(event);
    const stationName = query.station as string;

    if (!stationName) {
        throw createError({
            statusCode: 400,
            message: 'Station name required'
        });
    }

    try {
        // Search for the station
        const searchUrl = `https://v6.bvg.transport.rest/locations?query=${encodeURIComponent(stationName)}&results=5`;
        const searchResponse = await fetch(searchUrl);
        const searchData = await searchResponse.json();

        if (!searchData || searchData.length === 0) {
            return { departures: [], stationId: null, grouped: {} };
        }

        // Find best match (prefer stops over addresses)
        const station = searchData.find((s: any) => s.type === 'stop') || searchData[0];
        const stationId = station.id;

        // Fetch more departures to cover all transport types
        const departuresUrl = `https://v6.bvg.transport.rest/stops/${stationId}/departures?duration=60&results=30`;
        const depsResponse = await fetch(departuresUrl);
        const depsData = await depsResponse.json();

        const allDepartures = (depsData.departures || []).map((d: any) => {
            const product = d.line?.product;
            let category = 'other';

            if (product === 'subway' || d.line?.name?.startsWith('U')) {
                category = 'U-Bahn';
            } else if (product === 'suburban' || d.line?.name?.startsWith('S')) {
                category = 'S-Bahn';
            } else if (product === 'regional' || d.line?.name?.startsWith('RE') || d.line?.name?.startsWith('RB')) {
                category = 'Regional';
            } else if (product === 'tram') {
                category = 'Tram';
            } else if (product === 'bus') {
                category = 'Bus';
            }

            return {
                line: d.line?.name || 'Unknown',
                destination: d.destination?.name || d.direction || 'Unknown',
                plannedTime: d.plannedWhen,
                actualTime: d.when,
                delay: d.delay || 0,
                platform: d.platform || d.plannedPlatform || null,
                product: d.line?.product,
                category
            };
        });

        // Group by category
        const grouped: Record<string, any[]> = {};

        // Priority order
        const categoryOrder = ['U-Bahn', 'S-Bahn', 'Regional', 'Tram', 'Bus', 'other'];

        categoryOrder.forEach(cat => {
            const deps = allDepartures
                .filter((d: any) => d.category === cat)
                .slice(0, 5); // Max 5 per category

            if (deps.length > 0) {
                grouped[cat] = deps;
            }
        });

        return {
            stationId,
            stationName: station.name,
            departures: allDepartures.slice(0, 15),
            grouped
        };
    } catch (error: any) {
        console.error('Failed to fetch departures:', error);
        throw createError({
            statusCode: 500,
            message: error.message || 'Failed to fetch departures'
        });
    }
});
