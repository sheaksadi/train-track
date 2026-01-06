<template>
  <div class="alignment-map">
    <!-- SVG Background Container -->
    <div 
      ref="mapContainer" 
      class="map-container"
      @wheel.prevent="onWheel"
      @mousedown="onMouseDown"
      @mousemove="onMouseMove"
      @mouseup="onMouseUp"
      @mouseleave="onMouseUp"
    >
      <div 
        class="svg-wrapper"
        :style="{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '50% 50%'
        }"
      >
        <!-- BVG Map Background -->
        <img 
          :src="svgUrl" 
          class="bvg-svg"
          alt="BVG Map"
        />
        
        <!-- GeoJSON Overlay Canvas -->
        <canvas 
          ref="overlayCanvas" 
          class="overlay-canvas"
          :style="{ opacity: overlayOpacity }"
        ></canvas>
      </div>
    </div>
    
    <!-- Control Panel -->
    <div class="control-panel">
      <h3>GeoJSON Overlay Alignment</h3>
      
      <div class="control-group">
        <label>Overlay Opacity</label>
        <input type="range" v-model.number="overlayOpacity" min="0" max="1" step="0.1" />
        <span>{{ Math.round(overlayOpacity * 100) }}%</span>
      </div>
      
      <div class="control-group">
        <label>Scale</label>
        <input type="range" v-model.number="transform.scale" min="0.1" max="5" step="0.01" />
        <span>{{ transform.scale.toFixed(2) }}</span>
      </div>
      
      <div class="control-group">
        <label>Offset X</label>
        <input type="range" v-model.number="transform.offsetX" min="-1000" max="1000" step="1" />
        <span>{{ transform.offsetX }}</span>
      </div>
      
      <div class="control-group">
        <label>Offset Y</label>
        <input type="range" v-model.number="transform.offsetY" min="-1000" max="1000" step="1" />
        <span>{{ transform.offsetY }}</span>
      </div>
      
      <div class="control-group">
        <label>Rotation</label>
        <input type="range" v-model.number="transform.rotation" min="-180" max="180" step="1" />
        <span>{{ transform.rotation }}°</span>
      </div>
      
      <div class="line-filters">
        <label>Show Lines:</label>
        <div class="filter-btns">
          <button 
            :class="{ active: showSbahn }" 
            @click="showSbahn = !showSbahn"
            style="background: #E52E12"
          >S-Bahn</button>
          <button 
            :class="{ active: showUbahn }" 
            @click="showUbahn = !showUbahn"
            style="background: #528DBA"
          >U-Bahn</button>
          <button 
            :class="{ active: showRegional }" 
            @click="showRegional = !showRegional"
            style="background: #666"
          >Regional</button>
        </div>
      </div>
      
      <div class="actions">
        <button @click="resetTransform">Reset Transform</button>
        <button @click="redrawOverlay">Redraw</button>
      </div>
      
      <div class="info-text">
        <strong>Note:</strong> GeoJSON uses real lat/lng coordinates. The BVG schematic map is geographically distorted for readability, so perfect alignment is not possible.<br><br>
        Use the controls to roughly align and verify data coverage.
      </div>
    </div>
    
    <!-- Zoom Controls -->
    <div class="zoom-controls">
      <button @click="zoomIn">+</button>
      <button @click="zoomOut">−</button>
      <button @click="resetView">⌂</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch, nextTick } from 'vue';

// SVG background
const svgUrl = '/bvg_subahn_2025.svg';
const mapContainer = ref<HTMLElement | null>(null);
const overlayCanvas = ref<HTMLCanvasElement | null>(null);

// View state
const zoom = ref(1);
const pan = reactive({ x: 0, y: 0 });
const isPanning = ref(false);
const panStart = reactive({ x: 0, y: 0 });
const panOffset = reactive({ x: 0, y: 0 });

// Overlay settings
const overlayOpacity = ref(0.7);
const showSbahn = ref(true);
const showUbahn = ref(true);
const showRegional = ref(false);

// Transform for alignment
const transform = reactive({
  scale: 0.55,
  offsetX: 580,
  offsetY: 380,
  rotation: 0,
});

