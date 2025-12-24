<template>
  <div class="transit-map-root">
    <div ref="canvasContainer" class="canvas-container"></div>
    
    <!-- Hover Tooltip -->
    <div 
      v-if="hoverTooltip.visible && !infoPanel.locked" 
      class="hover-tooltip"
      :style="{ left: hoverTooltip.x + 'px', top: hoverTooltip.y + 'px' }"
    >
      <div class="tooltip-header" :style="{ backgroundColor: hoverTooltip.color }">
        {{ hoverTooltip.title }}
      </div>
      <div class="tooltip-body">{{ hoverTooltip.subtitle }}</div>
    </div>
    
    <!-- Info Panel (click-to-lock) -->
    <div 
      v-if="infoPanel.visible" 
      class="info-panel"
      :style="{ left: infoPanel.x + 'px', top: infoPanel.y + 'px' }"
    >
      <div class="info-header" :style="{ backgroundColor: infoPanel.color }">
        {{ infoPanel.title }}
      </div>
      <div class="info-body">
        <div v-if="infoPanel.type === 'station'">
          <div class="info-section-lines">{{ infoPanel.lines }}</div>
          <div v-if="infoPanel.loading" class="info-loading">Loading departures...</div>
          <div v-else>
            <div v-for="(deps, category) in infoPanel.grouped" :key="category" class="departure-group">
              <div class="group-header">{{ category }}</div>
              <div v-for="(dep, i) in deps" :key="i" class="departure-row">
                <span class="dep-line" :style="{ backgroundColor: dep.color }">{{ dep.line }}</span>
                <span class="dep-dest">→ {{ dep.destination }}</span>
                <span v-if="dep.platform" class="dep-platform">{{ dep.platform }}</span>
                <span class="dep-time" :class="{ delay: dep.delay > 0 }">
                  {{ dep.delay > 0 ? `+${dep.delay}m` : dep.time }}
                </span>
              </div>
            </div>
            <div v-if="Object.keys(infoPanel.grouped).length === 0" class="no-deps">No departures found</div>
          </div>
        </div>
        <div v-else-if="infoPanel.type === 'train'">
          <div class="info-section">→ {{ infoPanel.direction }}</div>
          <div class="info-section status" :class="{ delay: infoPanel.delay > 0 }">
            {{ infoPanel.delay > 0 ? `+${infoPanel.delay} min delay` : '✓ On time' }}
          </div>
        </div>
      </div>
      <div class="info-hint">Click elsewhere to close</div>
    </div>
    
    <!-- Legend -->
    <div class="legend">
      <div class="legend-title">Train Lines</div>
      
      <div class="legend-section">Regional</div>
      <div
        v-for="(color, line) in regionalColors"
        :key="line"
        class="legend-item"
        @click="toggleLine(line as string)"
        :class="{ disabled: !enabledLines[line as string] }"
      >
        <span class="legend-color dashed" :style="{ backgroundColor: color }"></span>
        <span class="legend-label">{{ line }}</span>
        <span class="toggle-indicator">{{ enabledLines[line as string] ? '✓' : '' }}</span>
      </div>
      
      <div class="legend-section">U-Bahn</div>
      <div
        v-for="(color, line) in ubahnColors"
        :key="line"
        class="legend-item"
        @click="toggleLine(line as string)"
        :class="{ disabled: !enabledLines[line as string] }"
      >
        <span class="legend-color" :style="{ backgroundColor: color }"></span>
        <span class="legend-label">{{ line }}</span>
        <span class="toggle-indicator">{{ enabledLines[line as string] ? '✓' : '' }}</span>
      </div>
      
      <div class="legend-actions">
        <button @click="showAll" class="legend-btn">All</button>
        <button @click="showNone" class="legend-btn">None</button>
      </div>
    </div>
    
    <!-- Status bar -->
    <div class="status-bar">
      <span v-if="loading" class="loading-spinner">⟳</span>
      <span>🚂 {{ trainCount }} trains • Zoom: {{ Math.round(currentZoom * 100) }}%</span>
    </div>
    
    <!-- Zoom controls -->
    <div class="zoom-controls">
      <button @click="zoomIn" class="zoom-btn">+</button>
      <button @click="zoomOut" class="zoom-btn">−</button>
      <button @click="resetView" class="zoom-btn reset">⌂</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import * as THREE from 'three';
