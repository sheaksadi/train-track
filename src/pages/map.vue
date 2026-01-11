<template>
  <div ref="container" class="threejs-map">
    <!-- Control Panel -->
    <div class="control-panel">
      <h3>S-Bahn Berlin 3D Map</h3>
      
      <div class="control-group">
        <label>
          <input type="checkbox" v-model="showStations" @change="updateScene" />
          Show Stations
        </label>
      </div>
      
      <div class="control-group">
        <label>
          <input type="checkbox" v-model="showLabels" @change="updateScene" />
          Show Station Names
        </label>
      </div>
      
      <div class="line-filters">
        <label>Show Lines:</label>
        <div class="filter-btns">
          <button 
            :class="{ active: showSbahn }" 
            @click="showSbahn = !showSbahn; updateScene()"
            style="background: #E52E12"
          >S-Bahn</button>
          <button 
            :class="{ active: showUbahn }" 
            @click="showUbahn = !showUbahn; updateScene()"
            style="background: #528DBA"
          >U-Bahn</button>
          <button 
            :class="{ active: showRegional }" 
            @click="showRegional = !showRegional; updateScene()"
            style="background: #666"
          >Regional</button>
        </div>
      </div>
      
      <div class="stats">
        <p>{{ stationCount }} stations | {{ lineCount }} lines</p>
      </div>
    </div>
    
    <!-- Hovered Station Info -->
    <div v-if="hoveredStation" class="station-info">
      <h4>{{ hoveredStation.displayName }}</h4>
      <div class="lines-list">
        <span 
          v-for="line in hoveredStation.lines" 
          :key="line"
          class="line-badge"
          :style="{ background: lineColors[line] || '#888' }"
        >{{ line }}</span>
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
import { ref, computed, onMounted, onUnmounted } from 'vue';
import * as THREE from 'three';
import { sbahnColors } from '../data/sbahn';
import { ubahnColors } from '../data/ubahn';

// Extracted station type
interface ExtractedStation {
  name: string;
  displayName: string;
  lat: number;
  lng: number;
  lines: string[];
}

// Container ref
const container = ref<HTMLElement | null>(null);

// UI state
const showStations = ref(true);
const showLabels = ref(false);
const showSbahn = ref(true);
const showUbahn = ref(true);
const showRegional = ref(false);
const hoveredStation = ref<ExtractedStation | null>(null);

// Merge line colors
const lineColors: Record<string, string> = {
  ...sbahnColors,
  ...ubahnColors,
};

// Stats
const stationCount = ref(0);
const lineCount = ref(0);

// Extracted stations data
let extractedStations: ExtractedStation[] = [];

// Three.js objects
let renderer: THREE.WebGLRenderer;
let scene: THREE.Scene;
let camera: THREE.OrthographicCamera;
let stationMeshes: THREE.Mesh[] = [];
let lineMeshes: THREE.Line[] = [];
let labelSprites: THREE.Sprite[] = [];
let raycaster: THREE.Raycaster;
let mouse: THREE.Vector2;
let animationId: number;

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

// Map coordinates to scene coordinates
function lngToX(lng: number): number {
  return ((lng - BERLIN_BOUNDS.minLng) / (BERLIN_BOUNDS.maxLng - BERLIN_BOUNDS.minLng) - 0.5) * 100;
}

function latToY(lat: number): number {
  return ((lat - BERLIN_BOUNDS.minLat) / (BERLIN_BOUNDS.maxLat - BERLIN_BOUNDS.minLat) - 0.5) * 70;
}

// Color helper
function hexToThreeColor(hex: string): THREE.Color {
  return new THREE.Color(hex);
}

// Initialize Three.js scene
function initScene() {
  if (!container.value) return;
  
  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e);
  
  // Camera (orthographic for 2D-like view)
  const aspect = container.value.clientWidth / container.value.clientHeight;
  const frustumSize = 60;
  camera = new THREE.OrthographicCamera(
    frustumSize * aspect / -2,
    frustumSize * aspect / 2,
    frustumSize / 2,
    frustumSize / -2,
    0.1,
    1000
  );
  camera.position.set(0, 0, 100);
  camera.lookAt(0, 0, 0);
  
  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.value.clientWidth, container.value.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.value.appendChild(renderer.domElement);
  
  // Raycaster for mouse interaction
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();
  
  // Event listeners
  window.addEventListener('resize', onWindowResize);
  container.value.addEventListener('wheel', onWheel);
  container.value.addEventListener('mousemove', onMouseMove);
  container.value.addEventListener('mousedown', onMouseDown);
  container.value.addEventListener('mouseup', onMouseUp);
}

