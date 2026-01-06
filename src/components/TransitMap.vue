<template>
  <div class="transit-map">
    <div ref="canvasContainer" class="canvas-container"></div>
    
    <!-- Info Panel -->
    <div 
      v-if="mapStore.infoPanel.visible" 
      class="info-panel"
      :style="{ left: mapStore.infoPanel.x + 'px', top: mapStore.infoPanel.y + 'px', borderLeftColor: mapStore.infoPanel.color }"
    >
      <div class="info-header">{{ mapStore.infoPanel.title }}</div>
      <div class="info-lines" v-if="mapStore.infoPanel.lines">{{ mapStore.infoPanel.lines }}</div>
    </div>
    
    <!-- Legend -->
    <div class="legend">
      <div class="legend-header">
        <div class="legend-title">U-BAHN BERLIN</div>
        <div class="legend-filters">
          <button @click="showAll" class="filter-btn">All</button>
          <button @click="showNone" class="filter-btn">None</button>
        </div>
      </div>
      
      <div class="legend-items">
        <button
          v-for="(color, line) in ubahnColors"
          :key="line"
          @click="toggleLine(line as string)"
          class="legend-btn"
          :class="{ active: transitStore.enabledLines[line as string] }"
          :style="transitStore.enabledLines[line as string] ? { backgroundColor: color, borderColor: color } : {}"
        >{{ line }}</button>
      </div>
    </div>
    
    <!-- Zoom Controls -->
    <div class="zoom-controls">
      <button @click="handleZoomIn" class="zoom-btn">+</button>
      <button @click="handleZoomOut" class="zoom-btn">−</button>
      <button @click="handleReset" class="zoom-btn">⌂</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import * as THREE from 'three';
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useTransitStore, svgToScene, allLineColors, allLines, allStations } from '@/stores/transitStore';
import { useMapStore } from '@/stores/mapStore';
import { ubahnColors, ubahnLines, ubahnStations } from '@/data/ubahn_precise';

const transitStore = useTransitStore();
const mapStore = useMapStore();

const canvasContainer = ref<HTMLElement | null>(null);

// Three.js objects
let scene: THREE.Scene;
let camera: THREE.OrthographicCamera;
let renderer: THREE.WebGLRenderer;
let animationId: number;
let linesGroup: THREE.Group;
let stationsGroup: THREE.Group;
let raycaster: THREE.Raycaster;
let mouse: THREE.Vector2;

// Pan state
let isPanning = false;
let panStart = { x: 0, y: 0 };
let cameraStart = { x: 0, y: 0 };

// SVG dimensions for scaling
const SVG_WIDTH = 1190.55;
const SVG_HEIGHT = 841.89;

function initThreeJS() {
  const container = canvasContainer.value;
  if (!container) return;
  
  const width = container.clientWidth;
  const height = container.clientHeight;
  
  // Scene with light gray background (like official map)
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf5f5f5);
  
  // Groups for layering
  linesGroup = new THREE.Group();
  stationsGroup = new THREE.Group();
  scene.add(linesGroup);
  scene.add(stationsGroup);
  
  // Camera - orthographic for schematic view
  // Match aspect ratio to SVG viewBox
  const aspect = width / height;
  const viewHeight = SVG_HEIGHT / 2;
  const viewWidth = viewHeight * aspect;
  
  camera = new THREE.OrthographicCamera(
    -viewWidth, viewWidth,
    viewHeight, -viewHeight,
    0.1, 1000
  );
  camera.position.z = 100;
  
  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);
  
  // Raycaster for interaction
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();
  
  // Draw the map
  drawAllLines();
  drawAllStations();
  
  // Event listeners
  renderer.domElement.addEventListener('wheel', onWheel, { passive: false });
  renderer.domElement.addEventListener('mousedown', onMouseDown);
  renderer.domElement.addEventListener('mousemove', onMouseMove);
  renderer.domElement.addEventListener('mouseup', onMouseUp);
  renderer.domElement.addEventListener('mouseleave', onMouseLeave);
  window.addEventListener('resize', onResize);
  
  animate();
}