import { ref, reactive, onMounted, onUnmounted, nextTick } from 'vue';
import { ubahnColors, ubahnStations, getLineRoute } from '~/data/ubahn';
import { regionalColors, re1Stations, getRE1Route } from '~/data/regional';

const allLineColors: Record<string, string> = { ...ubahnColors, ...regionalColors };
const canvasContainer = ref<HTMLElement | null>(null);

const enabledLines = reactive<Record<string, boolean>>(
  Object.keys(allLineColors).reduce((acc, line) => {
    acc[line] = line === 'U5';
    return acc;
  }, {} as Record<string, boolean>)
);

const loading = ref(false);
const currentZoom = ref(1);
const trainCount = ref(0);

// Hover tooltip
const hoverTooltip = reactive({
  visible: false,
  x: 0,
  y: 0,
  title: '',
  subtitle: '',
  color: '#888'
});

// Departures cache for hover prefetch
const departuresCache = new Map<string, any>();
let prefetchTimeout: ReturnType<typeof setTimeout> | null = null;

// Info panel
const infoPanel = reactive({
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
  grouped: {} as Record<string, any[]>
});

// Three.js
let scene: THREE.Scene;
let camera: THREE.OrthographicCamera;
let renderer: THREE.WebGLRenderer;
let animationId: number;
let raycaster: THREE.Raycaster;
let mouse: THREE.Vector2;

let backgroundLinesGroup: THREE.Group;
let activeLinesGroup: THREE.Group;
let stationsGroup: THREE.Group;
let trainsGroup: THREE.Group;
let labelsGroup: THREE.Group;

const LINE_THICKNESS = 4;
const BG_LINE_THICKNESS = 1.5;
const STATION_RADIUS = 3;
const STATION_HOVER_RADIUS = 4.5;
const BG_STATION_RADIUS = 1.5;
const TRAIN_SIZE = 2.5;
const TRAIN_HOVER_SIZE = 4;

interface Train {
  tripId: string;
  lat: number;
  lng: number;
  lineName: string;
  direction: string;
  delay: number;
}
const trains = ref<Train[]>([]);
let refreshInterval: ReturnType<typeof setInterval> | null = null;

const lineRoutes: Record<string, THREE.Vector3[]> = {};

// Track currently hovered object
let hoveredObject: THREE.Object3D | null = null;

function latLngToScene(lat: number, lng: number): { x: number; y: number } {
  const centerLat = 52.4;
  const centerLng = 13.1;
  const scale = 1000;
  return { x: (lng - centerLng) * scale, y: (lat - centerLat) * scale };
}

function getLineColor(lineName: string): string {
  return allLineColors[lineName] || '#888888';
}

function toggleLine(line: string) {
  enabledLines[line] = !enabledLines[line];
  updateVisibility();
}

function showAll() {
  Object.keys(enabledLines).forEach(l => enabledLines[l] = true);
  updateVisibility();
}

function showNone() {
  Object.keys(enabledLines).forEach(l => enabledLines[l] = false);
  updateVisibility();
}

function updateVisibility() {
  activeLinesGroup.children.forEach(child => {
    child.visible = enabledLines[child.userData.lineName] ?? false;
  });
  
  stationsGroup.children.forEach(child => {
    const lines = child.userData.lines as string[];
    if (lines && child.userData.isActive) {
      const hasActive = lines.some(l => enabledLines[l]);
      child.visible = hasActive;
      if (hasActive && child.userData.type === 'station-fill') {
        const activeLine = lines.find(l => enabledLines[l]);
        if (activeLine) {
          (child as THREE.Mesh).material = new THREE.MeshBasicMaterial({ 
            color: new THREE.Color(getLineColor(activeLine)) 
          });
        }
      }
    }
  });
  
  labelsGroup.children.forEach(child => {
    const lines = child.userData.lines as string[];
    if (lines) child.visible = lines.some(l => enabledLines[l]) && currentZoom.value > 1.2;
  });
  
  updateTrainMarkers();
}

