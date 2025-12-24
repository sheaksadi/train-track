<template>
  <div class="w-full h-full relative">
    <l-map
      ref="map"
      v-model:zoom="zoom"
      :center="center"
      :use-global-leaflet="false"
      class="w-full h-full"
    >
      <l-tile-layer
        :url="mapStyles[currentMapStyle]"
        layer-type="base"
        :name="currentMapStyle"
        attribution="&copy; OpenStreetMap contributors"
      ></l-tile-layer>

      <!-- All Line Polylines (U-Bahn + Regional) -->
      <l-polyline
        v-for="line in visibleLines"
        :key="line.name"
        :lat-lngs="line.route"
        :color="line.color"
        :weight="line.name.startsWith('RE') ? 4 : 6"
        :opacity="0.85"
        :dash-array="line.name.startsWith('RE') ? '10, 5' : null"
      >
        <l-popup>{{ line.name }}</l-popup>
      </l-polyline>

      <!-- All Station Markers -->
      <l-circle-marker
        v-for="station in visibleStations"
        :key="station.id"
        :lat-lng="[station.lat, station.lng]"
        :radius="6"
        :color="'#fff'"
        :fill-color="getStationColor(station)"
        :fill-opacity="1"
        :weight="2"
      >
        <l-tooltip :options="{ permanent: false, direction: 'top', offset: [0, -5] }">
          {{ station.name }}
        </l-tooltip>
        <l-popup>
          <div class="station-popup">
            <strong>{{ station.name }}</strong>
            <div class="lines">
              <span
                v-for="line in station.lines.filter(l => enabledLines[l])"
                :key="line"
                class="line-badge"
                :style="{ backgroundColor: getLineColor(line) }"
              >{{ line }}</span>
            </div>
          </div>
        </l-popup>
      </l-circle-marker>
      
      <!-- Real-time Train Markers -->
      <l-circle-marker
        v-for="train in visibleTrains"
        :key="train.tripId"
        :lat-lng="[train.displayLat, train.displayLng]"
        :radius="12"
        :color="'#fff'"
        :fill-color="getLineColor(train.lineName)"
        :fill-opacity="1"
        :weight="4"
        :class-name="'train-marker-circle'"
      >
        <l-tooltip :options="{ permanent: false, direction: 'top', offset: [0, -12], className: 'train-tooltip-container' }">
          <div class="tooltip-content">
            <div class="tooltip-header" :style="{ backgroundColor: getLineColor(train.lineName) }">
              {{ train.lineName }}
            </div>
            <div class="tooltip-body">
              <p class="direction">→ {{ train.direction }}</p>
              <p v-if="train.delay > 0" class="delay">+{{ Math.round(train.delay / 60) }} min delay</p>
              <p v-else class="on-time">On time</p>
            </div>
          </div>
        </l-tooltip>
        <l-popup>
          <div class="popup-content">
            <div class="popup-header" :style="{ backgroundColor: getLineColor(train.lineName) }">
              {{ train.lineName }}
            </div>
            <div class="popup-body">
              <p class="direction">→ {{ train.direction }}</p>
              <p v-if="train.delay > 0" class="delay">+{{ Math.round(train.delay / 60) }} min delay</p>
              <p v-else class="on-time">On time</p>
            </div>
          </div>
        </l-popup>
      </l-circle-marker>
    </l-map>
    
    <!-- Map Style Toggle -->
    <div class="map-style-toggle">
      <button 
        v-for="style in Object.keys(mapStyles)" 
        :key="style"
        @click="currentMapStyle = style"
        :class="{ active: currentMapStyle === style }"
        class="map-style-btn"
      >{{ style }}</button>
    </div>
    
    <!-- Legend with toggles -->
    <div class="legend">
      <div class="legend-title">Train Lines</div>
      <!-- Regional trains section -->
      <div class="legend-section">Regional</div>
      <div
        v-for="(color, line) in regionalColors"
        :key="line"
        class="legend-item"
        @click="toggleLine(line)"
        :class="{ disabled: !enabledLines[line] }"
      >
        <span class="legend-color" :style="{ backgroundColor: color }"></span>
        <span class="legend-label">{{ line }}</span>
        <span class="toggle-indicator">{{ enabledLines[line] ? '✓' : '' }}</span>
      </div>
      <!-- U-Bahn section -->
      <div class="legend-section">U-Bahn</div>
      <div
        v-for="(color, line) in ubahnColors"
        :key="line"
        class="legend-item"
        @click="toggleLine(line)"
        :class="{ disabled: !enabledLines[line] }"
      >
        <span class="legend-color" :style="{ backgroundColor: color }"></span>
        <span class="legend-label">{{ line }}</span>
        <span class="toggle-indicator">{{ enabledLines[line] ? '✓' : '' }}</span>
      </div>
      <div class="legend-actions">
        <button @click="showAll" class="legend-btn">All</button>
        <button @click="showNone" class="legend-btn">None</button>
      </div>
    </div>
    
    <!-- Status bar -->
    <div class="status-bar">
      <span v-if="loading" class="loading-spinner">⟳</span>
      <span>🚂 {{ visibleTrains.length }} trains visible • {{ lastUpdate }}</span>
    </div>
  </div>
