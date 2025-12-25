<template>
  <div class="transit-map-root">
    <div ref="canvasContainer" class="canvas-container"></div>
    
    <!-- Info Panel - Terminal Style -->
    <div 
      v-if="mapStore.infoPanel.visible" 
      class="info-panel"
      :style="{ left: mapStore.infoPanel.x + 'px', top: mapStore.infoPanel.y + 'px', borderLeftColor: mapStore.infoPanel.color }"
    >
      <div class="info-header">{{ mapStore.infoPanel.title }}</div>
      <div class="info-body">
        <div v-if="mapStore.infoPanel.type === 'station'">
          <div class="info-lines">Lines: {{ mapStore.infoPanel.lines }}</div>
          <div v-if="mapStore.infoPanel.loading" class="info-loading">Loading...</div>
          <div v-else class="departures-container">
            <div class="info-label">Next departures:</div>
            <!-- Grid of collapsible transport type cards (Split Columns) -->
            <div class="transport-grid">
              <!-- Column 1 -->
              <div class="grid-column left">
                <div 
                  v-for="item in splitDepartures.left" 
                  :key="item.key" 
                  class="transport-card"
                  :class="{ collapsed: collapsedCategories[item.key] }"
                >
                  <div class="transport-header" @click="toggleCategory(item.key)">
                    <span class="transport-name">{{ item.key }}</span>
                    <span class="transport-count">{{ item.data.length }}</span>
                    <span class="transport-toggle">{{ collapsedCategories[item.key] ? '[+]' : '[-]' }}</span>
                  </div>
                  <div v-if="!collapsedCategories[item.key]" class="transport-deps">
                    <div v-for="(dep, i) in item.data" :key="i" class="departure-row">
                      <span class="dep-line" :style="{ backgroundColor: dep.color }">{{ dep.line }}</span>
                      <span class="dep-dest">→ {{ dep.destination }}</span>
                      <span class="dep-time" :class="{ delay: dep.delay > 0 }">{{ dep.delay > 0 ? `+${dep.delay}m` : dep.time }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Column 2 (Only if needed) -->
              <div v-if="splitDepartures.right.length > 0" class="grid-column right">
                 <div 
                  v-for="item in splitDepartures.right" 
                  :key="item.key" 
                  class="transport-card"
                  :class="{ collapsed: collapsedCategories[item.key] }"
                >
                  <div class="transport-header" @click="toggleCategory(item.key)">
                    <span class="transport-name">{{ item.key }}</span>
                    <span class="transport-count">{{ item.data.length }}</span>
                    <span class="transport-toggle">{{ collapsedCategories[item.key] ? '[+]' : '[-]' }}</span>
                  </div>
                  <div v-if="!collapsedCategories[item.key]" class="transport-deps">
                    <div v-for="(dep, i) in item.data" :key="i" class="departure-row">
                      <span class="dep-line" :style="{ backgroundColor: dep.color }">{{ dep.line }}</span>
                      <span class="dep-dest">→ {{ dep.destination }}</span>
                      <span class="dep-time" :class="{ delay: dep.delay > 0 }">{{ dep.delay > 0 ? `+${dep.delay}m` : dep.time }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div v-if="Object.keys(mapStore.infoPanel.grouped).length === 0" class="no-deps">No departures</div>
          </div>
        </div>
        <div v-else-if="mapStore.infoPanel.type === 'train'" class="train-info">
          <div class="train-line" :style="{ backgroundColor: mapStore.infoPanel.color }">{{ mapStore.infoPanel.title }}</div>
          <div class="train-row">→ {{ mapStore.infoPanel.direction }}</div>
          <div class="train-row">Platform: {{ Math.floor(Math.random() * 4 + 1) }}</div>
          <div class="train-row" :class="{ delay: mapStore.infoPanel.delay > 0 }">
            {{ mapStore.infoPanel.delay > 0 ? `+${mapStore.infoPanel.delay} min` : 'On time' }}
          </div>
        </div>
      </div>
    </div>
    
    <!-- Legend - Terminal Style (Collapsible Sections) -->
    <div class="legend">
      <div class="legend-title">LINES</div>
      
      <!-- Legend: Regional -->
      <div class="mb-4">
        <button 
          @click="toggleLegendSection('regional')" 
          class="flex items-center justify-between w-full text-left font-bold text-gray-300 mb-2 text-sm hover:text-white transition-colors"
        >
          <span>REGIONAL</span>
          <Icon :name="collapsedLegend['regional'] ? 'i-heroicons-chevron-down' : 'i-heroicons-chevron-up'" class="w-4 h-4" />
        </button>
        <div v-show="!collapsedLegend['regional']" class="grid grid-cols-4 gap-2">
          <button
            v-for="(color, line) in regionalColors"
            :key="line"
            @click="transitStore.toggleLine(line as string)"
            :class="[
              'px-2 py-1 rounded text-xs font-bold transition-all duration-200 border border-transparent shadow-sm',
              transitStore.enabledLines[line as string] 
                ? 'bg-red-600 text-white shadow-red-900/50' 
                : 'bg-gray-800/50 text-gray-500 hover:bg-gray-700 hover:text-gray-300'
            ]"
            :style="transitStore.enabledLines[line as string] ? { backgroundColor: color, borderColor: color } : {}"
          >
            {{ line }}
          </button>
        </div>
      </div>

      <!-- Legend: S-Bahn -->
      <div class="mb-4">
        <button 
          @click="toggleLegendSection('sbahn')" 
          class="flex items-center justify-between w-full text-left font-bold text-gray-300 mb-2 text-sm hover:text-white transition-colors"
        >
          <span>S-BAHN</span>
          <Icon :name="collapsedLegend['sbahn'] ? 'i-heroicons-chevron-down' : 'i-heroicons-chevron-up'" class="w-4 h-4" />
        </button>
        <div v-show="!collapsedLegend['sbahn']" class="grid grid-cols-4 gap-2">
          <button
            v-for="(color, line) in sbahnColors"
            :key="line"
            @click="transitStore.toggleLine(line as string)"
            :class="[
              'px-2 py-1 rounded text-xs font-bold transition-all duration-200 border border-transparent shadow-sm',
              transitStore.enabledLines[line as string] 
                ? 'bg-green-600 text-white shadow-green-900/50' 
                : 'bg-gray-800/50 text-gray-500 hover:bg-gray-700 hover:text-gray-300'
            ]"
            :style="transitStore.enabledLines[line as string] ? { backgroundColor: color, borderColor: color } : {}"
          >
            {{ line }}
          </button>
        </div>
      </div>

      <!-- Legend: Trams -->
      <div class="mb-4">
        <button 
          @click="toggleLegendSection('tram')" 
          class="flex items-center justify-between w-full text-left font-bold text-gray-300 mb-2 text-sm hover:text-white transition-colors"
        >
          <span>TRAM</span>
          <Icon :name="collapsedLegend['tram'] ? 'i-heroicons-chevron-down' : 'i-heroicons-chevron-up'" class="w-4 h-4" />
        </button>
        <div v-show="!collapsedLegend['tram']" class="grid grid-cols-4 gap-2">
          <button
            v-for="(color, line) in tramColors"
            :key="line"
            @click="transitStore.toggleLine(line as string)"
            :class="[
              'px-2 py-1 rounded text-xs font-bold transition-all duration-200 border border-transparent shadow-sm',
              transitStore.enabledLines[line as string] 
                ? 'bg-yellow-600 text-white shadow-yellow-900/50' 
                : 'bg-gray-800/50 text-gray-500 hover:bg-gray-700 hover:text-gray-300'
            ]"
            :style="transitStore.enabledLines[line as string] ? { backgroundColor: color, borderColor: color } : {}"
          >
            {{ line }}
          </button>
        </div>
      </div> 
      
      <!-- U-Bahn Section -->
      <div 
        class="legend-section" 
        @click="toggleLegendSection('ubahn')"
      >
        <span>U-Bahn</span>
        <span class="section-toggle">{{ collapsedLegend['ubahn'] ? '[+]' : '[-]' }}</span>
      </div>
      <div v-if="!collapsedLegend['ubahn']" class="legend-list">
        <div
          v-for="(color, line) in ubahnColors"
          :key="line"
          class="legend-item"
          @click="transitStore.toggleLine(line as string)"
          :class="{ disabled: !transitStore.enabledLines[line as string] }"
        >
          <span class="legend-color" :style="{ backgroundColor: color }"></span>
          <span class="legend-label">{{ line }}</span>
          <span class="toggle-indicator">{{ transitStore.enabledLines[line as string] ? '[x]' : '[ ]' }}</span>
        </div>
      </div>
      
      <div class="legend-actions">
        <button @click="transitStore.showAll(); updateVisibility()" class="legend-btn">[All]</button>
        <button @click="transitStore.showNone(); updateVisibility()" class="legend-btn">[None]</button>
      </div>
    </div>
    
    <!-- Rate Monitor - Top Left -->
    <div class="rate-monitor">
      <div class="rate-header">
        <div class="rate-title">API RATE</div>
        <button class="refresh-btn" @click="handleManualRefresh" :disabled="isRefreshing" :title="'Refresh trains'">
          <span :class="{ 'spin': isRefreshing }">↻</span>
        </button>
      </div>
      <div class="rate-stats">
        <span :class="{ warning: apiStore.isWarning, danger: apiStore.isDanger }">
          {{ apiStore.requestsPerMin }}/100 req/min
        </span>
      </div>
      <div class="rate-interval">refresh: {{ (apiStore.refreshInterval / 1000).toFixed(1) }}s</div>
      <div v-if="apiStore.blockedRequests > 0" class="rate-blocked">
        ⚠ {{ apiStore.blockedRequests }} blocked
      </div>
    </div>
    
    <!-- Status bar - Terminal Style -->
    <div class="status-bar">
      <span v-if="transitStore.loading || apiStore.departuresLoading" class="loading">█</span>
      <span>trains: {{ transitStore.trainCount }} | zoom: {{ Math.round(mapStore.currentZoom * 100) }}%</span>
      <span v-if="apiStore.departuresLoading" class="loading-text"> | loading departures...</span>
      <!-- Refresh progress bar at bottom -->
      <div class="refresh-progress">
        <div class="refresh-progress-bar" :style="{ width: refreshProgress + '%' }"></div>
      </div>
    </div>
    
    <!-- Zoom controls -->
    <div class="zoom-controls">
      <button @click="handleZoomIn" class="zoom-btn">[+]</button>
      <button @click="handleZoomOut" class="zoom-btn">[-]</button>
      <button @click="handleResetView" class="zoom-btn">[R]</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import * as THREE from 'three';
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { ubahnColors } from '~/data/ubahn';
import { regionalColors } from '~/data/regional';
import { sbahnColors } from '~/data/sbahn';
import { tramColors } from '~/data/tram';
import { majorCities } from '~/data/cities';
import { useTransitStore, latLngToScene, allLineColors, LINE_THICKNESS, BG_LINE_THICKNESS, STATION_RADIUS, BG_STATION_RADIUS, TRAIN_SIZE } from '~/stores/transitStore';
import { useMapStore } from '~/stores/mapStore';