function zoomIn() {
  currentZoom.value = Math.min(5, currentZoom.value * 1.3);
  updateCamera();
  updateVisibility();
}

function zoomOut() {
  currentZoom.value = Math.max(0.1, currentZoom.value * 0.7);
  updateCamera();
  updateVisibility();
}

function resetView() {
  currentZoom.value = 1;
  camera.position.set(0, 0, 100);
  updateCamera();
  updateVisibility();
}

function updateCamera() {
  if (!canvasContainer.value || !camera) return;
  const width = canvasContainer.value.clientWidth;
  const height = canvasContainer.value.clientHeight;
  const aspect = width / height;
  const viewSize = 150 / currentZoom.value;
  camera.left = -viewSize * aspect;
  camera.right = viewSize * aspect;
  camera.top = viewSize;
  camera.bottom = -viewSize;
  camera.updateProjectionMatrix();
}

function initThreeJS() {
  const container = canvasContainer.value;
  if (!container) return;
  
  const width = container.clientWidth;
  const height = container.clientHeight;
  
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e);
  
  backgroundLinesGroup = new THREE.Group();
  activeLinesGroup = new THREE.Group();
  stationsGroup = new THREE.Group();
  trainsGroup = new THREE.Group();
  labelsGroup = new THREE.Group();
  
  scene.add(backgroundLinesGroup);
  scene.add(activeLinesGroup);
  scene.add(trainsGroup);
  scene.add(stationsGroup);
  scene.add(labelsGroup);
  
  const aspect = width / height;
  const viewSize = 150;
  camera = new THREE.OrthographicCamera(-viewSize * aspect, viewSize * aspect, viewSize, -viewSize, 0.1, 1000);
  camera.position.z = 100;
  
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);
  
  raycaster = new THREE.Raycaster();
  raycaster.params.Mesh = { threshold: 2 };
  mouse = new THREE.Vector2();
  
  addTransitLines();
  addStations();
  addStationLabels();
  updateVisibility();
  
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

function addTransitLines() {
  Object.entries(ubahnColors).forEach(([name, color]) => {
    const route = getLineRoute(name);
    if (route.length >= 2) {
      const points = route.map(([lat, lng]) => {
        const { x, y } = latLngToScene(lat, lng);
        return new THREE.Vector3(x, y, 0);
      });
      lineRoutes[name] = points;
      
      const bgRibbon = createThickRibbon(points, 0x444466, BG_LINE_THICKNESS);
      bgRibbon.position.z = 0;
      bgRibbon.userData = { lineName: name };
      backgroundLinesGroup.add(bgRibbon);
      
      const ribbon = createThickRibbon(points, color, LINE_THICKNESS);
      ribbon.position.z = 1;
      ribbon.userData = { lineName: name };
      activeLinesGroup.add(ribbon);
    }
  });
  
  const re1Route = getRE1Route();
  if (re1Route.length >= 2) {
    const points = re1Route.map(([lat, lng]) => {
      const { x, y } = latLngToScene(lat, lng);
      return new THREE.Vector3(x, y, 0);
    });
    lineRoutes['RE1'] = points;
    
    const bgRibbon = createThickRibbon(points, 0x444466, BG_LINE_THICKNESS);
    bgRibbon.position.z = 0;
    bgRibbon.userData = { lineName: 'RE1' };
    backgroundLinesGroup.add(bgRibbon);
    
    const ribbon = createThickRibbon(points, regionalColors['RE1'], LINE_THICKNESS);
    ribbon.position.z = 1;
    ribbon.userData = { lineName: 'RE1' };
    activeLinesGroup.add(ribbon);
  }
}

