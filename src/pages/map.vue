<template>
  <div class="geojson-map">
    <div ref="mapContainer" class="map-container"></div>
    
    <!-- Legend Panel -->
    <div class="legend-panel">
      <div class="legend-header">
        <h3>Berlin Transit Map</h3>
        <div class="legend-meta">{{ metadata.lineCount }} lines</div>
      </div>
      
      <div class="legend-section">
        <div class="section-title" @click="toggleSection('sbahn')">
          <span>S-Bahn</span>
          <span class="toggle">{{ sections.sbahn ? '−' : '+' }}</span>
        </div>
        <div v-if="sections.sbahn" class="legend-items">
          <button
            v-for="line in sbahnLines"
            :key="line"
            @click="toggleLine(line)"
            class="line-btn"
            :class="{ active: enabledLines[line] }"
            :style="enabledLines[line] ? { backgroundColor: lineColors[line], borderColor: lineColors[line] } : {}"
          >{{ line }}</button>
        </div>
      </div>
      
      <div class="legend-section">
        <div class="section-title" @click="toggleSection('ubahn')">
          <span>U-Bahn</span>
          <span class="toggle">{{ sections.ubahn ? '−' : '+' }}</span>
        </div>
        <div v-if="sections.ubahn" class="legend-items">
          <button
            v-for="line in ubahnLines"
            :key="line"
            @click="toggleLine(line)"
            class="line-btn"
            :class="{ active: enabledLines[line] }"
            :style="enabledLines[line] ? { backgroundColor: lineColors[line], borderColor: lineColors[line] } : {}"
          >{{ line }}</button>
        </div>
      </div>
      
      <div class="legend-section">
        <div class="section-title" @click="toggleSection('regional')">
          <span>Regional</span>
          <span class="toggle">{{ sections.regional ? '−' : '+' }}</span>
        </div>
        <div v-if="sections.regional" class="legend-items">
          <button
            v-for="line in regionalLines"
            :key="line"
            @click="toggleLine(line)"
            class="line-btn small"
            :class="{ active: enabledLines[line] }"
            :style="enabledLines[line] ? { backgroundColor: lineColors[line] || '#666', borderColor: lineColors[line] || '#666' } : {}"
          >{{ line }}</button>
        </div>
      </div>
      
      <div class="legend-actions">
        <button @click="showAll" class="action-btn">Show All</button>
        <button @click="showNone" class="action-btn">Hide All</button>
      </div>
    </div>
    
    <!-- Zoom Controls -->
    <div class="zoom-controls">
      <button @click="zoomIn" class="zoom-btn">+</button>
      <button @click="zoomOut" class="zoom-btn">−</button>
      <button @click="resetView" class="zoom-btn">⌂</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, reactive, watch } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Types
interface LineData {
  name: string;
  product: string;
  color?: string;
  segments: Array<{
    id: string;
    name: string;
    coordinates: number[][][];
  }>;
}

interface TransitMapData {
  lines: Record<string, LineData>;
  stops: Record<string, any>;
  geojson: any;
  metadata: {
    fetchedAt: string;
    source: string;
    lineCount: number;
    stopCount: number;
  };
}

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
  'RE1': '#E62E12', 'RE2': '#E62E12', 'RE3': '#E62E12', 'RE4': '#E62E12',
  'RE5': '#E62E12', 'RE6': '#E62E12', 'RE7': '#E62E12', 'RE8': '#E62E12',
  'FEX': '#E62E12',
};

// Refs
const mapContainer = ref<HTMLElement | null>(null);
let map: L.Map | null = null;
let geoJsonLayer: L.GeoJSON | null = null;

// State
const transitData = ref<TransitMapData | null>(null);
const metadata = reactive({ lineCount: 0, stopCount: 0 });
const sections = reactive({ sbahn: true, ubahn: true, regional: false });
const enabledLines = reactive<Record<string, boolean>>({});

// Computed line lists
const sbahnLines = ref<string[]>([]);
const ubahnLines = ref<string[]>([]);
const regionalLines = ref<string[]>([]);

// Load GeoJSON data
async function loadTransitData() {
  try {
    const response = await fetch('/data/sbahn_map_data.json');
    if (!response.ok) throw new Error('Failed to load transit data');
    transitData.value = await response.json();
    
    if (transitData.value) {
      metadata.lineCount = transitData.value.metadata.lineCount;
      metadata.stopCount = transitData.value.metadata.stopCount;
      
      // Categorize lines
      const lines = Object.keys(transitData.value.lines);
      sbahnLines.value = lines.filter(l => l.startsWith('S')).sort();
      ubahnLines.value = lines.filter(l => l.startsWith('U')).sort();
      regionalLines.value = lines.filter(l => l.startsWith('R') || l === 'FEX').sort();
      
      // Enable all by default
      lines.forEach(line => {
        enabledLines[line] = true;
      });
      
      updateMap();
    }
  } catch (error) {
    console.error('Error loading transit data:', error);
  }
}

