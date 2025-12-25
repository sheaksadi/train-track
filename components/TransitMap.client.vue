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
            <!-- Grid of collapsible transport type cards -->
            <div 
              class="transport-grid"
              :class="{ 
                'single-type': Object.keys(mapStore.infoPanel.grouped).length === 1,
                'multi-type': Object.keys(mapStore.infoPanel.grouped).length > 1
              }"
            >
              <div 
                v-for="(deps, category) in mapStore.infoPanel.grouped" 
                :key="category" 
                class="transport-card"
                :class="{ collapsed: collapsedCategories[category as string] }"
              >
                <div 
                  class="transport-header" 
                  @click="toggleCategory(category as string)"
                >
                  <span class="transport-name">{{ category }}</span>
                  <span class="transport-count">{{ deps.length }}</span>
                  <span class="transport-toggle">{{ collapsedCategories[category as string] ? '[+]' : '[-]' }}</span>
                </div>
                <div v-if="!collapsedCategories[category as string]" class="transport-deps">
                  <div v-for="(dep, i) in deps" :key="i" class="departure-row">
                    <span class="dep-line" :style="{ backgroundColor: dep.color }">{{ dep.line }}</span>
                    <span class="dep-dest">→ {{ dep.destination }}</span>
                    <span class="dep-time" :class="{ delay: dep.delay > 0 }">{{ dep.delay > 0 ? `+${dep.delay}m` : dep.time }}</span>
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
      
      <!-- Regional Section -->
      <div 
        class="legend-section" 
        @click="toggleLegendSection('regional')"
      >
        <span>Regional</span>
        <span class="section-toggle">{{ collapsedLegend['regional'] ? '[+]' : '[-]' }}</span>
      </div>
      <div v-if="!collapsedLegend['regional']" class="legend-list">
        <div
          v-for="(color, line) in regionalColors"
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
      <div class="rate-title">API RATE</div>
      <div class="rate-stats">
        <span :class="{ warning: requestsPerMin > 80, danger: requestsPerMin > 95 }">
          {{ requestsPerMin }}/100 req/min
        </span>
      </div>
      <div class="rate-interval">refresh: {{ (refreshInterval / 1000).toFixed(1) }}s</div>
    </div>
    
    <!-- Status bar - Terminal Style -->
    <div class="status-bar">
      <span v-if="transitStore.loading" class="loading">█</span>
      <span>trains: {{ transitStore.trainCount }} | zoom: {{ Math.round(mapStore.currentZoom * 100) }}%</span>
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
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { ubahnColors } from '~/data/ubahn';
import { regionalColors } from '~/data/regional';
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

// Collapsible legend sections
const collapsedLegend = ref<Record<string, boolean>>({});

function toggleLegendSection(section: string) {
  collapsedLegend.value[section] = !collapsedLegend.value[section];
}

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

// Hover tracking
let hoveredObject: THREE.Object3D | null = null;
let prefetchTimeout: ReturnType<typeof setTimeout> | null = null;
let refreshInterval: ReturnType<typeof setInterval> | null = null;

// Watch for line toggle
watch(() => transitStore.enabledLines, () => {
  updateVisibility();
}, { deep: true });

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

  // Build routes in store
  transitStore.buildLineRoutes();

  // Add objects
  addTransitLines();
  addStations();
  addStationLabels();
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
  Object.entries(allLineColors).forEach(([name, color]) => {
    const route = transitStore.lineRoutes[name];
    if (route && route.length >= 2) {
      const bgRibbon = createThickRibbon(route, 0x444466, BG_LINE_THICKNESS);
      bgRibbon.position.z = 0;
      bgRibbon.userData = { lineName: name };
      backgroundLinesGroup.add(bgRibbon);

      const ribbon = createThickRibbon(route, color, LINE_THICKNESS);
      ribbon.position.z = 1;
      ribbon.userData = { lineName: name };
      activeLinesGroup.add(ribbon);
    }
  });
}