function addStations() {
  const addedStations = new Set<string>();
  const allStations = [...ubahnStations, ...re1Stations];
  
  allStations.forEach(station => {
    const key = `${station.lat.toFixed(4)}-${station.lng.toFixed(4)}`;
    if (addedStations.has(key)) return;
    addedStations.add(key);
    
    const { x, y } = latLngToScene(station.lat, station.lng);
    
    // Background gray circle
    const bgGeom = new THREE.CircleGeometry(BG_STATION_RADIUS, 16);
    const bgMat = new THREE.MeshBasicMaterial({ color: 0x555577 });
    const bgCircle = new THREE.Mesh(bgGeom, bgMat);
    bgCircle.position.set(x, y, 0.5);
    bgCircle.userData = { stationName: station.name, lines: station.lines, isActive: false };
    stationsGroup.add(bgCircle);
    
    // Active station
    const activeLine = station.lines.find(l => enabledLines[l]);
    const fillColor = activeLine ? getLineColor(activeLine) : 0x444466;
    
    const geometry = new THREE.CircleGeometry(STATION_RADIUS, 20);
    const material = new THREE.MeshBasicMaterial({ color: new THREE.Color(fillColor) });
    const circle = new THREE.Mesh(geometry, material);
    circle.position.set(x, y, 3);
    circle.userData = { 
      stationName: station.name, 
      lines: station.lines,
      type: 'station-fill',
      isActive: true,
      baseRadius: STATION_RADIUS
    };
    circle.visible = station.lines.some(l => enabledLines[l]);
    stationsGroup.add(circle);
    
    // Outline
    const outlineGeom = new THREE.RingGeometry(STATION_RADIUS, STATION_RADIUS + 0.2, 20);
    const outlineMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const outline = new THREE.Mesh(outlineGeom, outlineMat);
    outline.position.set(x, y, 3.1);
    outline.userData = { stationName: station.name, lines: station.lines, isActive: true, isOutline: true, baseRadius: STATION_RADIUS };
    outline.visible = station.lines.some(l => enabledLines[l]);
    stationsGroup.add(outline);
  });
}

function addStationLabels() {
  const addedLabels = new Set<string>();
  const allStations = [...ubahnStations, ...re1Stations];
  
  allStations.forEach(station => {
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
    sprite.visible = station.lines.some(l => enabledLines[l]) && currentZoom.value > 1.2;
    
    labelsGroup.add(sprite);
  });
}

function snapToTrack(lat: number, lng: number, lineName: string): { x: number; y: number } {
  const { x, y } = latLngToScene(lat, lng);
  const route = lineRoutes[lineName];
  if (!route || route.length < 2) return { x, y };
  
  let closestX = x, closestY = y, minDist = Infinity;
  
  for (let i = 0; i < route.length - 1; i++) {
    const a = route[i], b = route[i + 1];
    const abx = b.x - a.x, aby = b.y - a.y;
    const apx = x - a.x, apy = y - a.y;
    const ab2 = abx * abx + aby * aby;
    if (ab2 === 0) continue;
    
    let t = (apx * abx + apy * aby) / ab2;
    t = Math.max(0, Math.min(1, t));
    
    const px = a.x + t * abx, py = a.y + t * aby;
    const dist = Math.sqrt((x - px) ** 2 + (y - py) ** 2);
    
    if (dist < minDist) { minDist = dist; closestX = px; closestY = py; }
  }
  return { x: closestX, y: closestY };
}

async function fetchTrains() {
  try {
    loading.value = true;
    const response = await fetch('/api/u5-positions');
    const data = await response.json();
    
    if (data && data.trains && Array.isArray(data.trains)) {
      trains.value = data.trains.map((t: any) => ({
        tripId: t.tripId,
        lat: t.latitude,
        lng: t.longitude,
        lineName: t.lineName,
        direction: t.direction,
        delay: t.delay
      }));
      
      updateTrainMarkers();
    }
  } catch (error) {
    console.error('Failed to fetch trains:', error);
  } finally {
    loading.value = false;
  }
}

