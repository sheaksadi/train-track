export default defineEventHandler(async () => {
    // Bounding box covering full RE1: Magdeburg to Frankfurt (Oder)
    const north = 52.65;
    const south = 52.05;
    const west = 11.50;
    const east = 14.60;  // Extended to Frankfurt (Oder)

    const url = `https://v6.bvg.transport.rest/radar?north=${north}&west=${west}&south=${south}&east=${east}&results=512&duration=30&frames=1`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`BVG API error: ${response.status}`);
        }

        const data = await response.json();

        // Filter for U-Bahn subway lines (U1-U9) and RE1 regional
        const allowedLines = ['U1', 'U2', 'U3', 'U4', 'U5', 'U6', 'U7', 'U8', 'U9', 'RE1'];

        const trains = data.movements
            .filter((m: any) =>
                allowedLines.includes(m.line?.name) &&
                (m.line?.product === 'subway' || m.line?.product === 'regional') &&
                m.location?.latitude &&
                m.location?.longitude
            )
            .map((m: any) => ({
                tripId: m.tripId,
                latitude: m.location.latitude,
                longitude: m.location.longitude,
                direction: m.direction,
                lineName: m.line.name,
                product: m.line.product,
                delay: m.nextStopovers?.[0]?.departureDelay || 0
            }));

        return {
            trains,
            timestamp: new Date().toISOString()
        };
    } catch (error: any) {
        console.error('Failed to fetch train positions:', error);
        throw createError({
            statusCode: 500,
            message: error.message || 'Failed to fetch train positions'
        });
    }
});