</template>

<script setup>
import "leaflet/dist/leaflet.css";
import { LMap, LTileLayer, LMarker, LPopup, LIcon, LPolyline, LCircleMarker, LTooltip } from "@vue-leaflet/vue-leaflet";
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import { ubahnColors, ubahnStations, getLineRoute } from '~/data/ubahn';
import { regionalColors, re1Stations, getRE1Route } from '~/data/regional';

// Combine all line colors
const allLineColors = { ...ubahnColors, ...regionalColors };

const zoom = ref(8);  // Zoom out to see full RE1 route
const center = ref([52.40, 13.10]);  // Center on Berlin area

// Map tile layers
const mapStyles = {
  'Street': 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  'Terrain': 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
  'Dark': 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png',
  'Transport': 'https://tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey=6170aad10dfd42a38d4d8c709a536f38'
};
const currentMapStyle = ref('Street');

// Line toggle state - U5 and RE1 enabled by default
const enabledLines = reactive(
  Object.keys(allLineColors).reduce((acc, line) => {
    acc[line] = line === 'U5' || line === 'RE1';
    return acc;
  }, {})
);

const trains = ref([]);
const loading = ref(false);
const lastUpdate = ref('--:--:--');
let refreshInterval = null;

// Cache line routes for snapping (U-Bahn + Regional)
const lineRoutes = computed(() => {
  const routes = {};
  // U-Bahn routes
  Object.keys(ubahnColors).forEach(lineName => {
    routes[lineName] = getLineRoute(lineName);
  });
  // RE1 route
  routes['RE1'] = getRE1Route();
  return routes;
});