// Line colors
const lineColors: Record<string, string> = {
  'S1': '#DE4DA4', 'S2': '#005F27', 'S25': '#005F27', 'S26': '#005F27',
  'S3': '#0A4C99', 'S41': '#A23B1E', 'S42': '#C66D38',
  'S45': '#C38737', 'S46': '#C38737', 'S47': '#C38737',
  'S5': '#FF5900', 'S7': '#6F4E9C', 'S75': '#6F4E9C',
  'S8': '#55A822', 'S85': '#55A822', 'S9': '#8B1C52',
  'U1': '#7DAD4C', 'U2': '#DA421E', 'U3': '#007A5B', 'U4': '#F0D722',
  'U5': '#7E5330', 'U55': '#7E5330', 'U6': '#8C6DAB',
  'U7': '#528DBA', 'U8': '#224F86', 'U9': '#F3791D',
};

// Transit data
interface LineData {
  name: string;
  product: string;
  color?: string;
  segments: Array<{ coordinates: number[][][] }>;
}
let transitData: { lines: Record<string, LineData> } | null = null;

// Berlin bounds for coordinate transformation
const BERLIN_BOUNDS = {
  minLng: 13.08,
  maxLng: 13.76,
  minLat: 52.34,
  maxLat: 52.68,
};

// Canvas dimensions (match SVG)
const CANVAS_WIDTH = 1191;
const CANVAS_HEIGHT = 842;

function lngToX(lng: number): number {
  const normalized = (lng - BERLIN_BOUNDS.minLng) / (BERLIN_BOUNDS.maxLng - BERLIN_BOUNDS.minLng);
  return normalized * CANVAS_WIDTH * transform.scale + transform.offsetX;
}

function latToY(lat: number): number {
  // Flip Y because canvas 0,0 is top-left
  const normalized = 1 - (lat - BERLIN_BOUNDS.minLat) / (BERLIN_BOUNDS.maxLat - BERLIN_BOUNDS.minLat);
  return normalized * CANVAS_HEIGHT * transform.scale + transform.offsetY;
}

async function loadTransitData() {
  try {
    const response = await fetch('/data/sbahn_map_data.json');
    if (!response.ok) throw new Error('Failed to load');
    transitData = await response.json();
    await nextTick();
    redrawOverlay();
  } catch (error) {
    console.error('Error loading transit data:', error);
  }
}

function redrawOverlay() {
  const canvas = overlayCanvas.value;
  if (!canvas || !transitData) return;
  
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  
  // Apply rotation if any
  if (transform.rotation !== 0) {
    ctx.save();
    ctx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    ctx.rotate((transform.rotation * Math.PI) / 180);
    ctx.translate(-CANVAS_WIDTH / 2, -CANVAS_HEIGHT / 2);
  }
  
  // Draw each line
  for (const [lineName, line] of Object.entries(transitData.lines)) {
    // Filter by type
    if (lineName.startsWith('S') && !showSbahn.value) continue;
    if (lineName.startsWith('U') && !showUbahn.value) continue;
    if ((lineName.startsWith('R') || lineName === 'FEX') && !showRegional.value) continue;
    
    const color = lineColors[lineName] || line.color || '#888';
    const lineWidth = lineName.startsWith('U') ? 4 : lineName.startsWith('S') ? 3 : 2;
    
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    for (const segment of line.segments) {
      for (const coordSet of segment.coordinates) {
        if (coordSet.length < 2) continue;
        
        ctx.beginPath();
        const [startLng, startLat] = coordSet[0];
        ctx.moveTo(lngToX(startLng), latToY(startLat));
        
        for (let i = 1; i < coordSet.length; i++) {
          const [lng, lat] = coordSet[i];
          ctx.lineTo(lngToX(lng), latToY(lat));
        }
        ctx.stroke();
      }
    }
  }
  
  if (transform.rotation !== 0) {
    ctx.restore();
  }
}

// Watch for changes
watch([transform, showSbahn, showUbahn, showRegional], redrawOverlay, { deep: true });

function resetTransform() {
  transform.scale = 0.55;
  transform.offsetX = 580;
  transform.offsetY = 380;
  transform.rotation = 0;
}

