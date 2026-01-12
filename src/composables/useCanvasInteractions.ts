// Canvas Interactions (pan, zoom, mouse position)
import { ref, reactive, computed, type Ref } from 'vue';

export function useCanvasInteractions() {
    // View state
    const zoom = ref(1);
    const pan = reactive({ x: 0, y: 0 });
    const isPanning = ref(false);
    const isRightMousePanning = ref(false);
    const panStart = reactive({ x: 0, y: 0 });
    const panOffset = reactive({ x: 0, y: 0 });
    const mousePosition = ref<{ x: number; y: number } | null>(null);

    // Computed sizes - station sizes are fixed (same visual size regardless of zoom)
    const stationRadius = computed(() => 5);
    const stationHeight = computed(() => 8);
    const stationStrokeWidth = computed(() => Math.max(1, 1.5 / zoom.value));
    const trackWidth = computed(() => Math.max(2, 3 / zoom.value));
    const labelFontSize = computed(() => Math.max(6, 8 / zoom.value));
    const waypointRadius = computed(() => Math.max(3, 4 / zoom.value));
    const endpointVisualRadius = computed(() => Math.max(3, 4 / zoom.value));
    const endpointHitRadius = computed(() => Math.max(8, 12 / zoom.value));

    function handleWheel(e: WheelEvent, canvasContainer: HTMLElement | null) {
        const rect = canvasContainer?.getBoundingClientRect();
        if (!rect) return;

        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const delta = e.deltaY < 0 ? 1.15 : 0.87;
        const newZoom = Math.max(0.1, Math.min(8, zoom.value * delta));

        const zoomRatio = newZoom / zoom.value;
        pan.x = mouseX - (mouseX - pan.x) * zoomRatio;
        pan.y = mouseY - (mouseY - pan.y) * zoomRatio;

        zoom.value = newZoom;
    }

    function startPan(e: MouseEvent) {
        isPanning.value = true;
        panStart.x = e.clientX;
        panStart.y = e.clientY;
        panOffset.x = pan.x;
        panOffset.y = pan.y;
    }

    function startRightMousePan(e: MouseEvent) {
        isRightMousePanning.value = true;
        startPan(e);
    }

    function updatePan(e: MouseEvent) {
        if (isPanning.value) {
            pan.x = panOffset.x + (e.clientX - panStart.x);
            pan.y = panOffset.y + (e.clientY - panStart.y);
        }
    }

    function endPan() {
        isPanning.value = false;
        isRightMousePanning.value = false;
    }

    function updateMousePosition(e: MouseEvent, canvasContainer: HTMLElement | null) {
        if (canvasContainer) {
            const rect = canvasContainer.getBoundingClientRect();
            const x = (e.clientX - rect.left - pan.x) / zoom.value;
            const y = (e.clientY - rect.top - pan.y) / zoom.value;
            mousePosition.value = { x, y };
        }
    }

    function getCanvasCoords(e: MouseEvent, canvasContainer: HTMLElement | null): { x: number; y: number } | null {
        const rect = canvasContainer?.getBoundingClientRect();
        if (!rect) return null;

        return {
            x: (e.clientX - rect.left - pan.x) / zoom.value,
            y: (e.clientY - rect.top - pan.y) / zoom.value,
        };
    }

    // Zoom controls
    function zoomIn() { zoom.value = Math.min(8, zoom.value * 1.25); }
    function zoomOut() { zoom.value = Math.max(0.1, zoom.value / 1.25); }
    function resetView() { zoom.value = 1; pan.x = 0; pan.y = 0; }

    return {
        // State
        zoom,
        pan,
        isPanning,
        isRightMousePanning,
        mousePosition,

        // Computed sizes
        stationRadius,
        stationHeight,
        stationStrokeWidth,
        trackWidth,
        labelFontSize,
        waypointRadius,
        endpointVisualRadius,
        endpointHitRadius,

        // Methods
        handleWheel,
        startPan,
        startRightMousePan,
        updatePan,
        endPan,
        updateMousePosition,
        getCanvasCoords,
        zoomIn,
        zoomOut,
        resetView,
    };
}
