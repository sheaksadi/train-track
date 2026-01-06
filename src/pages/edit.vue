<template>
  <div class="editor-page">
    <!-- Header -->
    <header class="editor-header">
      <div class="header-left">
        <router-link to="/" class="back-btn">← Back</router-link>
        <h1>Map Editor</h1>
      </div>
      <div class="header-right">
        <span class="save-status" v-if="saveStatus">{{ saveStatus }}</span>
        <button @click="handleClear" class="btn btn-danger">
          🗑 Clear All
        </button>
      </div>
    </header>

    <div class="editor-content">
      <!-- Tools Panel -->
      <aside class="tools-panel">
        <div class="tools-section">
          <h3>Tools</h3>
          <div class="tool-buttons">
            <button 
              v-for="tool in tools" 
              :key="tool.id"
              @click="editorStore.selectedTool = tool.id"
              :class="['tool-btn', { active: editorStore.selectedTool === tool.id }]"
              :title="`${tool.label} (${tool.shortcut})`"
            >
              <span class="tool-icon">{{ tool.icon }}</span>
              <span class="tool-label">{{ tool.label }}</span>
              <span class="tool-shortcut">{{ tool.shortcut }}</span>
            </button>
          </div>
        </div>

        <div class="tools-section">
          <h3>Current Line</h3>
          <select v-model="editorStore.currentLine" class="line-select">
            <option v-for="line in allLines" :key="line" :value="line">
              {{ line }}
            </option>
          </select>
          <div 
            class="line-preview" 
            :style="{ backgroundColor: getLineColor(editorStore.currentLine) }"
          ></div>
        </div>

        <div class="tools-section">
          <label class="toggle-row">
            <input type="checkbox" v-model="autoConnect" />
            <span>Auto-connect tracks</span>
          </label>
        </div>

        <div class="tools-section" v-if="autoConnect && nextStationSuggestion">
          <h3>Next Station</h3>
          <div class="next-station-hint">{{ nextStationSuggestion }}</div>
        </div>

        <div class="tools-section">
          <h3>Map Opacity</h3>
          <input 
            type="range" 
            v-model.number="editorStore.mapOpacity" 
            min="0" 
            max="100" 
            class="opacity-slider"
          />
          <span class="opacity-value">{{ editorStore.mapOpacity }}%</span>
        </div>

        <div class="tools-section stats">
          <h3>Statistics</h3>
          <div class="stat">Stations: {{ editorStore.stations.length }}</div>
          <div class="stat">Tracks: {{ editorStore.tracks.length }}</div>
          <div class="stat">Zoom: {{ Math.round(zoom * 100) }}%</div>
        </div>

        <div class="tools-section shortcuts">
          <h3>Shortcuts</h3>
          <div class="shortcut">Right-click: Pan</div>
          <div class="shortcut">Scroll: Zoom</div>
          <div class="shortcut">Del: Delete</div>
          <div class="shortcut">R: Rotate +15°</div>
        </div>
      </aside>

      <!-- Canvas Area -->
      <main class="canvas-area">
        <div 
          ref="canvasContainer"
          class="canvas-container"
          :class="{ 
            'pan-cursor': editorStore.selectedTool === 'pan' || isRightMousePanning, 
            'move-cursor': editorStore.selectedTool === 'move',
            'grabbing': isPanning 
          }"
          @wheel.prevent="handleWheel"
          @mousedown="handleMouseDown"
          @mousemove="handleMouseMove"
          @mouseup="handleMouseUp"
          @mouseleave="handleMouseUp"
          @click="handleCanvasClick"
          @contextmenu.prevent
        >
          <!-- BVG Map Background -->
          <div 
            class="map-background"
            :style="{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              opacity: editorStore.mapOpacity / 100,
            }"
          >
            <img 
              src="/bvg_map.svg" 
              alt="BVG Map" 
              class="bvg-map"
              draggable="false"
            />
          </div>

          <!-- Editor Canvas Overlay -->
          <svg 
            class="editor-overlay"
            :style="{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            }"
            :viewBox="`0 0 ${canvasWidth} ${canvasHeight}`"
          >
            <!-- Tracks (rendered as paths with waypoints) -->
            <g v-for="track in editorStore.tracks" :key="track.id">
              <path
                :d="getTrackPath(track)"
                :stroke="getLineColor(track.line)"
                :stroke-width="trackWidth"
                stroke-linecap="round"
                stroke-linejoin="round"
                fill="none"
                class="track-line"
                :class="{ selected: editorStore.selectedTrackId === track.id }"
                @click.stop="handleTrackClick(track)"
              />
              
              <!-- Waypoints (visible when track is selected or in bend mode) -->
              <g v-if="editorStore.selectedTrackId === track.id || editorStore.selectedTool === 'bend'">
                <circle
                  v-for="waypoint in track.waypoints"
                  :key="waypoint.id"
                  :cx="waypoint.x"
                  :cy="waypoint.y"
                  :r="waypointRadius"
                  class="waypoint"
                  :class="{ selected: editorStore.selectedWaypointId === waypoint.id }"
                  @mousedown.stop="handleWaypointMouseDown($event, track, waypoint)"
                  @click.stop="handleWaypointClick(track, waypoint)"
                />
              </g>
              
              <!-- Endpoint handles (visible when track is selected) -->
              <g v-if="editorStore.selectedTrackId === track.id">
                <circle
                  v-for="(endpoint, idx) in getTrackEndpoints(track)"
                  :key="`ep-${idx}`"
                  :cx="endpoint.x"
                  :cy="endpoint.y"
                  :r="endpointRadius"
                  class="track-endpoint"
                  :class="{ dragging: draggingEndpoint?.trackId === track.id && draggingEndpoint?.endpoint === idx + 1 }"
                  @mousedown.stop="handleEndpointMouseDown($event, track, idx + 1)"
                />
              </g>
            </g>

            <!-- Stations -->
            <g
              v-for="station in editorStore.stations"
              :key="station.id"
              class="station-group"
              :class="{ 
                selected: editorStore.selectedStationId === station.id,
                'multi-connect': editorStore.multiConnectStations.includes(station.id),
                dragging: draggingStationId === station.id,
              }"
              :transform="`translate(${station.x}, ${station.y}) rotate(${station.rotation || 0})`"
              @mousedown.stop="handleStationMouseDown($event, station)"
              @click.stop="handleStationClick(station)"
            >
              <!-- Circle (default) or Pill shape (when length > 10) -->
              <circle
                v-if="!station.length || station.length <= 10"
                :r="stationRadius"
                :fill="getStationFill(station)"
                stroke="white"
                :stroke-width="stationStrokeWidth"
                class="station-circle"
              />
              <rect
                v-else
                :x="-station.length / 2"
                :y="-stationHeight / 2"
                :width="station.length"
                :height="stationHeight"
                :rx="stationHeight / 2"
                :ry="stationHeight / 2"
                :fill="getStationFill(station)"
                stroke="white"
                :stroke-width="stationStrokeWidth"
                class="station-pill"
              />
              
              <!-- Multiple line indicators (only for pill shape) -->
              <g v-if="station.lines.length > 1 && station.length && station.length > 10">
                <rect
                  v-for="(line, index) in station.lines.slice(0, 4)"
                  :key="line"
                  :x="-station.length / 2 + 2 + index * (station.length - 4) / Math.min(station.lines.length, 4)"
                  :y="-stationHeight / 2 + 2"
                  :width="(station.length - 4) / Math.min(station.lines.length, 4) - 1"
                  :height="stationHeight - 4"
                  :rx="2"
                  :fill="getLineColor(line)"
                  class="line-segment"
                />
              </g>
              
              <!-- Label (positioned with offset, draggable when selected) -->
              <g 
                v-if="zoom > 0.4"
                :transform="`rotate(${-(station.rotation || 0)}) translate(${station.labelOffsetX || 0}, ${station.labelOffsetY ?? -15})`"
              >
                <!-- Connector line when selected -->
                <line
                  v-if="editorStore.selectedStationId === station.id"
                  :x1="-(station.labelOffsetX || 0)"
                  :y1="-(station.labelOffsetY ?? -15)"
                  x2="0"
                  y2="0"
                  stroke="rgba(79, 70, 229, 0.5)"
                  stroke-width="1"
                  stroke-dasharray="2,2"
                  class="label-connector"
                />
                <text
                  x="0"
                  y="0"
                  text-anchor="middle"
                  class="station-label"
                  :class="{ 'label-draggable': editorStore.selectedStationId === station.id }"
                  :style="{ fontSize: `${station.labelFontSize || 8}px` }"
                  @mousedown.stop="handleLabelMouseDown($event, station)"
                >{{ station.name }}</text>
                
                <!-- Resize handle (when selected) -->
                <circle
                  v-if="editorStore.selectedStationId === station.id"
                  :cx="measureTextWidth(station.name, station.labelFontSize || 8) / 2 + 4"
                  cy="0"
                  r="4"
                  class="label-resize-handle"
                  @mousedown.stop="handleLabelResizeMouseDown($event, station)"
                />
              </g>
            </g>

            <!-- Multi-connect preview line -->
            <line
              v-if="editorStore.selectedTool === 'multiConnect' && editorStore.multiConnectStations.length > 0 && mousePosition"
              :x1="getStationById(editorStore.multiConnectStations[editorStore.multiConnectStations.length - 1])?.x || 0"
              :y1="getStationById(editorStore.multiConnectStations[editorStore.multiConnectStations.length - 1])?.y || 0"
              :x2="mousePosition.x"
              :y2="mousePosition.y"
              :stroke="getLineColor(editorStore.currentLine)"
              :stroke-width="trackWidth / 2"
              stroke-dasharray="5,5"
              class="preview-line"
            />
          </svg>

          <!-- Zoom Controls -->
          <div class="zoom-controls">
            <button @click="zoomIn" class="zoom-btn">+</button>
            <button @click="zoomOut" class="zoom-btn">−</button>
            <button @click="resetView" class="zoom-btn">⌂</button>
          </div>
        </div>
      </main>

      <!-- Properties Panel (always visible) -->
      <aside class="properties-panel">
        <h3>Properties</h3>
        
        <div v-if="editorStore.selectedStation" class="property-content">
          <div class="property-group">
            <label>Station Name</label>
            <select 
              :value="editorStore.selectedStation.name"
              @change="updateStationName($event)"
              class="name-select"
            >
              <option 
                v-for="name in ['Custom...', ...allStationNames]" 
                :key="name" 
                :value="name"
              >{{ name }}</option>
            </select>
            <input 
              v-if="editorStore.selectedStation.name === 'Custom...'" 
              v-model="customStationName"
              @blur="applyCustomName"
              placeholder="Enter station name"
              class="custom-name-input"
            />
          </div>

          <div class="property-group">
            <label>Lines ({{ editorStore.selectedStation.lines.length }})</label>
            <div class="lines-grid">
              <button
                v-for="line in allLines"
                :key="line"
                @click="toggleStationLine(line)"
                :class="['line-btn', { active: editorStore.selectedStation.lines.includes(line) }]"
                :style="editorStore.selectedStation.lines.includes(line) ? { backgroundColor: getLineColor(line) } : {}"
              >{{ line }}</button>
            </div>
          </div>

          <div class="property-group">
            <label>Rotation: {{ editorStore.selectedStation.rotation }}°</label>
            <input 
              type="range" 
              :value="editorStore.selectedStation.rotation"
              @input="updateStationRotation($event)"
              min="0" 
              max="180" 
              step="15"
              class="rotation-slider"
            />
            <div class="rotation-buttons">
              <button @click="rotateStation(-15)" class="btn btn-small">-15°</button>
              <button @click="rotateStation(15)" class="btn btn-small">+15°</button>
              <button @click="rotateStation(-editorStore.selectedStation.rotation)" class="btn btn-small">Reset</button>
            </div>
          </div>

          <div class="property-group">
            <label>Length: {{ editorStore.selectedStation.length }}px</label>
            <input 
              type="range" 
              :value="editorStore.selectedStation.length"
              @input="updateStationLength($event)"
              min="10" 
              max="80" 
              step="5"
              class="length-slider"
            />
          </div>

          <div class="property-group">
            <label>Label Font Size: {{ editorStore.selectedStation.labelFontSize || 8 }}px</label>
            <input 
              type="range" 
              :value="editorStore.selectedStation.labelFontSize || 8"
              @input="updateLabelFontSize($event)"
              min="6" 
              max="24" 
              step="1"
              class="length-slider"
            />
            <button @click="resetLabelPosition" class="btn btn-small btn-secondary">
              Reset Label Position
            </button>
          </div>

          <div class="property-group">
            <label>Position</label>
            <div class="position-inputs">
              <input 
                type="number" 
                :value="Math.round(editorStore.selectedStation.x)"
                @input="updateStationPosition('x', $event)"
                placeholder="X"
              />
              <input 
                type="number" 
                :value="Math.round(editorStore.selectedStation.y)"
                @input="updateStationPosition('y', $event)"
                placeholder="Y"
              />
            </div>
          </div>

          <button @click="deleteSelectedStation" class="btn btn-danger delete-btn">
            🗑 Delete Station
          </button>
        </div>

        <div v-else-if="editorStore.selectedTrack" class="property-content">
          <div class="property-group">
            <label>Track Line</label>
            <select 
              :value="editorStore.selectedTrack.line"
              @change="updateTrackLine($event)"
              class="line-select"
            >
              <option v-for="line in allLines" :key="line" :value="line">
                {{ line }}
              </option>
            </select>
          </div>
          
          <div class="property-group">
            <label>Bend Points: {{ editorStore.selectedTrack.waypoints.length }}</label>
            <button 
              v-if="editorStore.selectedTrack.waypoints.length > 0"
              @click="clearTrackWaypoints" 
              class="btn btn-secondary"
            >
              Clear All Bends
            </button>
          </div>
          
          <button @click="deleteSelectedTrack" class="btn btn-danger delete-btn">
            🗑 Delete Track
          </button>
        </div>

        <div v-else-if="editorStore.selectedWaypointId && selectedWaypointTrack" class="property-content">
          <div class="property-group">
            <label>Bend Point</label>
            <p class="hint">Drag to reposition</p>
          </div>
          <button @click="deleteSelectedWaypoint" class="btn btn-danger delete-btn">
            🗑 Delete Bend Point
          </button>
        </div>

        <div v-else class="property-placeholder">
          <p>Select a station or track</p>
          <p class="hint">Click existing station to add tracks</p>
          <p class="hint">Use R to rotate selected station</p>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import { useEditorStore, type EditorStation, type EditorTrack, type Waypoint } from '@/stores/editorStore';