// Stores
const transitStore = useTransitStore();
const mapStore = useMapStore();

// Collapsible categories state (departures panel)
const collapsedCategories = ref<Record<string, boolean>>({});

function toggleCategory(category: string) {
  collapsedCategories.value[category] = !collapsedCategories.value[category];
}

// Compute split columns for layout (Left: 0,1, 4,5... Right: 2,3, 6,7...)
const splitDepartures = computed(() => {
  const grouped = mapStore.infoPanel.grouped || {};
  const keys = Object.keys(grouped);
  const left: { key: string; data: any[] }[] = [];
  const right: { key: string; data: any[] }[] = [];

  keys.forEach((key, index) => {
    // Pair index: 0 for items 0,1; 1 for items 2,3; etc.
    const pairIndex = Math.floor(index / 2);
    // Even pairs go Left, Odd pairs go Right
    if (pairIndex % 2 === 0) {
      left.push({ key, data: grouped[key] });
    } else {
      right.push({ key, data: grouped[key] });
    }
  });

  // Check if all items in the right column are collapsed
  const allRightCollapsed = right.every(item => collapsedCategories.value[item.key]);

  // If all right items are collapsed, move them to the bottom of the left column
  if (right.length > 0 && allRightCollapsed) {
    left.push(...right);
    return { left, right: [] };
  }

  return { left, right };
});

// Collapsible legend sections
const collapsedLegend = ref<Record<string, boolean>>({});

function toggleLegendSection(section: string) {
  collapsedLegend.value[section] = !collapsedLegend.value[section];
}

// API Store for rate limiting
import { useApiStore, startApiMonitoring, stopApiMonitoring } from '~/stores/apiStore';
const apiStore = useApiStore();

// Refresh interval management
let refreshIntervalId: ReturnType<typeof setInterval> | null = null;
let progressIntervalId: ReturnType<typeof setInterval> | null = null;

// Refresh progress tracking
const lastRefreshTime = ref(Date.now());
const refreshProgress = ref(100);
const isRefreshing = ref(false);