// Load transit data and build scene
async function loadAndBuildScene() {
  try {
    // Load line data
    const linesRes = await fetch('/data/sbahn_map_data.json');
    if (linesRes.ok) {
      transitData = await linesRes.json();
      lineCount.value = Object.keys(transitData?.lines || {}).length;
    }
    
    // Load extracted stations
    const stationsRes = await fetch('/data/extracted_stations.json');
    if (stationsRes.ok) {
      const data = await stationsRes.json();
      extractedStations = data.stations || [];
      stationCount.value = extractedStations.length;
    }
  } catch (error) {
    console.error('Error loading data:', error);
  }
  
  updateScene();
}

// Build/update the 3D scene
function updateScene() {
  if (!scene) return;
  
  // Clear existing objects
  stationMeshes.forEach(m => scene.remove(m));
  lineMeshes.forEach(l => scene.remove(l));
  labelSprites.forEach(s => scene.remove(s));
  stationMeshes = [];
  lineMeshes = [];
  labelSprites = [];
  
  // Draw lines
  if (transitData) {
    for (const [lineName, line] of Object.entries(transitData.lines)) {
      // Filter by type
      if (lineName.startsWith('S') && !showSbahn.value) continue;
      if (lineName.startsWith('U') && !showUbahn.value) continue;
      if ((lineName.startsWith('R') || lineName === 'FEX') && !showRegional.value) continue;
      
      const color = hexToThreeColor(lineColors[lineName] || line.color || '#888888');
      const material = new THREE.LineBasicMaterial({ color, linewidth: 2 });
      
      for (const segment of line.segments) {
        for (const coordSet of segment.coordinates) {
          if (coordSet.length < 2) continue;
          
          const points: THREE.Vector3[] = [];
          for (const coord of coordSet) {
            const [lng, lat] = coord;
            points.push(new THREE.Vector3(lngToX(lng), latToY(lat), 0));
          }
          
          const geometry = new THREE.BufferGeometry().setFromPoints(points);
          const line3d = new THREE.Line(geometry, material);
          scene.add(line3d);
          lineMeshes.push(line3d);
        }
      }
    }
  }
  
  // Draw stations from extracted data (aligned with line coordinates)
  if (showStations.value && extractedStations.length > 0) {
    for (const station of extractedStations) {
      // Filter stations by visible lines
      const hasSbahn = station.lines.some(l => l.startsWith('S'));
      const hasUbahn = station.lines.some(l => l.startsWith('U'));
      const hasRegional = station.lines.some(l => l.startsWith('R') || l === 'FEX');
      
      let show = false;
      if (hasSbahn && showSbahn.value) show = true;
      if (hasUbahn && showUbahn.value) show = true;
      if (hasRegional && showRegional.value) show = true;
      if (!show) continue;
      
      // Station circle
      const x = lngToX(station.lng);
      const y = latToY(station.lat);
      const size = station.lines.length >= 4 ? 0.6 : station.lines.length >= 2 ? 0.5 : 0.4;
      
      const geometry = new THREE.CircleGeometry(size, 16);
      const primaryLine = station.lines[0];
      const color = hexToThreeColor(lineColors[primaryLine] || '#ffffff');
      const material = new THREE.MeshBasicMaterial({ color });
      
      // Add white outline
      const outlineGeometry = new THREE.RingGeometry(size, size + 0.1, 16);
      const outlineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const outlineMesh = new THREE.Mesh(outlineGeometry, outlineMaterial);
      outlineMesh.position.set(x, y, 0.5);
      scene.add(outlineMesh);
      stationMeshes.push(outlineMesh);
      
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, 1);
      mesh.userData = { station };
      
      scene.add(mesh);
      stationMeshes.push(mesh);
      
      // Station label
      if (showLabels.value) {
        const sprite = createTextSprite(station.displayName);
        sprite.position.set(x + 1, y, 2);
        scene.add(sprite);
        labelSprites.push(sprite);
      }
    }
  }
}