import { allStationNames, allLines, getLineColor } from '@/data/stationNames';
import { ubahnLines } from '@/data/ubahn';
import { sbahnLines } from '@/data/sbahn';

const editorStore = useEditorStore();

// Canvas dimensions
const canvasWidth = 1190;
const canvasHeight = 842;

// View state
const zoom = ref(1);
const pan = reactive({ x: 0, y: 0 });
const isPanning = ref(false);
const isRightMousePanning = ref(false);
const panStart = reactive({ x: 0, y: 0 });
const panOffset = reactive({ x: 0, y: 0 });
const mousePosition = ref<{ x: number; y: number } | null>(null);

// Dragging state
const draggingStationId = ref<string | null>(null);
const draggingWaypoint = ref<{ trackId: string; waypointId: string } | null>(null);
const draggingEndpoint = ref<{ trackId: string; endpoint: 1 | 2; stationId: string } | null>(null);
const draggingLabel = ref<{ stationId: string; startX: number; startY: number; startOffsetX: number; startOffsetY: number } | null>(null);
const resizingLabel = ref<{ stationId: string; startX: number; startFontSize: number } | null>(null);

// UI refs
const canvasContainer = ref<HTMLElement | null>(null);
const customStationName = ref('');
const saveStatus = ref('');

// Auto-connect feature
const autoConnect = ref(true);
const lastPlacedStationId = ref<string | null>(null);