function updateRefreshProgress() {
  const elapsed = Date.now() - lastRefreshTime.value;
  const interval = apiStore.refreshInterval;
  const remaining = Math.max(0, interval - elapsed);
  refreshProgress.value = Math.round((remaining / interval) * 100);
}

function restartRefreshInterval() {
  if (refreshIntervalId) clearInterval(refreshIntervalId);
  if (progressIntervalId) clearInterval(progressIntervalId);
  
  lastRefreshTime.value = Date.now();
  refreshProgress.value = 100;
  
  refreshIntervalId = setInterval(() => {
    lastRefreshTime.value = Date.now();
    refreshProgress.value = 100;
    transitStore.fetchTrains().then(updateTrainMarkers);
  }, apiStore.refreshInterval);
  
  // Update progress bar more frequently
  progressIntervalId = setInterval(updateRefreshProgress, 100);
}

async function handleManualRefresh() {
  if (isRefreshing.value) return;
  
  isRefreshing.value = true;
  lastRefreshTime.value = Date.now();
  refreshProgress.value = 100;
  
  try {
    await transitStore.fetchTrains();
    updateTrainMarkers();
  } finally {
    isRefreshing.value = false;
  }
  
  // Restart the interval from now
  restartRefreshInterval();
}

// Watch for refresh interval changes
watch(() => apiStore.refreshInterval, () => {
  restartRefreshInterval();
});

// Auto-refresh for station info panel
let stationRefreshInterval: ReturnType<typeof setInterval> | null = null;

watch(
  [() => mapStore.infoPanel.visible, () => mapStore.infoPanel.title, () => mapStore.infoPanel.type],
  ([visible, title, type]) => {
    // Clear existing interval
    if (stationRefreshInterval) {
      clearInterval(stationRefreshInterval);
      stationRefreshInterval = null;
    }

    // Start new interval if panel is visible and is a station
    if (visible && type === 'station' && title) {
      stationRefreshInterval = setInterval(() => {
        if (mapStore.infoPanel.visible && mapStore.infoPanel.type === 'station') {
          // No need to show loading state for auto-refresh
          transitStore.fetchDepartures(title); 
        }
      }, 10000); // 10 seconds refresh for open panel
    }
  },
  { immediate: true }
);

// Clean up station refresh on unmount
onUnmounted(() => {
  if (stationRefreshInterval) clearInterval(stationRefreshInterval);
  if (refreshIntervalId) clearInterval(refreshIntervalId);
  if (progressIntervalId) clearInterval(progressIntervalId);
});

// Refs
const canvasContainer = ref<HTMLElement | null>(null);

// Three.js objects
let scene: THREE.Scene;
let camera: THREE.OrthographicCamera;
let renderer: THREE.WebGLRenderer;
let animationId: number;
let raycaster: THREE.Raycaster;
let mouse: THREE.Vector2;

// Groups
let backgroundLinesGroup: THREE.Group;
let activeLinesGroup: THREE.Group;
let stationsGroup: THREE.Group;
let trainsGroup: THREE.Group;
let labelsGroup: THREE.Group;
let mapGroup: THREE.Group;
let statesGroup: THREE.Group;
let citiesGroup: THREE.Group;

// Hover tracking
let hoveredObject: THREE.Object3D | null = null;
let prefetchTimeout: ReturnType<typeof setTimeout> | null = null;
let hoverShowTimeout: ReturnType<typeof setTimeout> | null = null;
const HOVER_DELAY_MS = 300; // Time to hover before showing info

// Watch for line toggle
watch(() => transitStore.enabledLines, () => {
  updateVisibility();
}, { deep: true });

async function initThreeJS() {
  const container = canvasContainer.value;
  if (!container) return;

  const width = container.clientWidth;
  const height = container.clientHeight;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e);

  // Groups
  backgroundLinesGroup = new THREE.Group();
  activeLinesGroup = new THREE.Group();
  stationsGroup = new THREE.Group();
  trainsGroup = new THREE.Group();
  labelsGroup = new THREE.Group();
  mapGroup = new THREE.Group();
  statesGroup = new THREE.Group();
  citiesGroup = new THREE.Group();

  scene.add(statesGroup); // States at bottom
  scene.add(mapGroup);    // Districts
  scene.add(backgroundLinesGroup);
  scene.add(activeLinesGroup);
  scene.add(trainsGroup);
  scene.add(stationsGroup);
  scene.add(labelsGroup);
  scene.add(citiesGroup); // Cities on top

  const aspect = width / height;
  const viewSize = 350; // Increased view size for Germany
  camera = new THREE.OrthographicCamera(-viewSize * aspect, viewSize * aspect, viewSize, -viewSize, 0.1, 1000);
  camera.position.z = 100;

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  raycaster = new THREE.Raycaster();
  raycaster.params.Mesh = { threshold: 2 };
  mouse = new THREE.Vector2();

  // Load Map Data
  loadGeoJSON('/data/germany_outline.geojson', 0x111111, 'outline', mapGroup, 4); // Thicker outline
  loadGeoJSON('/data/germany_states.geojson', 0x444466, 'state', statesGroup, 1.5);
  loadGeoJSON('/data/germany_districts.geojson', 0x333344, 'district', mapGroup, 0.5);

  // ...

  addTransitLines();
  // transitStore.buildLineRoutes(); // Moved to loadGeneratedStations to ensure coords are ready
  await loadGeneratedStations(); // Populates stationDataMap and store routes
  mergeStaticStations();         // Merges static data into stationDataMap
  renderStations();              // Draws all merged stations
  addStationLabels();            // Updates labels
  updateVisibility();

  // Events
  renderer.domElement.addEventListener('wheel', onWheel, { passive: false });
  renderer.domElement.addEventListener('mousedown', onMouseDown);
  renderer.domElement.addEventListener('mousemove', onMouseMove);
  renderer.domElement.addEventListener('mouseup', onMouseUp);
  renderer.domElement.addEventListener('mouseleave', onMouseLeave);
  renderer.domElement.addEventListener('click', onClick);
  renderer.domElement.style.cursor = 'grab';
  window.addEventListener('resize', onResize);

  animate();
}