function drawAllLines() {
  // Clear existing
  while (linesGroup.children.length > 0) {
    linesGroup.remove(linesGroup.children[0]);
  }
  
  // Draw each U-Bahn line
  Object.entries(ubahnLines).forEach(([lineName, stationNames]) => {
    if (!transitStore.enabledLines[lineName]) return;
    
    const color = ubahnColors[lineName] || '#888';
    const points: THREE.Vector3[] = [];
    
    stationNames.forEach(stationName => {
      const station = ubahnStations[stationName];
      if (station) {
        const { x, y } = svgToScene(station.x, station.y);
        points.push(new THREE.Vector3(x, y, 0));
      }
    });
    
    if (points.length >= 2) {
      const line = createThickLine(points, color, 5);
      line.userData = { lineName, type: 'line' };
      linesGroup.add(line);
    }
  });
}

function createThickLine(points: THREE.Vector3[], color: string, thickness: number): THREE.Mesh {
  if (points.length < 2) return new THREE.Mesh();
  
  const shape = new THREE.Shape();
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

function drawAllStations() {
  // Clear existing
  while (stationsGroup.children.length > 0) {
    stationsGroup.remove(stationsGroup.children[0]);
  }
  
  const drawnStations = new Set<string>();
  
  // Draw stations for enabled lines
  Object.entries(ubahnLines).forEach(([lineName, stationNames]) => {
    if (!transitStore.enabledLines[lineName]) return;
    
    stationNames.forEach(stationName => {
      if (drawnStations.has(stationName)) return;
      
      const station = ubahnStations[stationName];
      if (!station) return;
      
      drawnStations.add(stationName);
      
      const { x, y } = svgToScene(station.x, station.y);
      const isInterchange = station.lines.length > 1;
      
      // Outer ring (white)
      const outerRadius = isInterchange ? 8 : 5;
      const outerGeom = new THREE.CircleGeometry(outerRadius, 24);
      const outerMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const outer = new THREE.Mesh(outerGeom, outerMat);
      outer.position.set(x, y, 1);
      outer.userData = { name: station.name, lines: station.lines, type: 'station' };
      stationsGroup.add(outer);
      
      // Border
      const borderGeom = new THREE.RingGeometry(outerRadius - 1.5, outerRadius, 24);
      const borderMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
      const border = new THREE.Mesh(borderGeom, borderMat);
      border.position.set(x, y, 2);
      stationsGroup.add(border);
      
      // Inner fill for non-interchange
      if (!isInterchange) {
        const primaryColor = allLineColors[station.lines[0]] || '#888';
        const innerGeom = new THREE.CircleGeometry(3, 24);
        const innerMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(primaryColor) });
        const inner = new THREE.Mesh(innerGeom, innerMat);
        inner.position.set(x, y, 3);
        stationsGroup.add(inner);
      }
    });
  });
}

function toggleLine(line: string) {
  transitStore.toggleLine(line);
  redraw();
}

function showAll() {
  transitStore.showAll();
  redraw();
}

function showNone() {
  transitStore.showNone();
  redraw();
}

function redraw() {
  drawAllLines();
  drawAllStations();
}

watch(() => transitStore.enabledLines, redraw, { deep: true });

function updateCamera() {
  if (!camera || !canvasContainer.value) return;
  
  const width = canvasContainer.value.clientWidth;
  const height = canvasContainer.value.clientHeight;
  const aspect = width / height;
  const viewHeight = (SVG_HEIGHT / 2) / mapStore.currentZoom;
  const viewWidth = viewHeight * aspect;
  
  camera.left = -viewWidth + mapStore.cameraX;
  camera.right = viewWidth + mapStore.cameraX;
  camera.top = viewHeight + mapStore.cameraY;
  camera.bottom = -viewHeight + mapStore.cameraY;
  camera.updateProjectionMatrix();
}

function handleZoomIn() {
  mapStore.zoomIn();
  updateCamera();
}

function handleZoomOut() {
  mapStore.zoomOut();
  updateCamera();
}

function handleReset() {
  mapStore.resetZoom();
  updateCamera();
}

function onWheel(e: WheelEvent) {
  e.preventDefault();
  const delta = e.deltaY < 0 ? 0.15 : -0.12;
  if (delta > 0) mapStore.zoomIn(delta);
  else mapStore.zoomOut(-delta);
  updateCamera();
}