// Prefetch departures on hover
async function prefetchDepartures(stationName: string) {
  if (departuresCache.has(stationName)) return;
  
  try {
    const response = await fetch(`/api/station-departures?station=${encodeURIComponent(stationName)}`);
    const result = await response.json();
    departuresCache.set(stationName, result);
    // Cache expires after 60 seconds
    setTimeout(() => departuresCache.delete(stationName), 60000);
  } catch (e) {
    // Silent fail for prefetch
  }
}

function updateTrainMarkers() {
  if (!trainsGroup) return;
  while (trainsGroup.children.length > 0) trainsGroup.remove(trainsGroup.children[0]);
  
  const visibleTrains = trains.value.filter(t => enabledLines[t.lineName]);
  trainCount.value = visibleTrains.length;
  
  visibleTrains.forEach(train => {
    const snapped = snapToTrack(train.lat, train.lng, train.lineName);
    
    const geometry = new THREE.PlaneGeometry(TRAIN_SIZE, TRAIN_SIZE);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const marker = new THREE.Mesh(geometry, material);
    marker.position.set(snapped.x, snapped.y, 2);
    marker.userData = { 
      type: 'train',
      tripId: train.tripId, 
      lineName: train.lineName,
      direction: train.direction,
      delay: train.delay,
      baseSize: TRAIN_SIZE
    };
    trainsGroup.add(marker);
  });
}

// Hover/scale helpers
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

function onWheel(e: WheelEvent) {
  e.preventDefault();
  currentZoom.value = Math.max(0.1, Math.min(5, currentZoom.value * (e.deltaY > 0 ? 0.9 : 1.1)));
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
    const dx = (e.clientX - panStart.x) / currentZoom.value;
    const dy = (e.clientY - panStart.y) / currentZoom.value;
    camera.position.x -= dx * 0.3;
    camera.position.y += dy * 0.3;
    panStart = { x: e.clientX, y: e.clientY };
    hoverTooltip.visible = false;
    return;
  }
  
  // Hover detection
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  
  raycaster.setFromCamera(mouse, camera);
  
  // Check trains
  const trainHits = raycaster.intersectObjects(trainsGroup.children);
  if (trainHits.length > 0) {
    const hit = trainHits[0].object;
    if (hit !== hoveredObject) {
      resetHoveredObject();
      hoveredObject = hit;
      scaleObject(hit, 1.5);
    }
    
    // Show full info on hover
    if (!infoPanel.locked) {
      showTrainPanel(hit.userData, e.clientX, e.clientY);
    }
    
    renderer.domElement.style.cursor = 'pointer';
    return;
  }
  
  // Check stations
  const stationHits = raycaster.intersectObjects(stationsGroup.children.filter(c => c.userData.isActive && c.userData.type === 'station-fill'));
  if (stationHits.length > 0) {
    const hit = stationHits[0].object;
    if (hit !== hoveredObject) {
      resetHoveredObject();
      hoveredObject = hit;
      scaleObject(hit, 1.4);
      
      // Prefetch departures on hover
      if (prefetchTimeout) clearTimeout(prefetchTimeout);
      prefetchTimeout = setTimeout(() => {
        prefetchDepartures(hit.userData.stationName);
      }, 200);
    }
    
    // Show full info on hover (not just tooltip)
    if (!infoPanel.locked) {
      showStationPanel(hit.userData, e.clientX, e.clientY);
    }
    
    renderer.domElement.style.cursor = 'pointer';
    return;
  }
  
  // No hit
  resetHoveredObject();
  hoverTooltip.visible = false;
  if (!infoPanel.locked) {
    infoPanel.visible = false;
  }
  renderer.domElement.style.cursor = 'grab';
}

function onMouseUp() {
  isPanning = false;
  renderer.domElement.style.cursor = 'grab';
}

