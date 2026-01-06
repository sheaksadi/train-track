// Map UI Store - Zoom, Info Panel, Camera
import { defineStore } from 'pinia';

export const useMapStore = defineStore('map', {
    state: () => ({
        // Zoom level
        currentZoom: 1,

        // Camera position
        cameraX: 0,
        cameraY: 0,

        // Info panel
        infoPanel: {
            visible: false,
            x: 0,
            y: 0,
            type: '' as '' | 'station' | 'train',
            title: '',
            lines: '',
            color: '#fff',
            direction: '',
            delay: 0,
            nextStation: '',
            nextStationTime: '',
        },
    }),

    actions: {
        zoomIn(amount = 0.2) {
            this.currentZoom = Math.min(4, this.currentZoom * (1 + amount));
        },

        zoomOut(amount = 0.2) {
            this.currentZoom = Math.max(0.2, this.currentZoom * (1 - amount));
        },

        resetZoom() {
            this.currentZoom = 1;
            this.cameraX = 0;
            this.cameraY = 0;
        },

        showStationInfo(name: string, lines: string[], color: string, x: number, y: number) {
            // Position panel with screen boundary checks
            const panelWidth = 280;
            const panelHeight = 200;

            let posX = x + 15;
            let posY = y + 15;

            if (posX + panelWidth > window.innerWidth - 15) {
                posX = x - panelWidth - 15;
            }
            if (posY + panelHeight > window.innerHeight - 15) {
                posY = y - panelHeight - 15;
            }

            this.infoPanel = {
                visible: true,
                x: Math.max(15, posX),
                y: Math.max(15, posY),
                type: 'station',
                title: name,
                lines: lines.join(', '),
                color,
                direction: '',
                delay: 0,
                nextStation: '',
                nextStationTime: '',
            };
        },

        showTrainInfo(lineName: string, direction: string, delay: number, color: string, x: number, y: number, nextStation?: string, nextStationTime?: string) {
            this.infoPanel = {
                visible: true,
                x: Math.min(x + 15, window.innerWidth - 220),
                y: Math.min(y + 15, window.innerHeight - 150),
                type: 'train',
                title: lineName,
                lines: '',
                color,
                direction,
                delay,
                nextStation: nextStation || '',
                nextStationTime: nextStationTime || '',
            };
        },

        hideInfo() {
            this.infoPanel.visible = false;
        },
    },
});
