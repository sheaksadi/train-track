// Map State Store - Camera, UI, Info Panel
import { defineStore } from 'pinia';
import type { Departure } from './transitStore';

export const useMapStore = defineStore('map', {
    state: () => ({
        // Zoom
        currentZoom: 1,

        // Info panel
        infoPanel: {
            visible: false,
            locked: false,
            loading: false,
            x: 0,
            y: 0,
            type: '' as 'station' | 'train' | '',
            title: '',
            lines: '',
            color: '#888',
            direction: '',
            delay: 0,
            grouped: {} as Record<string, Departure[]>,
        },
    }),

    actions: {
        zoomIn(amount = 0.3) {
            this.currentZoom = Math.min(5, this.currentZoom * (1 + amount));
        },

        zoomOut(amount = 0.3) {
            this.currentZoom = Math.max(0.05, this.currentZoom * (1 - amount));
        },

        resetZoom() {
            this.currentZoom = 1;
        },

        showStationInfo(stationName: string, lines: string[], color: string, x: number, y: number, lock = false) {
            this.infoPanel.visible = true;
            this.infoPanel.locked = lock;
            this.infoPanel.loading = true;

            // Improved positioning - ensure panel stays on screen
            const panelWidth = 380;
            const panelHeight = 400;
            const margin = 15;

            let posX = x + margin;
            let posY = y + margin;

            // Check right edge - flip to left side if needed
            if (posX + panelWidth > window.innerWidth - margin) {
                posX = x - panelWidth - margin;
            }

            // Check left edge
            if (posX < margin) {
                posX = margin;
            }

            // Check bottom edge - flip to top if needed
            if (posY + panelHeight > window.innerHeight - margin) {
                posY = y - panelHeight - margin;
            }

            // Check top edge
            if (posY < margin) {
                posY = margin;
            }

            this.infoPanel.x = posX;
            this.infoPanel.y = posY;
            this.infoPanel.type = 'station';
            this.infoPanel.title = stationName;
            this.infoPanel.lines = lines.join(', ');
            this.infoPanel.color = color;
            this.infoPanel.grouped = {};
        },

        setStationDepartures(grouped: Record<string, Departure[]>) {
            this.infoPanel.grouped = grouped;
            this.infoPanel.loading = false;
        },

        showTrainInfo(lineName: string, direction: string, delay: number, color: string, x: number, y: number, lock = false) {
            this.infoPanel.visible = true;
            this.infoPanel.locked = lock;
            this.infoPanel.loading = false;
            this.infoPanel.x = Math.min(x + 15, window.innerWidth - 220);
            this.infoPanel.y = Math.min(y + 15, window.innerHeight - 150);
            this.infoPanel.type = 'train';
            this.infoPanel.title = lineName;
            this.infoPanel.color = color;
            this.infoPanel.direction = direction;
            this.infoPanel.delay = delay;
            this.infoPanel.grouped = {};
        },

        hideInfo() {
            if (!this.infoPanel.locked) {
                this.infoPanel.visible = false;
            }
        },

        closeInfo() {
            this.infoPanel.visible = false;
            this.infoPanel.locked = false;
        },
    },
});
