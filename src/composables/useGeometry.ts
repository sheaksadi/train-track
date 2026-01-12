// Geometry utilities for track rendering and calculations
import type { EditorStation, EditorTrack, Waypoint } from '@/stores/editor/types';

export interface Point {
    x: number;
    y: number;
}

// Helper to measure text width (approximate)
export function measureTextWidth(text: string, fontSize: number): number {
    return text.length * fontSize * 0.6;
}

// Get connection point on a station for a specific track
export function getTrackConnectionPoint(
    station: EditorStation,
    track: EditorTrack,
    isStart: boolean,
    stationRadius: number,
    stationHeight: number,
    tracks: EditorTrack[]
): Point {
    // Check for custom offset
    const customOffset = isStart ? track.stationOffsets.start : track.stationOffsets.end;
    const lateralOffset = isStart ? track.stationOffsets.startLateral : track.stationOffsets.endLateral;

    // Effective dimensions - use station.width if defined for pill shapes
    const isPill = station.length && station.length > 6;
    const effectiveLength = isPill ? station.length : 20;
    const effectiveHeight = isPill ? (station.width || stationHeight) : stationRadius * 2;

    let offset = 0;
    let latOffset = 0;

    if (customOffset !== undefined) {
        // Legacy fix: Treat 0.5 as 0 (center) for circles
        let effectiveCustomOffset = customOffset;
        if (!isPill && customOffset === 0.5) {
            effectiveCustomOffset = 0;
        }

        offset = effectiveCustomOffset * (effectiveLength / 2 - 1);

        if (lateralOffset !== undefined) {
            latOffset = lateralOffset * (effectiveHeight / 2);
        }
    } else {
        // Auto-calculate offset based on track index - ONLY FOR PILLS
        if (isPill) {
            const connectedTracks = tracks.filter(
                t => t.stationIds[0] === station.id || t.stationIds[1] === station.id
            );

            if (connectedTracks.length > 1) {
                const trackIndex = connectedTracks.findIndex(t => t.id === track.id);
                if (trackIndex !== -1) {
                    const usableLength = effectiveLength - 8;
                    const spacing = usableLength / Math.max(connectedTracks.length - 1, 1);
                    offset = -usableLength / 2 + trackIndex * spacing;
                }
            }
        }
    }

    // Apply rotation
    const rotation = (station.rotation || 0) * Math.PI / 180;
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);

    const finalX = offset * cos - latOffset * sin;
    const finalY = offset * sin + latOffset * cos;

    return {
        x: station.x + finalX,
        y: station.y + finalY,
    };
}

// Get the two endpoints of a track for rendering handles
export function getTrackEndpoints(
    track: EditorTrack,
    stations: EditorStation[],
    stationRadius: number,
    stationHeight: number,
    tracks: EditorTrack[]
): [Point, Point] {
    const s1 = stations.find(s => s.id === track.stationIds[0]);
    const s2 = stations.find(s => s.id === track.stationIds[1]);
    if (!s1 || !s2) return [{ x: 0, y: 0 }, { x: 0, y: 0 }];

    return [
        getTrackConnectionPoint(s1, track, true, stationRadius, stationHeight, tracks),
        getTrackConnectionPoint(s2, track, false, stationRadius, stationHeight, tracks),
    ];
}

// Generate rounded path with quadratic bezier curves at corners
export function getRoundedPath(points: Point[], cornerRadius: number = 5): string {
    if (points.length < 2) return '';
    if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;

    let d = `M ${points[0].x} ${points[0].y}`;

    for (let i = 1; i < points.length - 1; i++) {
        const pPrev = points[i - 1];
        const pCurr = points[i];
        const pNext = points[i + 1];

        const vPrev = { x: pPrev.x - pCurr.x, y: pPrev.y - pCurr.y };
        const vNext = { x: pNext.x - pCurr.x, y: pNext.y - pCurr.y };

        const dPrev = Math.sqrt(vPrev.x * vPrev.x + vPrev.y * vPrev.y);
        const dNext = Math.sqrt(vNext.x * vNext.x + vNext.y * vNext.y);

        const radius = Math.min(cornerRadius, dPrev / 2, dNext / 2);

        const startX = pCurr.x + (vPrev.x / dPrev) * radius;
        const startY = pCurr.y + (vPrev.y / dPrev) * radius;

        const endX = pCurr.x + (vNext.x / dNext) * radius;
        const endY = pCurr.y + (vNext.y / dNext) * radius;

        d += ` L ${startX} ${startY}`;
        d += ` Q ${pCurr.x} ${pCurr.y} ${endX} ${endY}`;
    }

    const last = points[points.length - 1];
    d += ` L ${last.x} ${last.y}`;

    return d;
}

// Get complete track path including waypoints
export function getTrackPath(
    track: EditorTrack,
    stations: EditorStation[],
    stationRadius: number,
    stationHeight: number,
    tracks: EditorTrack[]
): string {
    const s1 = stations.find(s => s.id === track.stationIds[0]);
    const s2 = stations.find(s => s.id === track.stationIds[1]);

    if (!s1 || !s2) return '';

    const start = getTrackConnectionPoint(s1, track, true, stationRadius, stationHeight, tracks);
    const end = getTrackConnectionPoint(s2, track, false, stationRadius, stationHeight, tracks);

    if (!track.waypoints || track.waypoints.length === 0) {
        return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
    }

    const points = [start, ...track.waypoints, end];
    return getRoundedPath(points, track.cornerRadius);
}

// Find the best segment to insert a new waypoint
export function findWaypointInsertIndex(
    track: EditorTrack,
    x: number,
    y: number,
    stations: EditorStation[],
    stationRadius: number,
    stationHeight: number,
    tracks: EditorTrack[]
): number {
    const s1 = stations.find(s => s.id === track.stationIds[0]);
    const s2 = stations.find(s => s.id === track.stationIds[1]);
    if (!s1 || !s2) return 0;

    const p1 = getTrackConnectionPoint(s1, track, true, stationRadius, stationHeight, tracks);
    const p2 = getTrackConnectionPoint(s2, track, false, stationRadius, stationHeight, tracks);

    const points = [p1, ...track.waypoints, p2];

    let minDist = Infinity;
    let insertIndex = 0;

    for (let i = 0; i < points.length - 1; i++) {
        const pt1 = points[i];
        const pt2 = points[i + 1];
        const dist = pointToSegmentDistance(x, y, pt1.x, pt1.y, pt2.x, pt2.y);
        if (dist < minDist) {
            minDist = dist;
            insertIndex = i;
        }
    }

    return insertIndex;
}

// Calculate distance from point to line segment
export function pointToSegmentDistance(
    px: number,
    py: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number
): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSq = dx * dx + dy * dy;

    if (lengthSq === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);

    let t = ((px - x1) * dx + (py - y1) * dy) / lengthSq;
    t = Math.max(0, Math.min(1, t));

    const nearestX = x1 + t * dx;
    const nearestY = y1 + t * dy;

    return Math.sqrt((px - nearestX) ** 2 + (py - nearestY) ** 2);
}