// Initialize Leaflet map
function initMap() {
  if (!mapContainer.value) return;
  
  // Create map centered on Berlin
  map = L.map(mapContainer.value, {
    center: [52.52, 13.405],
    zoom: 11,
    zoomControl: false,
  });
  
  // Add tile layer (dark style for contrast)
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 19,
  }).addTo(map);
  
  // Initialize GeoJSON layer
  geoJsonLayer = L.geoJSON(undefined, {
    style: (feature) => {
      const line = feature?.properties?.line || '';
      const color = lineColors[line] || feature?.properties?.color || '#888';
      return {
        color,
        weight: line.startsWith('U') ? 4 : line.startsWith('S') ? 3 : 2,
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round',
      };
    },
    onEachFeature: (feature, layer) => {
      const props = feature.properties || {};
      layer.bindTooltip(`<strong>${props.line}</strong><br>${props.segmentName || ''}`, {
        sticky: true,
        className: 'transit-tooltip'
      });
    },
  }).addTo(map);
  
  loadTransitData();
}

// Update map with current filter
function updateMap() {
  if (!geoJsonLayer || !transitData.value) return;
  
  geoJsonLayer.clearLayers();
  
  // Build filtered GeoJSON
  const features: any[] = [];
  
  for (const [lineName, line] of Object.entries(transitData.value.lines)) {
    if (!enabledLines[lineName]) continue;
    
    for (const segment of line.segments) {
      features.push({
        type: 'Feature',
        properties: {
          line: lineName,
          product: line.product,
          color: line.color || lineColors[lineName],
          segmentId: segment.id,
          segmentName: segment.name,
        },
        geometry: {
          type: 'MultiLineString',
          coordinates: segment.coordinates,
        },
      });
    }
  }
  
  geoJsonLayer.addData({
    type: 'FeatureCollection',
    features,
  } as any);
}

// Watch for filter changes
watch(enabledLines, updateMap, { deep: true });

// Toggle functions
function toggleLine(line: string) {
  enabledLines[line] = !enabledLines[line];
}

function toggleSection(section: 'sbahn' | 'ubahn' | 'regional') {
  sections[section] = !sections[section];
}

function showAll() {
  Object.keys(enabledLines).forEach(line => {
    enabledLines[line] = true;
  });
}

function showNone() {
  Object.keys(enabledLines).forEach(line => {
    enabledLines[line] = false;
  });
}

// Zoom controls
function zoomIn() {
  map?.zoomIn();
}

function zoomOut() {
  map?.zoomOut();
}

function resetView() {
  map?.setView([52.52, 13.405], 11);
}

// Lifecycle
onMounted(() => {
  initMap();
});

onUnmounted(() => {
  map?.remove();
});
</script>

<style scoped>
.geojson-map {
  width: 100vw;
  height: 100vh;
  position: relative;
  overflow: hidden;
}

.map-container {
  width: 100%;
  height: 100%;
}

.legend-panel {
  position: fixed;
  left: 16px;
  top: 16px;
  background: rgba(30, 30, 35, 0.95);
  border-radius: 12px;
  padding: 16px;
  color: #fff;
  font-family: 'Inter', -apple-system, sans-serif;
  z-index: 1000;
  box-shadow: 0 4px 20px rgba(0,0,0,0.3);
  max-height: calc(100vh - 100px);
  overflow-y: auto;
  min-width: 200px;
  max-width: 280px;
}

.legend-header {
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}

.legend-header h3 {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 700;
}

.legend-meta {
  font-size: 12px;
  color: rgba(255,255,255,0.5);
}

.legend-section {
  margin-bottom: 12px;
}

.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  font-weight: 600;
  color: rgba(255,255,255,0.8);
  cursor: pointer;
  padding: 6px 0;
  user-select: none;
}

.section-title:hover {
  color: #fff;
}

.toggle {
  font-size: 16px;
  font-weight: 400;
  color: rgba(255,255,255,0.5);
}

.legend-items {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.line-btn {
  padding: 4px 10px;
  border: 2px solid rgba(255,255,255,0.2);
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  background: transparent;
  color: rgba(255,255,255,0.5);
  transition: all 0.15s ease;
}

.line-btn.small {
  padding: 3px 6px;
  font-size: 10px;
}

.line-btn.active {
  color: #fff;
  border-color: transparent;
}

.line-btn:hover {
  border-color: rgba(255,255,255,0.4);
}

.legend-actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid rgba(255,255,255,0.1);
}

.action-btn {
  flex: 1;
  padding: 8px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  background: rgba(255,255,255,0.1);
  color: #fff;
  transition: all 0.15s;
}

.action-btn:hover {
  background: rgba(255,255,255,0.2);
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

.zoom-btn {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 8px;
  font-size: 20px;
  font-weight: 400;
  cursor: pointer;
  background: rgba(30, 30, 35, 0.95);
  color: #fff;
  transition: all 0.2s;
  box-shadow: 0 2px 12px rgba(0,0,0,0.2);
}

.zoom-btn:hover {
  background: rgba(50, 50, 55, 0.95);
}

/* Custom tooltip */
:deep(.transit-tooltip) {
  background: rgba(30, 30, 35, 0.95);
  border: none;
  border-radius: 6px;
  color: #fff;
  font-family: 'Inter', -apple-system, sans-serif;
  font-size: 12px;
  padding: 8px 10px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.3);
}

:deep(.transit-tooltip::before) {
  border-top-color: rgba(30, 30, 35, 0.95);
}

/* Hide default Leaflet attribution on mobile */
@media (max-width: 600px) {
  .legend-panel {
    left: 8px;
    top: 8px;
    padding: 12px;
    max-width: 220px;
  }
}
</style>