// Helper: Calculate distance between two points
function distance(lat1, lng1, lat2, lng2) {
  const dLat = lat2 - lat1;
  const dLng = lng2 - lng1;
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

// Helper: Find closest point on a line segment to a given point
function closestPointOnSegment(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;
  
  const ab2 = abx * abx + aby * aby;
  if (ab2 === 0) return { lat: ax, lng: ay, dist: distance(px, py, ax, ay) };
  
  let t = (apx * abx + apy * aby) / ab2;
  t = Math.max(0, Math.min(1, t));
  
  const closestLat = ax + t * abx;
  const closestLng = ay + t * aby;
  const dist = distance(px, py, closestLat, closestLng);
  
  return { lat: closestLat, lng: closestLng, dist };
}

// Helper: Find closest point on entire polyline
function snapToLine(trainLat, trainLng, route) {
  if (!route || route.length < 2) {
    return { lat: trainLat, lng: trainLng };
  }
  
  let closestPoint = { lat: trainLat, lng: trainLng, dist: Infinity };
  
  for (let i = 0; i < route.length - 1; i++) {
    const [aLat, aLng] = route[i];
    const [bLat, bLng] = route[i + 1];
    
    const point = closestPointOnSegment(trainLat, trainLng, aLat, aLng, bLat, bLng);
    
    if (point.dist < closestPoint.dist) {
      closestPoint = point;
    }
  }
  
  return { lat: closestPoint.lat, lng: closestPoint.lng };
}

// Compute visible lines (U-Bahn + Regional)
const visibleLines = computed(() => {
  const lines = [];
  
  // Add U-Bahn lines
  Object.entries(ubahnColors).forEach(([name, color]) => {
    if (enabledLines[name]) {
      const route = getLineRoute(name);
      if (route.length > 0) {
        lines.push({ name, color, route });
      }
    }
  });
  
  // Add RE1 if enabled
  if (enabledLines['RE1']) {
    lines.push({
      name: 'RE1',
      color: regionalColors['RE1'],
      route: getRE1Route()
    });
  }
  
  return lines;
});

// Visible stations (U-Bahn + Regional, only for enabled lines)
const visibleStations = computed(() => {
  const seen = new Set();
  const allStations = [...ubahnStations, ...re1Stations];
  
  return allStations.filter(s => {
    const hasEnabledLine = s.lines.some(l => enabledLines[l]);
    if (!hasEnabledLine) return false;
    
    const key = `${s.lat.toFixed(4)}-${s.lng.toFixed(4)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
});

// Visible trains (only for enabled lines) - with position snapped to tracks
const visibleTrains = computed(() => {
  return trains.value
    .filter(t => enabledLines[t.lineName])
    .map(t => {
      const route = lineRoutes.value[t.lineName];
      const snappedPos = snapToLine(t.latitude, t.longitude, route);
      return {
        ...t,
        displayLat: snappedPos.lat,
        displayLng: snappedPos.lng,
        originalLat: t.latitude,
        originalLng: t.longitude
      };
    });
});

function toggleLine(line) {
  enabledLines[line] = !enabledLines[line];
}

function showAll() {
  Object.keys(enabledLines).forEach(l => enabledLines[l] = true);
}

function showNone() {
  Object.keys(enabledLines).forEach(l => enabledLines[l] = false);
}

function getLineColor(lineName) {
  return allLineColors[lineName] || '#888';
}

function getStationColor(station) {
  const enabledStationLines = station.lines.filter(l => enabledLines[l]);
  return enabledStationLines.length > 0 ? ubahnColors[enabledStationLines[0]] : '#888';
}

// Shorten long direction names for display on train icon
function getShortDirection(direction) {
  if (!direction) return '?';
  // Take first word or abbreviate long names
  const parts = direction.split(/[\s,]+/);
  if (parts[0].length <= 10) return parts[0];
  return parts[0].substring(0, 8) + '...';
}

// Store previous positions for smooth animation
const previousPositions = ref({});

async function fetchTrains() {
  try {
    loading.value = true;
    const response = await fetch('/api/u5-positions');
    const data = await response.json();
    
    // Store previous positions before updating
    trains.value.forEach(t => {
      previousPositions.value[t.tripId] = {
        lat: t.latitude,
        lng: t.longitude
      };
    });
    
    trains.value = data.trains;
    lastUpdate.value = new Date(data.timestamp).toLocaleTimeString('de-DE');
  } catch (error) {
    console.error('Failed to fetch trains:', error);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  fetchTrains();
  refreshInterval = setInterval(fetchTrains, 5000);
});

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
});
</script>

<style scoped>
/* Map Style Toggle */
.map-style-toggle {
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  display: flex;
  gap: 2px;
  background: white;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  overflow: hidden;
}

.map-style-btn {
  padding: 6px 12px;
  border: none;
  background: #f5f5f5;
  cursor: pointer;
  font-size: 12px;
  transition: background 0.2s;
}

.map-style-btn:hover {
  background: #e0e0e0;
}

.map-style-btn.active {
  background: #333;
  color: white;
}

/* Train markers are larger circles with thicker borders than stations */
/* Stations: radius 6, weight 2 */
/* Trains: radius 12, weight 4 */

/* Train Tooltip - rich content like popup */
.tooltip-content {
  min-width: 160px;
  overflow: hidden;
  border-radius: 6px;
}

.tooltip-header {
  color: white;
  font-size: 14px;
  font-weight: bold;
  padding: 6px 10px;
  text-align: center;
}

.tooltip-body {
  padding: 8px 10px;
  background: white;
}

.tooltip-body .direction {
  font-size: 12px;
  margin: 0 0 4px 0;
  color: #333;
}

.tooltip-body .delay {
  color: #e74c3c;
  font-weight: bold;
  font-size: 11px;
  margin: 0;
}

.tooltip-body .on-time {
  color: #27ae60;
  font-weight: bold;
  font-size: 11px;
  margin: 0;
}

/* Leaflet marker smooth transition */
:deep(.leaflet-marker-icon) {
  transition: transform 0.5s ease-out;
}

.legend {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(255,255,255,0.95);
  padding: 12px;
  border-radius: 8px;
  z-index: 1000;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  font-size: 13px;
  min-width: 120px;
}

.legend-title {
  font-weight: bold;
  margin-bottom: 8px;
  font-size: 14px;
  border-bottom: 1px solid #ddd;
  padding-bottom: 6px;
}

.legend-section {
  font-size: 11px;
  font-weight: 600;
  color: #666;
  margin-top: 8px;
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 6px;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.2s;
}

.legend-item:hover {
  background: #f0f0f0;
}

.legend-item.disabled {
  opacity: 0.4;
}

.legend-item.disabled .legend-color {
  background: #ccc !important;
}

.legend-color {
  width: 24px;
  height: 6px;
  border-radius: 3px;
  flex-shrink: 0;
}

.legend-label {
  flex: 1;
}

.toggle-indicator {
  width: 16px;
  text-align: center;
  color: #2ecc71;
  font-weight: bold;
}

.legend-actions {
  display: flex;
  gap: 4px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #ddd;
}

.legend-btn {
  flex: 1;
  padding: 4px 8px;
  border: 1px solid #ddd;
  background: #f5f5f5;
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
}

.legend-btn:hover {
  background: #e0e0e0;
}

.status-bar {
  position: absolute;
  bottom: 10px;
  left: 10px;
  background: rgba(0,0,0,0.85);
  color: white;
  padding: 10px 18px;
  border-radius: 8px;
  font-size: 13px;
  z-index: 1000;
  display: flex;
  gap: 8px;
  align-items: center;
  backdrop-filter: blur(4px);
}

.station-popup {
  min-width: 100px;
}

.station-popup .lines {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
}

.line-badge {
  color: white;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: bold;
}

/* Train Popup Styles */
.popup-content {
  min-width: 180px;
  overflow: hidden;
  border-radius: 6px;
  margin: -13px -20px -13px -13px;
}

.popup-header {
  color: white;
  font-size: 18px;
  font-weight: bold;
  padding: 10px 14px;
  text-align: center;
}

.popup-body {
  padding: 10px 14px;
  background: white;
}

.popup-body .direction {
  font-size: 13px;
  margin: 0 0 6px 0;
  color: #333;
}

.popup-body .next-stop {
  font-size: 12px;
  margin: 0 0 6px 0;
  color: #666;
}

.popup-body .delay {
  color: #e74c3c;
  font-weight: bold;
  font-size: 12px;
  margin: 0;
}

.popup-body .on-time {
  color: #27ae60;
  font-weight: bold;
  font-size: 12px;
  margin: 0;
}
</style>