// Find track containing selected waypoint
const selectedWaypointTrack = computed(() => {
  if (!editorStore.selectedWaypointId) return null;
  return editorStore.tracks.find(t => 
    t.waypoints.some(w => w.id === editorStore.selectedWaypointId)
  ) || null;
});

// Compute next station suggestion
const nextStationSuggestion = computed(() => {
  if (!autoConnect.value) return null;
  
  const currentLine = editorStore.currentLine;
  const lineStations = { ...ubahnLines, ...sbahnLines }[currentLine];
  if (!lineStations) return null;
  
  const placedNames = editorStore.stations
    .filter(s => s.lines.includes(currentLine))
    .map(s => s.name);
  
  for (const stationName of lineStations) {
    if (!placedNames.includes(stationName)) {
      return stationName;
    }
  }
  
  return null;
});

// Computed sizes
const stationRadius = computed(() => Math.max(3, 5 / zoom.value));
const stationHeight = computed(() => Math.max(6, 8 / zoom.value));
const stationStrokeWidth = computed(() => Math.max(1, 1.5 / zoom.value));
const trackWidth = computed(() => Math.max(2, 3 / zoom.value));
const labelFontSize = computed(() => Math.max(6, 8 / zoom.value));
const waypointRadius = computed(() => Math.max(3, 4 / zoom.value));
const endpointRadius = computed(() => Math.max(4, 5 / zoom.value));