// Create text sprite for station labels
function createTextSprite(text: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;
  canvas.width = 256;
  canvas.height = 64;
  
  context.fillStyle = 'rgba(0, 0, 0, 0.7)';
  context.fillRect(0, 0, canvas.width, canvas.height);
  
  context.font = 'bold 24px Inter, sans-serif';
  context.fillStyle = '#ffffff';
  context.textAlign = 'left';
  context.textBaseline = 'middle';
  context.fillText(text, 8, canvas.height / 2);
  
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(4, 1, 1);
  
  return sprite;
}

// Event handlers
function onWindowResize() {
  if (!container.value || !camera || !renderer) return;
  
  const aspect = container.value.clientWidth / container.value.clientHeight;
  const frustumSize = 60;
  camera.left = frustumSize * aspect / -2;
  camera.right = frustumSize * aspect / 2;
  camera.top = frustumSize / 2;
  camera.bottom = frustumSize / -2;
  camera.updateProjectionMatrix();
  
  renderer.setSize(container.value.clientWidth, container.value.clientHeight);
}

let isPanning = false;
let panStart = { x: 0, y: 0 };
let cameraStart = { x: 0, y: 0 };

function onWheel(e: WheelEvent) {
  e.preventDefault();
  const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
  
  camera.left *= zoomFactor;
  camera.right *= zoomFactor;
  camera.top *= zoomFactor;
  camera.bottom *= zoomFactor;
  camera.updateProjectionMatrix();
}

function onMouseDown(e: MouseEvent) {
  isPanning = true;
  panStart = { x: e.clientX, y: e.clientY };
  cameraStart = { x: camera.position.x, y: camera.position.y };
}

function onMouseUp() {
  isPanning = false;
}

function onMouseMove(e: MouseEvent) {
  if (!container.value) return;
  
  if (isPanning) {
    const dx = (e.clientX - panStart.x) * (camera.right - camera.left) / container.value.clientWidth;
    const dy = (e.clientY - panStart.y) * (camera.top - camera.bottom) / container.value.clientHeight;
    camera.position.x = cameraStart.x - dx;
    camera.position.y = cameraStart.y + dy;
    return;
  }
  
  // Raycasting for hover
  const rect = container.value.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(stationMeshes);
  
  if (intersects.length > 0) {
    const obj = intersects[0].object;
    const data = obj.userData;
    if (data.station) {
      hoveredStation.value = data.station;
    }
  } else {
    hoveredStation.value = null;
  }
}

// UI controls
function zoomIn() {
  camera.left *= 0.8;
  camera.right *= 0.8;
  camera.top *= 0.8;
  camera.bottom *= 0.8;
  camera.updateProjectionMatrix();
}

function zoomOut() {
  camera.left *= 1.25;
  camera.right *= 1.25;
  camera.top *= 1.25;
  camera.bottom *= 1.25;
  camera.updateProjectionMatrix();
}

function resetView() {
  if (!container.value) return;
  const aspect = container.value.clientWidth / container.value.clientHeight;
  const frustumSize = 60;
  camera.left = frustumSize * aspect / -2;
  camera.right = frustumSize * aspect / 2;
  camera.top = frustumSize / 2;
  camera.bottom = frustumSize / -2;
  camera.position.set(0, 0, 100);
  camera.updateProjectionMatrix();
}

// Animation loop
function animate() {
  animationId = requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

// Lifecycle
onMounted(() => {
  initScene();
  loadAndBuildScene();
  animate();
});

onUnmounted(() => {
  cancelAnimationFrame(animationId);
  window.removeEventListener('resize', onWindowResize);
  if (container.value && renderer) {
    container.value.removeChild(renderer.domElement);
  }
  renderer?.dispose();
});
</script>

<style scoped>
.threejs-map {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  position: relative;
  background: #1a1a2e;
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
  width: 260px;
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
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: rgba(255,255,255,0.8);
  cursor: pointer;
}

.control-group input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.line-filters {
  margin: 16px 0;
  padding-top: 12px;
  border-top: 1px solid rgba(255,255,255,0.1);
}

.line-filters > label {
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

.stats {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(255,255,255,0.1);
}

.stats p {
  margin: 0;
  font-size: 11px;
  color: rgba(255,255,255,0.5);
}

.station-info {
  position: fixed;
  bottom: 24px;
  left: 16px;
  background: rgba(30, 30, 35, 0.95);
  border-radius: 10px;
  padding: 12px 16px;
  color: #fff;
  font-family: 'Inter', -apple-system, sans-serif;
  z-index: 1000;
  min-width: 180px;
}

.station-info h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 600;
}

.lines-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.line-badge {
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  color: #fff;
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