function onMouseDown(e: MouseEvent) {
  isPanning = true;
  panStart = { x: e.clientX, y: e.clientY };
  cameraStart = { x: mapStore.cameraX, y: mapStore.cameraY };
  renderer.domElement.style.cursor = 'grabbing';
}

function onMouseMove(e: MouseEvent) {
  if (isPanning) {
    const dx = (e.clientX - panStart.x) / mapStore.currentZoom;
    const dy = (e.clientY - panStart.y) / mapStore.currentZoom;
    mapStore.cameraX = cameraStart.x - dx * 0.8;
    mapStore.cameraY = cameraStart.y + dy * 0.8;
    updateCamera();
  } else {
    // Hover detection
    const rect = canvasContainer.value?.getBoundingClientRect();
    if (!rect) return;
    
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(stationsGroup.children);
    
    if (hits.length > 0) {
      const hit = hits[0].object;
      const data = hit.userData;
      if (data.name) {
        const color = allLineColors[data.lines?.[0]] || '#333';
        mapStore.showStationInfo(data.name, data.lines || [], color, e.clientX, e.clientY);
        renderer.domElement.style.cursor = 'pointer';
        return;
      }
    }
    
    mapStore.hideInfo();
    renderer.domElement.style.cursor = 'grab';
  }
}

function onMouseUp() {
  isPanning = false;
  renderer.domElement.style.cursor = 'grab';
}

function onMouseLeave() {
  isPanning = false;
}

function onResize() {
  if (!canvasContainer.value || !renderer || !camera) return;
  const width = canvasContainer.value.clientWidth;
  const height = canvasContainer.value.clientHeight;
  renderer.setSize(width, height);
  updateCamera();
}

function animate() {
  animationId = requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

onMounted(() => {
  initThreeJS();
});

onUnmounted(() => {
  if (animationId) cancelAnimationFrame(animationId);
  if (renderer) renderer.dispose();
});
</script>

<style scoped>
.transit-map {
  width: 100vw;
  height: 100vh;
  position: relative;
  overflow: hidden;
  background: #f5f5f5;
}

.canvas-container {
  width: 100%;
  height: 100%;
  cursor: grab;
}

.info-panel {
  position: fixed;
  background: rgba(255, 255, 255, 0.98);
  border-left: 4px solid #333;
  border-radius: 6px;
  padding: 10px 14px;
  color: #222;
  font-family: 'Inter', -apple-system, sans-serif;
  min-width: 160px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.15);
  z-index: 100;
  pointer-events: none;
}

.info-header {
  font-weight: 700;
  font-size: 14px;
  margin-bottom: 4px;
}

.info-lines {
  font-size: 12px;
  color: #666;
}

.legend {
  position: fixed;
  left: 16px;
  top: 16px;
  background: rgba(255, 255, 255, 0.98);
  border-radius: 10px;
  padding: 14px;
  color: #222;
  font-family: 'Inter', -apple-system, sans-serif;
  z-index: 50;
  box-shadow: 0 2px 12px rgba(0,0,0,0.1);
}

.legend-header {
  margin-bottom: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.legend-title {
  font-weight: 700;
  font-size: 13px;
  color: #222;
  letter-spacing: 0.5px;
}

.legend-filters {
  display: flex;
  gap: 4px;
}

.filter-btn {
  padding: 4px 8px;
  border: none;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
  background: rgba(0,0,0,0.05);
  color: #666;
  transition: all 0.2s;
}

.filter-btn:hover {
  background: rgba(0,0,0,0.1);
  color: #222;
}

.legend-items {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.legend-btn {
  padding: 5px 10px;
  border: 2px solid #ccc;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  background: #fff;
  color: #999;
  transition: all 0.15s;
}

.legend-btn.active {
  color: #fff;
  border-color: transparent;
}

.legend-btn:hover {
  opacity: 0.9;
}

.zoom-controls {
  position: fixed;
  bottom: 24px;
  right: 24px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 50;
}

.zoom-btn {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 8px;
  font-size: 20px;
  font-weight: 400;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.98);
  color: #333;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.zoom-btn:hover {
  background: #fff;
  box-shadow: 0 2px 12px rgba(0,0,0,0.15);
}
</style>