// Tool definitions
const tools = [
  { id: 'select', icon: '👆', label: 'Select', shortcut: 'V' },
  { id: 'pan', icon: '✋', label: 'Pan', shortcut: 'H' },
  { id: 'move', icon: '↔️', label: 'Move', shortcut: 'G' },
  { id: 'station', icon: '📍', label: 'Station', shortcut: 'S' },
  { id: 'track', icon: '🔗', label: 'Track', shortcut: 'T' },
  { id: 'bend', icon: '〰️', label: 'Bend', shortcut: 'B' },
  { id: 'multiConnect', icon: '⛓', label: 'Multi', shortcut: 'M' },
] as const;

// Track connection state
const trackStartStation = ref<string | null>(null);

// Helpers
function getStationById(id: string): EditorStation | undefined {
  return editorStore.stations.find(s => s.id === id);
}

// Helper to measure text width (approximate)
function measureTextWidth(text: string, fontSize: number): number {
  return text.length * fontSize * 0.6;
}

function getStationFill(station: EditorStation): string {
  if (station.lines.length === 0) return '#888';
  if (station.lines.length === 1) return getLineColor(station.lines[0]);
  return '#fff'; // Multi-line stations show white with colored segments
}

// Get connection point on a station for a specific track
function getTrackConnectionPoint(station: EditorStation, track: EditorTrack, isStart: boolean): { x: number; y: number } {
  // For circle stations (no length or length <= 10), always connect to center
  if (!station.length || station.length <= 10) {
    return { x: station.x, y: station.y };
  }
  
  // Check for custom offset
  const customOffset = isStart ? track.offset1 : track.offset2;
  
  let offset: number;
  
  if (customOffset !== undefined) {
    // Use custom offset (stored as value between -1 and 1)
    offset = customOffset * (station.length / 2 - 4);
  } else {
    // Auto-calculate offset based on track index
    const connectedTracks = editorStore.tracks.filter(
      t => t.stationIds[0] === station.id || t.stationIds[1] === station.id
    );
    
    if (connectedTracks.length <= 1) {
      return { x: station.x, y: station.y };
    }
    
    const trackIndex = connectedTracks.findIndex(t => t.id === track.id);
    if (trackIndex === -1) return { x: station.x, y: station.y };
    
    const usableLength = station.length - 8;
    const spacing = usableLength / Math.max(connectedTracks.length - 1, 1);
    offset = -usableLength / 2 + trackIndex * spacing;
  }
  
  // Apply rotation to get final position
  const rotation = (station.rotation || 0) * Math.PI / 180;
  const offsetX = offset * Math.cos(rotation);
  const offsetY = offset * Math.sin(rotation);
  
  return {
    x: station.x + offsetX,
    y: station.y + offsetY,
  };
}

// Get the two endpoints of a track for rendering handles
function getTrackEndpoints(track: EditorTrack): [{ x: number; y: number }, { x: number; y: number }] {
  const s1 = getStationById(track.stationIds[0]);
  const s2 = getStationById(track.stationIds[1]);
  if (!s1 || !s2) return [{ x: 0, y: 0 }, { x: 0, y: 0 }];
  
  return [
    getTrackConnectionPoint(s1, track, true),
    getTrackConnectionPoint(s2, track, false),
  ];
}

function getTrackPath(track: EditorTrack): string {
  const s1 = getStationById(track.stationIds[0]);
  const s2 = getStationById(track.stationIds[1]);
  if (!s1 || !s2) return '';
  
  // Get connection points (offset for multi-track stations)
  const p1 = getTrackConnectionPoint(s1, track, true);
  const p2 = getTrackConnectionPoint(s2, track, false);
  
  const points = [
    p1,
    ...track.waypoints,
    p2,
  ];
  
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }
  
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    path += ` L ${points[i].x} ${points[i].y}`;
  }
  return path;
}

function findWaypointInsertIndex(track: EditorTrack, x: number, y: number): number {
  const s1 = getStationById(track.stationIds[0]);
  const s2 = getStationById(track.stationIds[1]);
  if (!s1 || !s2) return 0;
  
  const p1 = getTrackConnectionPoint(s1, track, true);
  const p2 = getTrackConnectionPoint(s2, track, false);
  
  const points = [
    p1,
    ...track.waypoints,
    p2,
  ];
  
  let minDist = Infinity;
  let insertIndex = 0;
  
  for (let i = 0; i < points.length - 1; i++) {
    const pt1 = points[i];
    const pt2 = points[i + 1];
    const dist = pointToSegmentDistance(x, y, pt1.x, pt1.y, pt2.x, pt2.y);
    if (dist < minDist) {
      minDist = dist;
      insertIndex = i;
    }
  }
  
  return insertIndex;
}

function pointToSegmentDistance(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy;
  
  if (lengthSq === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
  
  let t = ((px - x1) * dx + (py - y1) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));
  
  const nearestX = x1 + t * dx;
  const nearestY = y1 + t * dy;
  
  return Math.sqrt((px - nearestX) ** 2 + (py - nearestY) ** 2);
}

function showSaveStatus() {
  saveStatus.value = '✓ Saved';
  setTimeout(() => { saveStatus.value = ''; }, 1500);
}