function addStations() {
  const addedStations = new Set<string>();

  transitStore.allStations.forEach(station => {
    const key = `${station.lat.toFixed(4)}-${station.lng.toFixed(4)}`;
    if (addedStations.has(key)) return;
    addedStations.add(key);

    const { x, y } = latLngToScene(station.lat, station.lng);

    // Background circle
    const bgGeom = new THREE.CircleGeometry(BG_STATION_RADIUS, 16);
    const bgMat = new THREE.MeshBasicMaterial({ color: 0x555577 });
    const bgCircle = new THREE.Mesh(bgGeom, bgMat);
    bgCircle.position.set(x, y, 0.5);
    bgCircle.userData = { stationName: station.name, lines: station.lines, isActive: false };
    stationsGroup.add(bgCircle);

    // Get active lines for this station
    const activeLines = station.lines.filter(l => transitStore.enabledLines[l]);
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
          lines: station.lines, 
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
      circle.userData = { stationName: station.name, lines: station.lines, type: 'station-fill', isActive: true, baseRadius: STATION_RADIUS };
      circle.visible = activeLines.length > 0;
      stationsGroup.add(circle);
    }

    // Outline (always)
    const outlineGeom = new THREE.RingGeometry(STATION_RADIUS, STATION_RADIUS + 0.3, 24);
    const outlineMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const outline = new THREE.Mesh(outlineGeom, outlineMat);
    outline.position.set(x, y, 3.1);
    outline.userData = { stationName: station.name, lines: station.lines, isActive: true };
    outline.visible = station.lines.some(l => transitStore.enabledLines[l]);
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

function updateVisibility() {
  activeLinesGroup.children.forEach(child => {
    child.visible = transitStore.enabledLines[child.userData.lineName] ?? false;
  });

  stationsGroup.children.forEach(child => {
    const lines = child.userData.lines as string[];
    if (lines && child.userData.isActive) {
      const hasActive = lines.some(l => transitStore.enabledLines[l]);
      child.visible = hasActive;
      if (hasActive && child.userData.type === 'station-fill') {
        const activeLine = lines.find(l => transitStore.enabledLines[l]);
        if (activeLine) {
          (child as THREE.Mesh).material = new THREE.MeshBasicMaterial({ color: new THREE.Color(transitStore.getLineColor(activeLine)) });
        }
      }
    }
  });

  labelsGroup.children.forEach(child => {
    const lines = child.userData.lines as string[];
    if (lines) child.visible = lines.some(l => transitStore.enabledLines[l]) && mapStore.currentZoom > 1.2;
  });

  updateTrainMarkers();
}

function updateTrainMarkers() {
  if (!trainsGroup) return;
  while (trainsGroup.children.length > 0) trainsGroup.remove(trainsGroup.children[0]);

  transitStore.visibleTrains.forEach(train => {
    const snapped = transitStore.snapToTrack(train.lat, train.lng, train.lineName);
    const geometry = new THREE.PlaneGeometry(TRAIN_SIZE, TRAIN_SIZE);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const marker = new THREE.Mesh(geometry, material);
    marker.position.set(snapped.x, snapped.y, 2);
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

function handleZoomIn() {
  mapStore.zoomIn();
  updateCamera();
  updateVisibility();
}

function handleZoomOut() {
  mapStore.zoomOut();
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

function onWheel(e: WheelEvent) {
  e.preventDefault();
  if (e.deltaY > 0) mapStore.zoomOut(); else mapStore.zoomIn();
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

  // Trains
  const trainHits = raycaster.intersectObjects(trainsGroup.children);
  if (trainHits.length > 0) {
    const hit = trainHits[0].object;
    if (hit !== hoveredObject) { resetHoveredObject(); hoveredObject = hit; scaleObject(hit, 1.5); }
    if (!mapStore.infoPanel.locked) {
      mapStore.showTrainInfo(hit.userData.lineName, hit.userData.direction || 'Unknown', Math.round((hit.userData.delay || 0) / 60), transitStore.getLineColor(hit.userData.lineName), e.clientX, e.clientY);
    }
    renderer.domElement.style.cursor = 'pointer';
    return;
  }

  // Stations
  const stationHits = raycaster.intersectObjects(stationsGroup.children.filter(c => c.userData.isActive && c.userData.type === 'station-fill'));
  if (stationHits.length > 0) {
    const hit = stationHits[0].object;
    if (hit !== hoveredObject) {
      resetHoveredObject();
      hoveredObject = hit;
      scaleObject(hit, 1.4);
      if (prefetchTimeout) clearTimeout(prefetchTimeout);
      prefetchTimeout = setTimeout(() => transitStore.prefetchDepartures(hit.userData.stationName), 200);
    }
    if (!mapStore.infoPanel.locked) {
      handleShowStation(hit.userData, e.clientX, e.clientY, false);
    }
    renderer.domElement.style.cursor = 'pointer';
    return;
  }

  resetHoveredObject();
  mapStore.hideInfo();
  renderer.domElement.style.cursor = 'grab';
}

function onMouseUp() { isPanning = false; renderer.domElement.style.cursor = 'grab'; }
function onMouseLeave() { isPanning = false; resetHoveredObject(); mapStore.hideInfo(); }

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
  setTimeout(() => {
    initThreeJS();
    transitStore.fetchTrains().then(updateTrainMarkers);
    refreshInterval = setInterval(() => transitStore.fetchTrains().then(updateTrainMarkers), 5000);
  }, 100);
});

onUnmounted(() => {
  if (animationId) cancelAnimationFrame(animationId);
  if (refreshInterval) clearInterval(refreshInterval);
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
  min-width: 260px;
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

/* Transport Type Grid */
.departures-container {
  padding-top: 4px;
}

.transport-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Single type: keep compact */
.transport-grid.single-type {
  max-width: 320px;
}

/* Multiple types: expand to grid */
.transport-grid.multi-type {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 6px;
}

.transport-card {
  border: 1px solid rgba(100, 120, 150, 0.2);
  background: rgba(20, 25, 40, 0.5);
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
  padding: 10px 16px;
  font-size: 11px;
  z-index: 1000;
  border: 1px solid rgba(100, 120, 150, 0.3);
  border-left: 3px solid #4a5a6a;
  letter-spacing: 0.5px;
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
</style>