// Pan/Zoom handlers
function zoomIn() {
  zoom.value = Math.min(5, zoom.value * 1.2);
}

function zoomOut() {
  zoom.value = Math.max(0.3, zoom.value / 1.2);
}

function resetView() {
  zoom.value = 1;
  pan.x = 0;
  pan.y = 0;
}

function onWheel(e: WheelEvent) {
  const delta = e.deltaY < 0 ? 1.1 : 0.9;
  zoom.value = Math.max(0.3, Math.min(5, zoom.value * delta));
}

function onMouseDown(e: MouseEvent) {
  isPanning.value = true;
  panStart.x = e.clientX;
  panStart.y = e.clientY;
  panOffset.x = pan.x;
  panOffset.y = pan.y;
}

function onMouseMove(e: MouseEvent) {
  if (isPanning.value) {
    pan.x = panOffset.x + (e.clientX - panStart.x);
    pan.y = panOffset.y + (e.clientY - panStart.y);
  }
}

function onMouseUp() {
  isPanning.value = false;
}

onMounted(() => {
  loadTransitData();
});
</script>

<style scoped>
.alignment-map {
  width: 100vw;
  height: 100vh;
  background: #f5f5f5;
  overflow: hidden;
  position: relative;
}

.map-container {
  width: 100%;
  height: 100%;
  cursor: grab;
  display: flex;
  align-items: center;
  justify-content: center;
}

.map-container:active {
  cursor: grabbing;
}

.svg-wrapper {
  position: relative;
  transition: transform 0.1s ease-out;
  will-change: transform;
}

.bvg-svg {
  width: 1191px;
  height: 842px;
  pointer-events: none;
}

.overlay-canvas {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
}

.control-panel {
  position: fixed;
  left: 16px;
  top: 16px;
  background: rgba(30, 30, 35, 0.95);
  border-radius: 12px;
  padding: 16px;
  color: #fff;
  font-family: 'Inter', -apple-system, sans-serif;
  z-index: 1000;
  width: 280px;
  max-height: calc(100vh - 100px);
  overflow-y: auto;
}

.control-panel h3 {
  margin: 0 0 16px 0;
  font-size: 14px;
  font-weight: 700;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  padding-bottom: 10px;
}

.control-group {
  margin-bottom: 12px;
}

.control-group label {
  display: block;
  font-size: 11px;
  color: rgba(255,255,255,0.6);
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.control-group input[type="range"] {
  width: calc(100% - 50px);
  margin-right: 8px;
  vertical-align: middle;
}

.control-group span {
  font-size: 12px;
  color: rgba(255,255,255,0.8);
  font-family: monospace;
}

.line-filters {
  margin: 16px 0;
  padding-top: 12px;
  border-top: 1px solid rgba(255,255,255,0.1);
}

.line-filters label {
  font-size: 11px;
  color: rgba(255,255,255,0.6);
  text-transform: uppercase;
  display: block;
  margin-bottom: 8px;
}

.filter-btns {
  display: flex;
  gap: 6px;
}

.filter-btns button {
  flex: 1;
  padding: 6px 8px;
  border: none;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  opacity: 0.3;
  color: #fff;
  transition: opacity 0.2s;
}

.filter-btns button.active {
  opacity: 1;
}

.actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}

.actions button {
  flex: 1;
  padding: 8px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  background: rgba(255,255,255,0.1);
  color: #fff;
  transition: background 0.15s;
}

.actions button:hover {
  background: rgba(255,255,255,0.2);
}

.info-text {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid rgba(255,255,255,0.1);
  font-size: 11px;
  color: rgba(255,255,255,0.5);
  line-height: 1.5;
}

.zoom-controls {
  position: fixed;
  bottom: 24px;
  right: 24px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 1000;
}

.zoom-controls button {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 8px;
  font-size: 20px;
  cursor: pointer;
  background: rgba(30, 30, 35, 0.95);
  color: #fff;
  transition: background 0.2s;
}

.zoom-controls button:hover {
  background: rgba(50, 50, 55, 0.95);
}
</style>