function onMouseLeave() {
  isPanning = false;
  hoverTooltip.visible = false;
  resetHoveredObject();
  if (!infoPanel.locked) {
    infoPanel.visible = false;
  }
}

async function onClick(e: MouseEvent) {
  if (infoPanel.locked) {
    infoPanel.visible = false;
    infoPanel.locked = false;
    return;
  }
  
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  
  raycaster.setFromCamera(mouse, camera);
  
  const trainHits = raycaster.intersectObjects(trainsGroup.children);
  if (trainHits.length > 0) {
    showTrainPanel(trainHits[0].object.userData, e.clientX, e.clientY, true);
    return;
  }
  
  const stationHits = raycaster.intersectObjects(stationsGroup.children.filter(c => c.userData.isActive && c.userData.type === 'station-fill'));
  if (stationHits.length > 0) {
    await showStationPanel(stationHits[0].object.userData, e.clientX, e.clientY, true);
    return;
  }
}

async function showStationPanel(data: any, x: number, y: number, lock: boolean = false) {
  infoPanel.visible = true;
  infoPanel.locked = lock;
  infoPanel.loading = true;
  infoPanel.x = Math.min(x + 15, window.innerWidth - 320);
  infoPanel.y = Math.min(y + 15, window.innerHeight - 350);
  infoPanel.type = 'station';
  infoPanel.title = data.stationName;
  infoPanel.lines = (data.lines || []).join(', ');
  infoPanel.color = data.lines?.[0] ? getLineColor(data.lines[0]) : '#555';
  
  // Check cache first
  const cached = departuresCache.get(data.stationName);
  if (cached) {
    processGroupedDepartures(cached);
    infoPanel.loading = false;
  } else {
    infoPanel.grouped = {};
    infoPanel.loading = true;
    
    try {
      const response = await fetch(`/api/station-departures?station=${encodeURIComponent(data.stationName)}`);
      const result = await response.json();
      departuresCache.set(data.stationName, result);
      setTimeout(() => departuresCache.delete(data.stationName), 60000);
      processGroupedDepartures(result);
    } catch (error) {
      console.error('Failed to fetch departures:', error);
    } finally {
      infoPanel.loading = false;
    }
  }
}

function processGroupedDepartures(result: any) {
  const grouped: Record<string, any[]> = {};
  for (const [category, deps] of Object.entries(result.grouped || {})) {
    grouped[category] = (deps as any[]).map(dep => {
      const when = dep.actualTime || dep.plannedTime;
      const mins = when ? Math.max(0, Math.round((new Date(when).getTime() - Date.now()) / 60000)) : 0;
      return {
        line: dep.line,
        destination: dep.destination,
        time: `${mins}m`,
        color: getLineColor(dep.line),
        platform: dep.platform || '',
        delay: Math.round((dep.delay || 0) / 60)
      };
    });
  }
  infoPanel.grouped = grouped;
}

function showTrainPanel(data: any, x: number, y: number, lock: boolean = false) {
  infoPanel.visible = true;
  infoPanel.locked = lock;
  infoPanel.loading = false;
  infoPanel.x = Math.min(x + 15, window.innerWidth - 220);
  infoPanel.y = Math.min(y + 15, window.innerHeight - 150);
  infoPanel.type = 'train';
  infoPanel.title = data.lineName;
  infoPanel.color = getLineColor(data.lineName);
  infoPanel.direction = data.direction || 'Unknown';
  infoPanel.delay = Math.round((data.delay || 0) / 60);
  infoPanel.grouped = {};
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
  setTimeout(() => {
    initThreeJS();
    fetchTrains();
    refreshInterval = setInterval(fetchTrains, 5000);
  }, 100);
});

onUnmounted(() => {
  if (animationId) cancelAnimationFrame(animationId);
  if (refreshInterval) clearInterval(refreshInterval);
  if (renderer) {
    renderer.dispose();
    window.removeEventListener('resize', onResize);
  }
});
</script>

