// Transit Store - Uses precise SVG-based coordinates
import { defineStore } from 'pinia';
import { ubahnColors, ubahnStations, ubahnLines, type Station } from '@/data/ubahn_precise';

// SVG viewBox dimensions
const SVG_WIDTH = 1190.55;
const SVG_HEIGHT = 841.89;

// Convert SVG coordinates to scene coordinates
// Center the map and scale appropriately
export function svgToScene(x: number, y: number): { x: number; y: number } {
    // Center on viewBox center and flip Y (SVG Y goes down, Three.js Y goes up)
    return {
        x: x - SVG_WIDTH / 2,
        y: (SVG_HEIGHT / 2) - y,  // Flip Y axis
    };
}

export const allLineColors = ubahnColors;
export const allLines = ubahnLines;
export const allStations = ubahnStations;

export const useTransitStore = defineStore('transit', {
    state: () => ({
        enabledLines: Object.keys(ubahnColors).reduce((acc, line) => {
            acc[line] = true;
            return acc;
        }, {} as Record<string, boolean>),
    }),

    getters: {
        getLineColor: () => (lineName: string): string => {
            return ubahnColors[lineName] || '#888888';
        },

        enabledLinesList(): string[] {
            return Object.entries(this.enabledLines)
                .filter(([_, enabled]) => enabled)
                .map(([line]) => line);
        },
    },

    actions: {
        toggleLine(line: string) {
            this.enabledLines[line] = !this.enabledLines[line];
        },

        showAll() {
            Object.keys(this.enabledLines).forEach(l => (this.enabledLines[l] = true));
        },

        showNone() {
            Object.keys(this.enabledLines).forEach(l => (this.enabledLines[l] = false));
        },

        getStationPosition(name: string): { x: number; y: number } | null {
            const station = ubahnStations[name];
            if (!station) return null;
            return svgToScene(station.x, station.y);
        },
    },
});