function addCities() {
  majorCities.forEach(city => {
    const { x, y } = latLngToScene(city.lat, city.lng);
    
    // City Dot
    const dotGeom = new THREE.CircleGeometry(2, 16);
    const dotMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const dot = new THREE.Mesh(dotGeom, dotMat);
    dot.position.set(x, y, 10);
    citiesGroup.add(dot);

    // City Label
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = 256;
    canvas.height = 64;
    ctx.font = 'bold 36px Inter, Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 4;
    ctx.fillText(city.name.toUpperCase(), canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(30, 7.5, 1);
    sprite.position.set(x, y + 5, 10);
    citiesGroup.add(sprite);
  });
}

function updateVisibility() {
  const zoom = mapStore.currentZoom;
  const showDistricts = zoom > 0.8;
  const showTracksAndStations = zoom > 0.3; // Show tracks much earlier
  
  // Toggle Map Layers
  statesGroup.visible = true; // Always keep states as base? Or fade? Keep for now.
  mapGroup.visible = showDistricts; 
  citiesGroup.visible = !showDistricts; // Hide simple city dots when detailed districts appear
  
  // Toggle Transit Layers
  backgroundLinesGroup.visible = showTracksAndStations;
  activeLinesGroup.visible = true; // Always visible (filtered by children)
  stationsGroup.visible = showTracksAndStations;
  trainsGroup.visible = true; // Always show trains
  
  // Update Child Visibility
  activeLinesGroup.children.forEach(child => {
    const name = child.userData.lineName;
    const isRegional = name.startsWith('RE') || name.startsWith('RB') || name === 'FEX';
    const isEnabled = transitStore.enabledLines[name] ?? false;
    
    // Regional always visible if enabled, others depend on zoom
    if (isRegional) {
        child.visible = isEnabled;
    } else {
        child.visible = isEnabled && showTracksAndStations;
    }
  });

  // Background lines visibility - NEW: Hide phantom tracks
  backgroundLinesGroup.children.forEach(child => {
      const name = child.userData.lineName;
      const isEnabled = transitStore.enabledLines[name] ?? false;
      child.visible = isEnabled && showTracksAndStations;
  });

  stationsGroup.children.forEach(child => {
    // Only show stations if zoomed in enough
    if (!showTracksAndStations) {
        child.visible = false;
        return;
    }
    
    const lines = child.userData.lines as string[];
    // Default hidden
    child.visible = false;

    if (lines && child.userData.isActive) {
      const hasActive = lines.some(l => transitStore.enabledLines[l]);
      if (hasActive) {
        child.visible = true;
         // Station fill color update
        if (child.userData.type === 'station-fill') {
           const activeLine = lines.find(l => transitStore.enabledLines[l]);
           if (activeLine) {
             (child as THREE.Mesh).material = new THREE.MeshBasicMaterial({ color: new THREE.Color(transitStore.getLineColor(activeLine)) });
           }
        }
      }
    }
  });

  // Station Labels logic
  labelsGroup.children.forEach(child => {
    const lines = child.userData.lines as string[];
    if (lines) child.visible = showTracksAndStations && lines.some(l => transitStore.enabledLines[l]) && zoom > 1.5;
  });

  updateTrainMarkers();
}

async function loadGeoJSON(url: string, color: number, type: string, group: THREE.Group, lineWidth: number) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to load ${url}`);
    const data = await response.json();

    const features = data.features || (data.type === 'FeatureCollection' ? data.features : [data]);
    const material = new THREE.LineBasicMaterial({ color, linewidth: lineWidth });

    features.forEach((feature: any) => {
      const geometry = feature.geometry;
      if (!geometry) return;

      if (geometry.type === 'Polygon') {
        geometry.coordinates.forEach((ring: any[]) => {
            const points = ring.map(coord => {
              const { x, y } = latLngToScene(coord[1], coord[0]);
              return new THREE.Vector3(x, y, -1); // Behind trains
            });
            const geo = new THREE.BufferGeometry().setFromPoints(points);
            const line = new THREE.Line(geo, material);
            group.add(line);
        });
      } else if (geometry.type === 'MultiPolygon') {
         geometry.coordinates.forEach((polygon: any[]) => {
            polygon.forEach((ring: any[]) => {
              const points = ring.map(coord => {
                const { x, y } = latLngToScene(coord[1], coord[0]);
                return new THREE.Vector3(x, y, -1);
              });
              const geo = new THREE.BufferGeometry().setFromPoints(points);
              const line = new THREE.Line(geo, material);
              group.add(line);
            });
         });
      } else if (geometry.type === 'LineString') {
         const points = geometry.coordinates.map((coord: any[]) => {
            const { x, y } = latLngToScene(coord[1], coord[0]);
            return new THREE.Vector3(x, y, -1);
         });
         const geo = new THREE.BufferGeometry().setFromPoints(points);
         const line = new THREE.Line(geo, material);
         group.add(line);
      } else if (geometry.type === 'MultiLineString') {
         geometry.coordinates.forEach((lineString: any[]) => {
            const points = lineString.map((coord: any[]) => {
              const { x, y } = latLngToScene(coord[1], coord[0]);
              return new THREE.Vector3(x, y, -1);
            });
            const geo = new THREE.BufferGeometry().setFromPoints(points);
            const line = new THREE.Line(geo, material);
            group.add(line);
         });
      }
    });

    console.log(`Loaded ${url} with ${features.length} features`);
  } catch (e) {
    console.error(`Error loading GeoJSON ${url}:`, e);
  }
}

function createThickRibbon(points: THREE.Vector3[], color: string | number, thickness: number): THREE.Mesh {
  const shape = new THREE.Shape();
  if (points.length < 2) return new THREE.Mesh();

  const halfT = thickness / 2;
  const topPoints: THREE.Vector2[] = [];
  const bottomPoints: THREE.Vector2[] = [];

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    let perpX = 0, perpY = 0;

    if (i === 0) {
      const next = points[1];
      const dx = next.x - p.x, dy = next.y - p.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      perpX = -dy / len; perpY = dx / len;
    } else if (i === points.length - 1) {
      const prev = points[i - 1];
      const dx = p.x - prev.x, dy = p.y - prev.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      perpX = -dy / len; perpY = dx / len;
    } else {
      const prev = points[i - 1], next = points[i + 1];
      const dx1 = p.x - prev.x, dy1 = p.y - prev.y;
      const dx2 = next.x - p.x, dy2 = next.y - p.y;
      const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1) || 1;
      const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2) || 1;
      perpX = (-dy1 / len1 - dy2 / len2) / 2;
      perpY = (dx1 / len1 + dx2 / len2) / 2;
      const pLen = Math.sqrt(perpX * perpX + perpY * perpY) || 1;
      perpX /= pLen; perpY /= pLen;
    }

    topPoints.push(new THREE.Vector2(p.x + perpX * halfT, p.y + perpY * halfT));
    bottomPoints.push(new THREE.Vector2(p.x - perpX * halfT, p.y - perpY * halfT));
  }

  shape.moveTo(topPoints[0].x, topPoints[0].y);
  for (let i = 1; i < topPoints.length; i++) shape.lineTo(topPoints[i].x, topPoints[i].y);
  for (let i = bottomPoints.length - 1; i >= 0; i--) shape.lineTo(bottomPoints[i].x, bottomPoints[i].y);
  shape.closePath();

  const geometry = new THREE.ShapeGeometry(shape);
  const material = new THREE.MeshBasicMaterial({ color: new THREE.Color(color) });
  return new THREE.Mesh(geometry, material);
}




// Shared station merging map
interface MergedStation {
    name: string;
    lat: number;
    lng: number;
    lines: Set<string>;
}
const stationDataMap = new Map<string, MergedStation>();

async function loadGeneratedStations() {
  try {
    const response = await fetch('/data/generated_stations.json');
    if (!response.ok) return;
    const data = await response.json();
    
    // Check if new format { stations, routes } or old format [ ... ]
    const stationList = Array.isArray(data) ? data : data.stations;
    const routes = data.routes || {};

    // Process Routes
    Object.entries(routes).forEach(([lineName, points]: [string, any[]]) => {
         if (points && points.length > 1) {
             const pointsVec = points.map(p => {
                 const { x, y } = latLngToScene(p[0], p[1]);
                 return new THREE.Vector3(x, y, 0);
             });
    // Update store (reactive)
             transitStore.lineRoutes[lineName] = pointsVec;
         }
    });

    // Capture station coordinates for route alignment
    const stationCoords: Record<string, {lat: number, lng: number}> = {};
    
    // Process Stations - Merge into map
    stationList.forEach((s: any) => {
        stationCoords[s.name] = { lat: s.lat, lng: s.lng };
        
        const key = `${s.lat.toFixed(4)}-${s.lng.toFixed(4)}`;
        const mappedLines = s.lines.map((l: string) => l.replace(/^Train /, ''));
        
        if (!stationDataMap.has(key)) {
            stationDataMap.set(key, {
                name: s.name,
                lat: s.lat,
                lng: s.lng,
                lines: new Set(mappedLines)
            });
        } else {
            const existing = stationDataMap.get(key)!;
            mappedLines.forEach((l: string) => existing.lines.add(l));
        }
    });
    
    // Update store routes using new coordinates
    transitStore.updateRouteCoordinates(stationCoords);
    transitStore.buildLineRoutes(); // Rebuild with updated coords
    
    // Re-run line adder for these new routes
    addTransitLines();

  } catch (e) {
    console.error("Failed to load generated stations", e);
  }
}

function addTransitLines() {
  console.log("Adding Transit Lines...");
  backgroundLinesGroup.clear();
  activeLinesGroup.clear();

  Object.entries(allLineColors).forEach(([name, color]) => {
    const route = transitStore.lineRoutes[name];
    if (route && route.length >= 2) {
      console.log(`Building line ${name} with ${route.length} points.`);
      const bgRibbon = createThickRibbon(route, 0x444466, BG_LINE_THICKNESS);
      bgRibbon.position.z = 0;
      bgRibbon.userData = { lineName: name };
      backgroundLinesGroup.add(bgRibbon);

      const ribbon = createThickRibbon(route, color, LINE_THICKNESS);
      ribbon.position.z = 1;
      ribbon.userData = { lineName: name };
      activeLinesGroup.add(ribbon);
    } else {
       // console.warn(`Skipping line ${name}: route length ${route?.length}`);
    }
  });
}

// Helper to normalize station names for matching
function normalizeStationName(name: string): string {
    return name
        .replace(/^Berlin\s+/, '') // Remove "Berlin " prefix
        .replace(/^S\+U\s+/, '')    // Remove "S+U " prefix
        .replace(/\s+\(Berlin\)$/, '') // Remove " (Berlin)" suffix
        .replace('Hauptbahnhof', 'Hbf') // Standardize Hbf
        .replace('Zoologischer Garten', 'Zoo') // Standardize Zoo
        .trim();
}

// Helper to calculate distance between two lat/lng points (in meters approx)
function getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371e3; // meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lng2-lng1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
}

function mergeStaticStations() {
  transitStore.allStations.forEach(station => {
    // 1. Try exact key match (fastest)
    const key = `${station.lat.toFixed(4)}-${station.lng.toFixed(4)}`;
    if (stationDataMap.has(key)) {
        const existing = stationDataMap.get(key)!;
        station.lines.forEach(l => existing.lines.add(l));
        return;
    }

    // 2. Fuzzy match: Check for existing stations with similar name AND reasonably close location
    let bestMatchKey: string | null = null;
    let minDistance = 500; // Search radius in meters (increased to catch Hbf offset)

    const normalizedStaticName = normalizeStationName(station.name).toLowerCase();

    for (const [existingKey, existingStation] of stationDataMap.entries()) {
        const dist = getDistance(station.lat, station.lng, existingStation.lat, existingStation.lng);
        
        if (dist < minDistance) {
            const normalizedExistingName = normalizeStationName(existingStation.name).toLowerCase();
            
            // Check for name similarity (substring or exact match after normalization)
            if (normalizedStaticName === normalizedExistingName || 
                normalizedStaticName.includes(normalizedExistingName) || 
                normalizedExistingName.includes(normalizedStaticName)) {
                
                minDistance = dist;
                bestMatchKey = existingKey;
            }
        }
    }

    if (bestMatchKey) {
        // Merge into the existing station (Visuals will use the existing station's position)
        const existing = stationDataMap.get(bestMatchKey)!;
        station.lines.forEach(l => existing.lines.add(l));
        
        // IMPORTANT: We must also update the route coordinates for this station name 
        // to point to the MERGED position, so the track snaps to the existing dot.
        transitStore.updateRouteCoordinates({
            [station.name]: { lat: existing.lat, lng: existing.lng } // Map static name to merged coords
        });
    } else {
        // No match found, add as new independent station
        stationDataMap.set(key, {
            name: station.name,
            lat: station.lat,
            lng: station.lng,
            lines: new Set(station.lines)
        });
    }
  });
  
  // Rebuild lines after merging to ensure they snap to the merged positions
  transitStore.buildLineRoutes();
  addTransitLines();
}

function renderStations() {
  stationsGroup.clear(); // Ensure clean slate
  
  stationDataMap.forEach((station) => {
    const { x, y } = latLngToScene(station.lat, station.lng);
    const lines = Array.from(station.lines);

    // Background circle
    const bgGeom = new THREE.CircleGeometry(BG_STATION_RADIUS, 16);
    const bgMat = new THREE.MeshBasicMaterial({ color: 0x555577 });
    const bgCircle = new THREE.Mesh(bgGeom, bgMat);
    bgCircle.position.set(x, y, 0.5);
    bgCircle.userData = { stationName: station.name, lines: lines, isActive: false };
    stationsGroup.add(bgCircle);

    // Get active lines for this station
    const activeLines = lines.filter(l => transitStore.enabledLines[l]);
    const hasMultipleActiveLines = activeLines.length > 1;

    if (hasMultipleActiveLines) {
      // Create pie chart for multi-line stations
      const numSlices = activeLines.length;
      const sliceAngle = (Math.PI * 2) / numSlices;
      
      activeLines.forEach((line, i) => {
        const startAngle = i * sliceAngle - Math.PI / 2;
        const endAngle = startAngle + sliceAngle;
        
        // Create pie slice using Shape
        const shape = new THREE.Shape();
        shape.moveTo(0, 0);
        shape.arc(0, 0, STATION_RADIUS, startAngle, endAngle, false);
        shape.lineTo(0, 0);
        
        const geometry = new THREE.ShapeGeometry(shape);
        const material = new THREE.MeshBasicMaterial({ color: new THREE.Color(transitStore.getLineColor(line)) });
        const slice = new THREE.Mesh(geometry, material);
        slice.position.set(x, y, 3);
        slice.userData = { 
          stationName: station.name, 
          lines: lines, 
          type: 'station-fill', 
          isActive: true, 
          baseRadius: STATION_RADIUS,
          lineName: line
        };
        stationsGroup.add(slice);
      });
    } else {
      // Single line or no active: simple circle
      const activeLine = activeLines[0];
      const fillColor = activeLine ? transitStore.getLineColor(activeLine) : 0x444466;

      const geometry = new THREE.CircleGeometry(STATION_RADIUS, 20);
      const material = new THREE.MeshBasicMaterial({ color: new THREE.Color(fillColor) });
      const circle = new THREE.Mesh(geometry, material);
      circle.position.set(x, y, 3);
      circle.userData = { stationName: station.name, lines: lines, type: 'station-fill', isActive: true, baseRadius: STATION_RADIUS };
      circle.visible = activeLines.length > 0;
      stationsGroup.add(circle);
    }

    // Outline (always)
    const outlineGeom = new THREE.RingGeometry(STATION_RADIUS, STATION_RADIUS + 0.3, 24);
    const outlineMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const outline = new THREE.Mesh(outlineGeom, outlineMat);
    outline.position.set(x, y, 3.1);
    outline.userData = { stationName: station.name, lines: lines, isActive: true };
    outline.visible = activeLines.length > 0; // Only visible if at least one line enabled
    stationsGroup.add(outline);
  });
}

function addStationLabels() {
  const addedLabels = new Set<string>();

  transitStore.allStations.forEach(station => {
    const key = `${station.lat.toFixed(4)}-${station.lng.toFixed(4)}`;
    if (addedLabels.has(key)) return;
    addedLabels.add(key);

    const { x, y } = latLngToScene(station.lat, station.lng);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = 512;
    canvas.height = 48;
    ctx.fillStyle = 'rgba(26, 26, 46, 0.92)';
    ctx.beginPath();
    ctx.roundRect(4, 4, canvas.width - 8, canvas.height - 8, 6);
    ctx.fill();
    ctx.font = 'bold 22px Inter, Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(station.name, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(18, 2.2, 1);
    sprite.position.set(x, y + 6, 10);
    sprite.userData = { stationName: station.name, lines: station.lines };
    sprite.visible = station.lines.some(l => transitStore.enabledLines[l]) && mapStore.currentZoom > 1.2;
    labelsGroup.add(sprite);
  });
}



function updateTrainMarkers() {
  if (!trainsGroup) return;
  while (trainsGroup.children.length > 0) trainsGroup.remove(trainsGroup.children[0]);

  transitStore.visibleTrains.forEach(train => {
    const snapped = transitStore.snapToTrack(train.lat, train.lng, train.lineName);
    const geometry = new THREE.PlaneGeometry(TRAIN_SIZE, TRAIN_SIZE);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const marker = new THREE.Mesh(geometry, material);
    marker.position.set(snapped.x, snapped.y, 5); // z=5 to render above stations (z=3)
    marker.userData = { type: 'train', tripId: train.tripId, lineName: train.lineName, direction: train.direction, delay: train.delay, baseSize: TRAIN_SIZE };
    trainsGroup.add(marker);
  });
}

function updateCamera() {
  if (!canvasContainer.value || !camera) return;
  const width = canvasContainer.value.clientWidth;
  const height = canvasContainer.value.clientHeight;
  const aspect = width / height;
  const viewSize = 150 / mapStore.currentZoom;
  camera.left = -viewSize * aspect;
  camera.right = viewSize * aspect;
  camera.top = viewSize;
  camera.bottom = -viewSize;
  camera.updateProjectionMatrix();
}

function handleZoomIn(amount = 0.3) {
  mapStore.zoomIn(amount);
  updateCamera();
  updateVisibility();
}

function handleZoomOut(amount = 0.3) {
  mapStore.zoomOut(amount);
  updateCamera();
  updateVisibility();
}

function handleResetView() {
  mapStore.resetZoom();
  camera.position.set(0, 0, 100);
  updateCamera();
  updateVisibility();
}

function scaleObject(obj: THREE.Object3D, scale: number) {
  if (obj.userData.type === 'train') {
    const size = (obj.userData.baseSize || TRAIN_SIZE) * scale;
    (obj as THREE.Mesh).geometry.dispose();
    (obj as THREE.Mesh).geometry = new THREE.PlaneGeometry(size, size);
  } else if (obj.userData.type === 'station-fill') {
    const radius = (obj.userData.baseRadius || STATION_RADIUS) * scale;
    (obj as THREE.Mesh).geometry.dispose();
    (obj as THREE.Mesh).geometry = new THREE.CircleGeometry(radius, 20);
  }
}

function resetHoveredObject() {
  if (hoveredObject) {
    scaleObject(hoveredObject, 1);
    hoveredObject = null;
  }
}

// Events
let isPanning = false;
let panStart = { x: 0, y: 0 };

function onWheel(event: WheelEvent) {
  event.preventDefault();
  if (event.deltaY < 0) {
    if (mapStore.currentZoom < 5) handleZoomIn(0.1); // Small step
  } else {
    if (mapStore.currentZoom > 0.05) handleZoomOut(0.1);
  }
  updateCamera();
  updateVisibility();
}

function onMouseDown(e: MouseEvent) {
  isPanning = true;
  panStart = { x: e.clientX, y: e.clientY };
  renderer.domElement.style.cursor = 'grabbing';
}

function onMouseMove(e: MouseEvent) {
  if (isPanning) {
    const dx = (e.clientX - panStart.x) / mapStore.currentZoom;
    const dy = (e.clientY - panStart.y) / mapStore.currentZoom;
    camera.position.x -= dx * 0.3;
    camera.position.y += dy * 0.3;
    panStart = { x: e.clientX, y: e.clientY };
    return;
  }

  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  // Trains - delayed hover
  const trainHits = raycaster.intersectObjects(trainsGroup.children.filter(c => c.visible));
  if (trainHits.length > 0) {
    const hit = trainHits[0].object;
    if (hit !== hoveredObject) {
      resetHoveredObject();
      hoveredObject = hit;
      scaleObject(hit, 1.5);
      
      // Delayed info panel
      if (hoverShowTimeout) clearTimeout(hoverShowTimeout);
      hoverShowTimeout = setTimeout(() => {
        if (!mapStore.infoPanel.locked && hoveredObject === hit) {
          mapStore.showTrainInfo(hit.userData.lineName, hit.userData.direction || 'Unknown', Math.round((hit.userData.delay || 0) / 60), transitStore.getLineColor(hit.userData.lineName), e.clientX, e.clientY);
        }
      }, HOVER_DELAY_MS);
    }
    renderer.domElement.style.cursor = 'pointer';
    return;
  }

  // Stations - delayed hover
  const stationHits = raycaster.intersectObjects(stationsGroup.children.filter(c => c.userData.isActive && c.userData.type === 'station-fill' && c.visible));
  if (stationHits.length > 0) {
    const hit = stationHits[0].object;
    if (hit !== hoveredObject) {
      resetHoveredObject();
      hoveredObject = hit;
      scaleObject(hit, 1.4);
      
      // Delayed fetch and info panel
      if (hoverShowTimeout) clearTimeout(hoverShowTimeout);
      if (prefetchTimeout) clearTimeout(prefetchTimeout);
      
      hoverShowTimeout = setTimeout(() => {
        if (hoveredObject === hit) {
          apiStore.setHoveredStation(hit.userData.stationName);
          transitStore.prefetchDepartures(hit.userData.stationName);
          if (!mapStore.infoPanel.locked) {
            handleShowStation(hit.userData, e.clientX, e.clientY, false);
          }
        }
      }, HOVER_DELAY_MS);
    }
    renderer.domElement.style.cursor = 'pointer';
    return;
  }

  resetHoveredObject();
  apiStore.setHoveredStation(null);
  mapStore.hideInfo();
  renderer.domElement.style.cursor = 'grab';
}

function onMouseUp() { isPanning = false; renderer.domElement.style.cursor = 'grab'; }
function onMouseLeave() { 
  isPanning = false; 
  resetHoveredObject(); 
  if (hoverShowTimeout) clearTimeout(hoverShowTimeout);
  mapStore.hideInfo(); 
}

async function onClick(e: MouseEvent) {
  if (mapStore.infoPanel.locked) { mapStore.closeInfo(); return; }

  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  const trainHits = raycaster.intersectObjects(trainsGroup.children);
  if (trainHits.length > 0) {
    const t = trainHits[0].object.userData;
    mapStore.showTrainInfo(t.lineName, t.direction || 'Unknown', Math.round((t.delay || 0) / 60), transitStore.getLineColor(t.lineName), e.clientX, e.clientY, true);
    return;
  }

  const stationHits = raycaster.intersectObjects(stationsGroup.children.filter(c => c.userData.isActive && c.userData.type === 'station-fill'));
  if (stationHits.length > 0) {
    await handleShowStation(stationHits[0].object.userData, e.clientX, e.clientY, true);
  }
}

async function handleShowStation(data: any, x: number, y: number, lock: boolean) {
  const lines = data.lines || [];
  mapStore.showStationInfo(data.stationName, lines, lines[0] ? transitStore.getLineColor(lines[0]) : '#555', x, y, lock);
  const result = await transitStore.fetchDepartures(data.stationName);
  const grouped = transitStore.processDepartures(result);
  mapStore.setStationDepartures(grouped);
}

function onResize() {
  if (!canvasContainer.value || !renderer) return;
  renderer.setSize(canvasContainer.value.clientWidth, canvasContainer.value.clientHeight);
  updateCamera();
}

function animate() {
  animationId = requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

onMounted(async () => {
  await nextTick();
  startApiMonitoring(); // Start tracking requests per minute
  setTimeout(() => {
    initThreeJS();
    transitStore.fetchTrains().then(updateTrainMarkers);
    restartRefreshInterval();
  }, 100);
});

onUnmounted(() => {
  stopApiMonitoring();
  if (animationId) cancelAnimationFrame(animationId);
  if (refreshIntervalId) clearInterval(refreshIntervalId);
  if (progressIntervalId) clearInterval(progressIntervalId);
  if (renderer) { renderer.dispose(); window.removeEventListener('resize', onResize); }
});
</script>

<style scoped>
/* Terminal/Train Station Display Theme */
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap');

.transit-map-root {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
}

.canvas-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

/* Info Panel - Terminal Card Style */
.info-panel {
  position: fixed;
  z-index: 2000;
  background: rgba(15, 20, 35, 0.95);
  min-width: 380px;
  max-width: 80vw;
  max-height: 60vh;
  overflow-y: auto;
  border: 1px solid rgba(100, 120, 150, 0.3);
  border-left: 3px solid #888;
  backdrop-filter: blur(12px);
}

.info-header {
  padding: 8px 12px;
  font-weight: 600;
  color: #e8e8e8;
  font-size: 14px;
  letter-spacing: 0.5px;
  border-bottom: 1px solid rgba(100, 120, 150, 0.2);
}

.info-body {
  padding: 8px 12px;
  color: #c8c8d0;
  font-size: 11px;
}

.info-lines {
  color: #8090a0;
  font-size: 10px;
  margin-bottom: 8px;
  letter-spacing: 0.3px;
}

.info-label {
  color: #6a7a8a;
  font-size: 9px;
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.info-loading {
  color: #6a7a8a;
  padding: 8px 0;
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0.3; }
}

/* Transport Type Grid (Split Columns) */
.departures-container {
  padding-top: 4px;
}

.transport-grid {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.grid-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0; /* Prevent flex overflow */
}

/* If only left column exists, it will take full width (flex: 1) */

.transport-card {
  margin-bottom: 0;
  border: 1px solid rgba(100, 120, 150, 0.2);
  background: rgba(20, 25, 40, 0.5);
  break-inside: avoid;
}


.transport-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  cursor: pointer;
  border-bottom: 1px solid rgba(100, 120, 150, 0.15);
  transition: background 0.15s;
}

.transport-header:hover {
  background: rgba(100, 120, 150, 0.15);
}

.transport-name {
  flex: 1;
  font-size: 9px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: #8090a0;
}

.transport-count {
  font-size: 8px;
  color: #5a6a7a;
  background: rgba(100, 120, 150, 0.2);
  padding: 1px 4px;
}

.transport-toggle {
  font-size: 9px;
  color: #5a6a7a;
}

.transport-deps {
  padding: 4px 8px;
}

.transport-card.collapsed {
  opacity: 0.7;
}

.transport-card.collapsed .transport-header {
  border-bottom: none;
}

.departure-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 0;
  border-bottom: 1px solid rgba(100, 120, 150, 0.06);
}

.dep-line {
  padding: 2px 4px;
  font-size: 9px;
  font-weight: 600;
  color: white;
  min-width: 26px;
  text-align: center;
}

.dep-dest {
  flex: 1;
  font-size: 10px;
  color: #c8c8d0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dep-time {
  color: #4ade80;
  font-weight: 500;
  font-size: 10px;
  min-width: 28px;
  text-align: right;
}

.delay {
  color: #f87171 !important;
}

.no-deps {
  color: #5a6a7a;
  padding: 8px 0;
}

/* Train Info */
.train-info {
  padding: 4px 0;
}

.train-line {
  display: inline-block;
  padding: 4px 10px;
  font-size: 14px;
  font-weight: 600;
  color: white;
  margin-bottom: 12px;
}

.train-row {
  color: #c8c8d0;
  font-size: 12px;
  padding: 4px 0;
}

/* Legend - Terminal Style */
.legend {
  position: absolute;
  top: 12px;
  right: 12px;
  background: rgba(15, 20, 35, 0.95);
  padding: 14px;
  z-index: 1000;
  font-size: 12px;
  min-width: 140px;
  color: #c8c8d0;
  backdrop-filter: blur(12px);
  border: 1px solid rgba(100, 120, 150, 0.3);
  border-left: 3px solid #4a5a6a;
  max-height: 80vh;
  overflow-y: auto;
}

.legend-title {
  font-weight: 600;
  margin-bottom: 12px;
  font-size: 11px;
  letter-spacing: 2px;
  color: #8090a0;
  border-bottom: 1px solid rgba(100, 120, 150, 0.2);
  padding-bottom: 8px;
}

.legend-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 9px;
  font-weight: 500;
  color: #5a6a7a;
  margin-top: 12px;
  margin-bottom: 6px;
  padding: 4px 6px;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  cursor: pointer;
  transition: background 0.15s;
}

.legend-section:hover {
  background: rgba(100, 120, 150, 0.1);
}

.section-toggle {
  font-size: 10px;
  opacity: 0;
  transition: opacity 0.15s;
}

.legend-section:hover .section-toggle {
  opacity: 1;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 5px 6px;
  cursor: pointer;
  transition: background 0.15s;
}

.legend-item:hover {
  background: rgba(100, 120, 150, 0.15);
}

.legend-item.disabled {
  opacity: 0.4;
}

.legend-color {
  width: 20px;
  height: 4px;
}

.legend-label {
  flex: 1;
  font-size: 11px;
}

.toggle-indicator {
  font-size: 10px;
  color: #6a7a8a;
}

.legend-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid rgba(100, 120, 150, 0.15);
}

.legend-btn {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid rgba(100, 120, 150, 0.3);
  background: transparent;
  cursor: pointer;
  font-size: 10px;
  color: #8090a0;
  font-family: 'JetBrains Mono', monospace;
  transition: all 0.15s;
}

.legend-btn:hover {
  background: rgba(100, 120, 150, 0.2);
  color: #c8c8d0;
}

/* Status Bar */
.status-bar {
  position: absolute;
  bottom: 12px;
  left: 12px;
  background: rgba(15, 20, 35, 0.95);
  color: #8090a0;
  padding: 10px 16px 14px 16px;
  font-size: 11px;
  z-index: 1000;
  border: 1px solid rgba(100, 120, 150, 0.3);
  border-left: 3px solid #4a5a6a;
  letter-spacing: 0.5px;
}

.refresh-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: rgba(74, 90, 106, 0.3);
  overflow: hidden;
}

.refresh-progress-bar {
  height: 100%;
  background: #5a7a8a;
  transition: width 0.1s linear;
}

.loading {
  animation: blink 0.5s infinite;
  margin-right: 8px;
}

/* Zoom Controls */
.zoom-controls {
  position: absolute;
  bottom: 12px;
  right: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 1000;
}

.zoom-btn {
  width: 40px;
  height: 32px;
  background: rgba(15, 20, 35, 0.95);
  border: 1px solid rgba(100, 120, 150, 0.3);
  color: #8090a0;
  font-size: 11px;
  cursor: pointer;
  font-family: 'JetBrains Mono', monospace;
  transition: all 0.15s;
}

.zoom-btn:hover {
  background: rgba(100, 120, 150, 0.2);
  color: #c8c8d0;
}

/* Scrollbar */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: rgba(15, 20, 35, 0.5);
}

::-webkit-scrollbar-thumb {
  background: rgba(100, 120, 150, 0.4);
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(100, 120, 150, 0.6);
}

/* Rate Monitor */
.rate-monitor {
  position: absolute;
  top: 12px;
  left: 12px;
  background: rgba(15, 20, 35, 0.95);
  padding: 8px 12px;
  z-index: 1000;
  border: 1px solid rgba(100, 120, 150, 0.3);
  border-left: 3px solid #4a5a6a;
  font-size: 10px;
  min-width: 130px;
}

.rate-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.rate-title {
  font-size: 9px;
  color: #5a6a7a;
  letter-spacing: 1px;
}

.refresh-btn {
  background: transparent;
  border: 1px solid rgba(100, 120, 150, 0.3);
  color: #8090a0;
  font-size: 14px;
  cursor: pointer;
  padding: 2px 6px;
  line-height: 1;
  font-family: 'JetBrains Mono', monospace;
  transition: all 0.15s;
}

.refresh-btn:hover:not(:disabled) {
  background: rgba(100, 120, 150, 0.2);
  color: #c8c8d0;
}

.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.refresh-btn .spin {
  display: inline-block;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.rate-stats {
  color: #4ade80;
  font-weight: 500;
  margin-bottom: 2px;
}

.rate-stats .warning {
  color: #fbbf24;
}

.rate-stats .danger {
  color: #f87171;
}

.rate-interval {
  color: #6a7a8a;
  font-size: 9px;
}

.rate-available {
  color: #5a6a7a;
  font-size: 9px;
}

.rate-blocked {
  color: #f87171;
  font-size: 9px;
  font-weight: 500;
  margin-top: 4px;
  animation: blink 0.5s infinite;
}

.loading-text {
  color: #6a7a8a;
  font-size: 10px;
}
</style>