// Event handlers
function handleWheel(e: WheelEvent) {
  const rect = canvasContainer.value?.getBoundingClientRect();
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

function handleMouseDown(e: MouseEvent) {
  if (e.button === 2) {
    isRightMousePanning.value = true;
    isPanning.value = true;
    panStart.x = e.clientX;
    panStart.y = e.clientY;
    panOffset.x = pan.x;
    panOffset.y = pan.y;
    e.preventDefault();
    return;
  }
  
  // Pan tool: left click pans camera
  const shouldPan = editorStore.selectedTool === 'pan' ? e.button === 0 : e.button === 1;
  if (shouldPan) {
    isPanning.value = true;
    panStart.x = e.clientX;
    panStart.y = e.clientY;
    panOffset.x = pan.x;
    panOffset.y = pan.y;
    e.preventDefault();
  }
}

function handleMouseMove(e: MouseEvent) {
  if (canvasContainer.value) {
    const rect = canvasContainer.value.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom.value;
    const y = (e.clientY - rect.top - pan.y) / zoom.value;
    mousePosition.value = { x, y };
  }

  // Handle label dragging
  if (draggingLabel.value) {
    const dx = (e.clientX - draggingLabel.value.startX) / zoom.value;
    const dy = (e.clientY - draggingLabel.value.startY) / zoom.value;
    
    editorStore.updateStation(draggingLabel.value.stationId, {
      labelOffsetX: draggingLabel.value.startOffsetX + dx,
      labelOffsetY: draggingLabel.value.startOffsetY + dy,
    });
    return;
  }

  // Handle label resizing
  if (resizingLabel.value) {
    const dx = (e.clientX - resizingLabel.value.startX) / zoom.value;
    const newFontSize = Math.max(6, Math.min(48, resizingLabel.value.startFontSize + dx * 0.2));
    
    editorStore.updateStation(resizingLabel.value.stationId, {
      labelFontSize: newFontSize,
    });
    return;
  }

  if (draggingWaypoint.value && canvasContainer.value) {
    const rect = canvasContainer.value.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom.value;
    const y = (e.clientY - rect.top - pan.y) / zoom.value;
    editorStore.updateWaypoint(draggingWaypoint.value.trackId, draggingWaypoint.value.waypointId, x, y);
    return;
  }

  // Handle endpoint dragging - calculate offset along station
  if (draggingEndpoint.value && canvasContainer.value) {
    const rect = canvasContainer.value.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom.value;
    const y = (e.clientY - rect.top - pan.y) / zoom.value;
    
    const station = getStationById(draggingEndpoint.value.stationId);
    if (station && station.length && station.length > 10) {
      // Calculate offset relative to station center
      const rotation = (station.rotation || 0) * Math.PI / 180;
      const dx = x - station.x;
      const dy = y - station.y;
      
      // Project onto station axis
      const projectedOffset = dx * Math.cos(rotation) + dy * Math.sin(rotation);
      
      // Normalize to -1 to 1 range
      const maxOffset = station.length / 2 - 4;
      const normalizedOffset = Math.max(-1, Math.min(1, projectedOffset / maxOffset));
      
      editorStore.updateTrackOffset(draggingEndpoint.value.trackId, draggingEndpoint.value.endpoint, normalizedOffset);
    }
    return;
  }

  if (draggingStationId.value && canvasContainer.value) {
    const rect = canvasContainer.value.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom.value;
    const y = (e.clientY - rect.top - pan.y) / zoom.value;
    editorStore.updateStation(draggingStationId.value, { x, y });
    return;
  }

  if (isPanning.value) {
    pan.x = panOffset.x + (e.clientX - panStart.x);
    pan.y = panOffset.y + (e.clientY - panStart.y);
  }
}

function handleMouseUp(e: MouseEvent) {
  if (draggingStationId.value || draggingWaypoint.value || draggingEndpoint.value || draggingLabel.value || resizingLabel.value) showSaveStatus();
  
  draggingStationId.value = null;
  draggingWaypoint.value = null;
  draggingEndpoint.value = null;
  draggingLabel.value = null;
  resizingLabel.value = null;
  
  if (e.button === 2) isRightMousePanning.value = false;
  isPanning.value = false;
}

function handleStationMouseDown(e: MouseEvent, station: EditorStation) {
  if (e.button === 0 && editorStore.selectedTool === 'select') {
    draggingStationId.value = station.id;
    editorStore.selectStation(station.id);
    e.preventDefault();
  }
}

function handleWaypointMouseDown(e: MouseEvent, track: EditorTrack, waypoint: Waypoint) {
  if (e.button === 0) {
    draggingWaypoint.value = { trackId: track.id, waypointId: waypoint.id };
    editorStore.selectTrack(track.id);
    editorStore.selectWaypoint(waypoint.id);
    e.preventDefault();
  }
}

function handleWaypointClick(track: EditorTrack, waypoint: Waypoint) {
  editorStore.selectTrack(track.id);
  editorStore.selectWaypoint(waypoint.id);
}

function handleEndpointMouseDown(e: MouseEvent, track: EditorTrack, endpoint: number) {
  if (e.button === 0) {
    const stationId = track.stationIds[endpoint - 1];
    draggingEndpoint.value = { 
      trackId: track.id, 
      endpoint: endpoint as 1 | 2,
      stationId 
    };
    editorStore.selectTrack(track.id);
    e.preventDefault();
  }
}

function handleLabelMouseDown(e: MouseEvent, station: EditorStation) {
  if (e.button === 0 && editorStore.selectedStationId === station.id) {
    const rect = canvasContainer.value?.getBoundingClientRect();
    if (!rect) return;
    
    draggingLabel.value = {
      stationId: station.id,
      startX: e.clientX,
      startY: e.clientY,
      startOffsetX: station.labelOffsetX || 0,
      startOffsetY: station.labelOffsetY ?? -15,
    };
    e.preventDefault();
  }
}

function handleLabelResizeMouseDown(e: MouseEvent, station: EditorStation) {
  if (e.button === 0 && editorStore.selectedStationId === station.id) {
    resizingLabel.value = {
      stationId: station.id,
      startX: e.clientX,
      startFontSize: station.labelFontSize || 8,
    };
    e.preventDefault();
  }
}

function handleTrackClick(track: EditorTrack) {
  if (editorStore.selectedTool === 'bend') {
    if (mousePosition.value) {
      const insertIndex = findWaypointInsertIndex(track, mousePosition.value.x, mousePosition.value.y);
      const waypoint = editorStore.addWaypoint(track.id, mousePosition.value.x, mousePosition.value.y, insertIndex);
      if (waypoint) {
        editorStore.selectTrack(track.id);
        editorStore.selectWaypoint(waypoint.id);
        showSaveStatus();
      }
    }
  } else if (editorStore.selectedTool === 'select') {
    editorStore.selectTrack(track.id);
    editorStore.selectWaypoint(null);
  }
}

function handleCanvasClick(e: MouseEvent) {
  if (isPanning.value || draggingStationId.value || draggingWaypoint.value) return;
  if (editorStore.selectedTool === 'move') return;
  
  const rect = canvasContainer.value?.getBoundingClientRect();
  if (!rect) return;
  
  const x = (e.clientX - rect.left - pan.x) / zoom.value;
  const y = (e.clientY - rect.top - pan.y) / zoom.value;

  if (editorStore.selectedTool === 'station') {
    const stationName = autoConnect.value && nextStationSuggestion.value 
      ? nextStationSuggestion.value 
      : 'New Station';
    
    const station = editorStore.addStation(x, y, stationName);
    editorStore.selectStation(station.id);
    
    if (autoConnect.value && lastPlacedStationId.value) {
      editorStore.addTrack(lastPlacedStationId.value, station.id, editorStore.currentLine);
    }
    
    lastPlacedStationId.value = station.id;
    showSaveStatus();
  } else if (editorStore.selectedTool === 'select' || editorStore.selectedTool === 'bend') {
    editorStore.clearSelection();
    trackStartStation.value = null;
  }
}

function handleStationClick(station: EditorStation) {
  if (editorStore.selectedTool === 'move') return;
  if (draggingStationId.value) return;
  
  if (editorStore.selectedTool === 'select' || editorStore.selectedTool === 'bend') {
    editorStore.selectStation(station.id);
  } else if (editorStore.selectedTool === 'station') {
    // Click existing station: add current line to it and set as last placed
    if (!station.lines.includes(editorStore.currentLine)) {
      editorStore.updateStation(station.id, { 
        lines: [...station.lines, editorStore.currentLine] 
      });
    }
    
    if (autoConnect.value && lastPlacedStationId.value && lastPlacedStationId.value !== station.id) {
      editorStore.addTrack(lastPlacedStationId.value, station.id, editorStore.currentLine);
    }
    
    lastPlacedStationId.value = station.id;
    editorStore.selectStation(station.id);
    showSaveStatus();
  } else if (editorStore.selectedTool === 'track') {
    if (trackStartStation.value === null) {
      trackStartStation.value = station.id;
      editorStore.selectStation(station.id);
    } else {
      editorStore.addTrack(trackStartStation.value, station.id, editorStore.currentLine);
      trackStartStation.value = null;
      editorStore.clearSelection();
      showSaveStatus();
    }
  } else if (editorStore.selectedTool === 'multiConnect') {
    editorStore.addToMultiConnect(station.id);
    showSaveStatus();
  }
}

// Zoom controls
function zoomIn() { zoom.value = Math.min(8, zoom.value * 1.25); }
function zoomOut() { zoom.value = Math.max(0.1, zoom.value / 1.25); }
function resetView() { zoom.value = 1; pan.x = 0; pan.y = 0; }

// Station property updates
function updateStationName(e: Event) {
  const value = (e.target as HTMLSelectElement).value;
  if (editorStore.selectedStationId) {
    editorStore.updateStation(editorStore.selectedStationId, { name: value });
    showSaveStatus();
  }
}

function applyCustomName() {
  if (editorStore.selectedStationId && customStationName.value) {
    editorStore.updateStation(editorStore.selectedStationId, { name: customStationName.value });
    showSaveStatus();
  }
}

function updateStationPosition(axis: 'x' | 'y', e: Event) {
  const value = parseInt((e.target as HTMLInputElement).value);
  if (editorStore.selectedStationId && !isNaN(value)) {
    editorStore.updateStation(editorStore.selectedStationId, { [axis]: value });
    showSaveStatus();
  }
}

function updateStationRotation(e: Event) {
  const value = parseInt((e.target as HTMLInputElement).value);
  if (editorStore.selectedStationId && !isNaN(value)) {
    editorStore.updateStation(editorStore.selectedStationId, { rotation: value });
    showSaveStatus();
  }
}

function rotateStation(delta: number) {
  if (editorStore.selectedStation) {
    let newRotation = (editorStore.selectedStation.rotation + delta) % 360;
    if (newRotation < 0) newRotation += 360;
    editorStore.updateStation(editorStore.selectedStationId!, { rotation: newRotation });
    showSaveStatus();
  }
}

function updateStationLength(e: Event) {
  const value = parseInt((e.target as HTMLInputElement).value);
  if (editorStore.selectedStationId && !isNaN(value)) {
    editorStore.updateStation(editorStore.selectedStationId, { length: value });
    showSaveStatus();
  }
}

function updateLabelFontSize(e: Event) {
  const value = parseInt((e.target as HTMLInputElement).value);
  if (editorStore.selectedStationId && !isNaN(value)) {
    editorStore.updateStation(editorStore.selectedStationId, { labelFontSize: value });
    showSaveStatus();
  }
}

function resetLabelPosition() {
  if (editorStore.selectedStationId) {
    editorStore.updateStation(editorStore.selectedStationId, { 
      labelOffsetX: 0, 
      labelOffsetY: -15 
    });
    showSaveStatus();
  }
}

function toggleStationLine(line: string) {
  if (!editorStore.selectedStation) return;
  
  const lines = editorStore.selectedStation.lines;
  const newLines = lines.includes(line)
    ? lines.filter(l => l !== line)
    : [...lines, line];
  
  editorStore.updateStation(editorStore.selectedStationId!, { lines: newLines });
  showSaveStatus();
}

function deleteSelectedStation() {
  if (editorStore.selectedStationId) {
    editorStore.removeStation(editorStore.selectedStationId);
    showSaveStatus();
  }
}

// Track updates
function updateTrackLine(e: Event) {
  const value = (e.target as HTMLSelectElement).value;
  if (editorStore.selectedTrackId) {
    const track = editorStore.tracks.find(t => t.id === editorStore.selectedTrackId);
    if (track) {
      track.line = value;
      editorStore.saveToLocalStorage();
      showSaveStatus();
    }
  }
}

function clearTrackWaypoints() {
  if (editorStore.selectedTrackId) {
    const track = editorStore.tracks.find(t => t.id === editorStore.selectedTrackId);
    if (track) {
      track.waypoints = [];
      editorStore.saveToLocalStorage();
      showSaveStatus();
    }
  }
}

function deleteSelectedTrack() {
  if (editorStore.selectedTrackId) {
    editorStore.removeTrack(editorStore.selectedTrackId);
    showSaveStatus();
  }
}

function deleteSelectedWaypoint() {
  if (editorStore.selectedWaypointId && selectedWaypointTrack.value) {
    editorStore.removeWaypoint(selectedWaypointTrack.value.id, editorStore.selectedWaypointId);
    showSaveStatus();
  }
}

function handleClear() {
  if (confirm('Clear all stations and tracks?')) {
    editorStore.clearAll();
    lastPlacedStationId.value = null;
    showSaveStatus();
  }
}

// Keyboard shortcuts
function handleKeyDown(e: KeyboardEvent) {
  if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'SELECT') return;
  
  const key = e.key.toLowerCase();
  
  if (key === 'delete' || key === 'backspace') {
    if (editorStore.selectedWaypointId && selectedWaypointTrack.value) {
      editorStore.removeWaypoint(selectedWaypointTrack.value.id, editorStore.selectedWaypointId);
    } else if (editorStore.selectedStationId) {
      editorStore.removeStation(editorStore.selectedStationId);
    } else if (editorStore.selectedTrackId) {
      editorStore.removeTrack(editorStore.selectedTrackId);
    }
    showSaveStatus();
    e.preventDefault();
  } else if (key === 'escape') {
    editorStore.clearSelection();
    trackStartStation.value = null;
    editorStore.finishMultiConnect();
  } else if (key === 'r') {
    // Rotate selected station
    if (editorStore.selectedStation) {
      rotateStation(15);
    }
  } else if (key === 'v' || key === '1') {
    editorStore.selectedTool = 'select';
  } else if (key === 'h' || key === '2') {
    editorStore.selectedTool = 'pan';
  } else if (key === 'g') {
    editorStore.selectedTool = 'move';
  } else if (key === 's' || key === '3') {
    editorStore.selectedTool = 'station';
    e.preventDefault();
  } else if (key === 't' || key === '4') {
    editorStore.selectedTool = 'track';
  } else if (key === 'b' || key === '5') {
    editorStore.selectedTool = 'bend';
  } else if (key === 'm' || key === '6') {
    editorStore.selectedTool = 'multiConnect';
  } else if (key === '+' || key === '=') {
    zoomIn();
  } else if (key === '-') {
    zoomOut();
  } else if (key === '0') {
    resetView();
  }
}