<style scoped>
.transit-map-root {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.canvas-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

/* Hover tooltip */
.hover-tooltip {
  position: fixed;
  z-index: 2500;
  pointer-events: none;
  background: rgba(26, 26, 46, 0.95);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
  min-width: 120px;
}

.tooltip-header {
  padding: 6px 10px;
  font-weight: bold;
  color: white;
  font-size: 13px;
}

.tooltip-body {
  padding: 6px 10px;
  color: #aaa;
  font-size: 11px;
}

/* Info panel */
.info-panel {
  position: fixed;
  z-index: 2000;
  background: rgba(26, 26, 46, 0.98);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
  min-width: 240px;
  max-width: 300px;
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.info-header {
  padding: 10px 14px;
  font-weight: bold;
  color: white;
  font-size: 15px;
  position: sticky;
  top: 0;
}

.info-body {
  padding: 10px 14px;
  color: #ddd;
  font-size: 12px;
}

.info-loading {
  color: #888;
  font-style: italic;
  padding: 10px 0;
}

.info-section-lines {
  color: #888;
  font-size: 11px;
  margin-bottom: 10px;
}

.departure-group {
  margin-bottom: 12px;
}

.group-header {
  font-size: 10px;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
  padding-bottom: 4px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}

.departure-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 0;
}

.dep-line {
  padding: 2px 5px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: bold;
  color: white;
  min-width: 28px;
  text-align: center;
}

.dep-dest {
  flex: 1;
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dep-platform {
  color: #666;
  font-size: 9px;
  background: rgba(255,255,255,0.1);
  padding: 2px 4px;
  border-radius: 3px;
}

.dep-time {
  color: #4ade80;
  font-weight: 600;
  font-size: 11px;
  min-width: 30px;
  text-align: right;
}

.delay {
  color: #f87171 !important;
}

.status {
  font-weight: 600;
}

.no-deps {
  color: #666;
  font-style: italic;
  padding: 10px 0;
}

.info-hint {
  padding: 6px 14px;
  background: rgba(0, 0, 0, 0.2);
  color: #555;
  font-size: 9px;
  text-align: center;
  position: sticky;
  bottom: 0;
}

/* Legend */
.legend {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(26, 26, 46, 0.95);
  padding: 12px;
  border-radius: 12px;
  z-index: 1000;
  font-size: 13px;
  min-width: 130px;
  color: #fff;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  max-height: 80vh;
  overflow-y: auto;
}

.legend-title {
  font-weight: bold;
  margin-bottom: 10px;
  font-size: 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  padding-bottom: 8px;
}

.legend-section {
  font-size: 11px;
  font-weight: 600;
  color: #888;
  margin-top: 10px;
  margin-bottom: 6px;
  text-transform: uppercase;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 8px;
  cursor: pointer;
  border-radius: 6px;
}

.legend-item:hover { background: rgba(255, 255, 255, 0.1); }
.legend-item.disabled { opacity: 0.5; }

.legend-color {
  width: 24px;
  height: 5px;
  border-radius: 2px;
}

.legend-label { flex: 1; }
.toggle-indicator { width: 16px; text-align: center; color: #4ade80; font-weight: bold; }

.legend-actions {
  display: flex;
  gap: 6px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.legend-btn {
  flex: 1;
  padding: 5px 10px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  cursor: pointer;
  font-size: 11px;
  color: #fff;
}

.legend-btn:hover { background: rgba(255, 255, 255, 0.15); }

.status-bar {
  position: absolute;
  bottom: 10px;
  left: 10px;
  background: rgba(26, 26, 46, 0.95);
  color: white;
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 12px;
  z-index: 1000;
}

.loading-spinner { animation: spin 1s linear infinite; display: inline-block; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

.zoom-controls {
  position: absolute;
  bottom: 10px;
  right: 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 1000;
}

.zoom-btn {
  width: 36px;
  height: 36px;
  background: rgba(26, 26, 46, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  color: #fff;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.zoom-btn:hover { background: rgba(255, 255, 255, 0.15); }
.zoom-btn.reset { font-size: 14px; }
</style>