onMounted(() => { window.addEventListener('keydown', handleKeyDown); });
onUnmounted(() => { window.removeEventListener('keydown', handleKeyDown); });
</script>

<style scoped>
.editor-page {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #1a1a2e;
  color: #fff;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.header-left { display: flex; align-items: center; gap: 16px; }

.back-btn {
  color: #fff;
  text-decoration: none;
  padding: 5px 10px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.1);
  font-size: 13px;
}
.back-btn:hover { background: rgba(255, 255, 255, 0.2); }

.editor-header h1 { margin: 0; font-size: 16px; font-weight: 600; }
.header-right { display: flex; align-items: center; gap: 10px; }
.save-status { color: #4ade80; font-size: 12px; padding: 3px 6px; background: rgba(74, 222, 128, 0.1); border-radius: 3px; }

.btn { padding: 5px 12px; border: none; border-radius: 4px; font-size: 12px; font-weight: 500; cursor: pointer; }
.btn-small { padding: 3px 8px; font-size: 11px; }
.btn-secondary { background: rgba(255, 255, 255, 0.1); color: #fff; }
.btn-secondary:hover { background: rgba(255, 255, 255, 0.2); }
.btn-danger { background: #dc2626; color: #fff; }
.btn-danger:hover { background: #b91c1c; }

.editor-content { display: flex; flex: 1; overflow: hidden; }

.tools-panel {
  width: 170px;
  background: rgba(255, 255, 255, 0.03);
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  font-size: 12px;
}

.tools-section h3 { margin: 0 0 6px 0; font-size: 10px; font-weight: 600; color: rgba(255, 255, 255, 0.5); text-transform: uppercase; }
.tool-buttons { display: flex; flex-direction: column; gap: 3px; }
.tool-btn { display: flex; align-items: center; gap: 6px; padding: 6px 8px; border: none; border-radius: 4px; background: rgba(255, 255, 255, 0.05); color: #fff; cursor: pointer; text-align: left; }
.tool-btn:hover { background: rgba(255, 255, 255, 0.1); }
.tool-btn.active { background: #4f46e5; }
.tool-icon { font-size: 14px; }
.tool-label { flex: 1; font-size: 12px; }
.tool-shortcut { font-size: 10px; color: rgba(255, 255, 255, 0.4); background: rgba(255, 255, 255, 0.1); padding: 1px 4px; border-radius: 2px; }

.toggle-row { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 12px; }
.toggle-row input { margin: 0; }

.next-station-hint { padding: 6px 8px; background: rgba(79, 70, 229, 0.2); border: 1px solid rgba(79, 70, 229, 0.4); border-radius: 4px; font-size: 11px; color: #a5b4fc; }
.line-select { width: 100%; padding: 5px; border-radius: 4px; border: 1px solid rgba(255, 255, 255, 0.2); background: rgba(255, 255, 255, 0.05); color: #fff; font-size: 12px; }
.line-preview { height: 5px; border-radius: 2px; margin-top: 5px; }
.opacity-slider, .rotation-slider, .length-slider { width: 100%; margin-bottom: 3px; }
.opacity-value { font-size: 11px; color: rgba(255, 255, 255, 0.5); }
.hint { font-size: 10px; color: rgba(255, 255, 255, 0.5); margin-bottom: 6px; }
.stats .stat { font-size: 11px; color: rgba(255, 255, 255, 0.6); padding: 2px 0; }
.shortcuts { margin-top: auto; }
.shortcuts .shortcut { font-size: 10px; color: rgba(255, 255, 255, 0.4); padding: 2px 0; }

.canvas-area { flex: 1; position: relative; overflow: hidden; background: #0d0d1a; }
.canvas-container { width: 100%; height: 100%; cursor: crosshair; position: relative; overflow: hidden; }
.canvas-container.pan-cursor { cursor: grab; }
.canvas-container.move-cursor { cursor: move; }
.canvas-container.grabbing { cursor: grabbing !important; }

.map-background { position: absolute; top: 0; left: 0; transform-origin: 0 0; pointer-events: none; }
.bvg-map { width: 1190px; height: 842px; display: block; }

.editor-overlay { position: absolute; top: 0; left: 0; width: 1190px; height: 842px; transform-origin: 0 0; pointer-events: none; }
.editor-overlay * { pointer-events: auto; }

.track-line { cursor: pointer; }
.track-line.selected { filter: brightness(1.4); }

.waypoint { fill: #fff; stroke: #4f46e5; stroke-width: 2; cursor: move; }
.waypoint:hover { r: 6; }
.waypoint.selected { fill: #4f46e5; stroke: #fff; }

.track-endpoint { fill: #22c55e; stroke: #fff; stroke-width: 2; cursor: ew-resize; }
.track-endpoint:hover { r: 7; fill: #16a34a; }
.track-endpoint.dragging { fill: #16a34a; r: 7; }

.station-group { cursor: pointer; }
.station-pill { transition: filter 0.15s; }
.station-group.selected .station-pill { filter: brightness(1.3) drop-shadow(0 0 3px rgba(255,255,255,0.5)); }
.station-group.dragging .station-pill { filter: brightness(1.5); }
.station-group.multi-connect .station-pill { stroke: #4f46e5; stroke-width: 3; }
.line-segment { pointer-events: none; }

.station-label { fill: #fff; font-weight: 500; text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95); pointer-events: none; }
.station-label.label-draggable { pointer-events: auto; cursor: move; }
.label-connector { pointer-events: none; }
.label-resize-handle { fill: #4f46e5; stroke: #fff; stroke-width: 1; cursor: ew-resize; }
.label-resize-handle:hover { fill: #6366f1; r: 5; }
.preview-line { pointer-events: none; }

.zoom-controls { position: absolute; bottom: 12px; right: 12px; display: flex; flex-direction: column; gap: 2px; }
.zoom-btn { width: 28px; height: 28px; border: none; border-radius: 4px; background: rgba(255, 255, 255, 0.9); color: #333; font-size: 14px; cursor: pointer; }
.zoom-btn:hover { background: #fff; }

.properties-panel { width: 220px; background: rgba(255, 255, 255, 0.03); border-left: 1px solid rgba(255, 255, 255, 0.1); padding: 10px; overflow-y: auto; }
.properties-panel h3 { margin: 0 0 10px 0; font-size: 13px; font-weight: 600; }
.property-content { display: flex; flex-direction: column; gap: 12px; }
.property-placeholder { color: rgba(255, 255, 255, 0.4); font-size: 12px; text-align: center; padding: 16px 8px; }
.property-placeholder .hint { margin-top: 8px; }

.property-group { display: flex; flex-direction: column; gap: 5px; }
.property-group label { font-size: 10px; font-weight: 500; color: rgba(255, 255, 255, 0.5); text-transform: uppercase; }

.name-select, .custom-name-input { width: 100%; padding: 5px 6px; border-radius: 4px; border: 1px solid rgba(255, 255, 255, 0.2); background: rgba(255, 255, 255, 0.05); color: #fff; font-size: 12px; }
.lines-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 3px; }
.line-btn { padding: 3px 2px; border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 3px; background: rgba(255, 255, 255, 0.05); color: #fff; font-size: 9px; font-weight: 600; cursor: pointer; }
.line-btn:hover { background: rgba(255, 255, 255, 0.15); }
.line-btn.active { border-color: transparent; }

.rotation-buttons { display: flex; gap: 4px; }
.position-inputs { display: flex; gap: 6px; }
.position-inputs input { flex: 1; padding: 5px 6px; border-radius: 4px; border: 1px solid rgba(255, 255, 255, 0.2); background: rgba(255, 255, 255, 0.05); color: #fff; font-size: 12px; }

.delete-btn { width: 100%; margin-top: 6px; }
</style>
