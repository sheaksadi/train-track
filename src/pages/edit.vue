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
        <button @click="handleExport" class="btn btn-secondary">📤 Export</button>
        <input type="file" ref="importInput" @change="handleImport" accept=".json" hidden />
        <button @click="triggerImport" class="btn btn-secondary">📥 Import</button>
        <button @click="handleClear" class="btn btn-danger">🗑 Clear All</button>
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
            <option v-for="line in allLines" :key="line" :value="line">{{ line }}</option>
          </select>
          <div class="line-preview" :style="{ backgroundColor: getLineColor(editorStore.currentLine) }"></div>
        </div>

        <div class="tools-section">
          <label class="toggle-row">
            <input type="checkbox" v-model="autoConnect" />
            <span>Auto-connect tracks</span>
          </label>
        </div>

        <div class="tools-section">
          <h3>Track Builder</h3>
          <div class="flex flex-col gap-2">
            <select :value="trackBuilder.trackBuilderLine.value" @change="trackBuilder.startTrackBuilder(($event.target as HTMLSelectElement).value)" class="line-select">
              <option value="" disabled>Select Line to Build...</option>
              <option v-for="line in allLines" :key="line" :value="line">{{ line }}</option>
            </select>
            <div v-if="trackBuilder.trackBuilderLine.value" class="builder-status mt-2">
              <div class="text-xs text-gray-400">Next Target:</div>
              <div class="text-sm font-bold text-green-400 mb-2 truncate">{{ trackBuilder.currentBuilderStation.value || 'Complete!' }}</div>
              <div class="flex gap-2">
                <button @click="trackBuilder.skipBuilderStation" class="btn btn-secondary flex-1" :disabled="!trackBuilder.currentBuilderStation.value">Skip</button>
                <button @click="trackBuilder.resetBuilder" class="btn btn-danger flex-1">Reset</button>
              </div>
            </div>
            <div v-if="!trackBuilder.trackBuilderLine.value && autoConnect && nextStationSuggestion" class="suggestion-ui bg-gray-700 p-2 rounded text-sm mt-2">
              <div class="text-xs text-gray-400 mb-1">Suggestion: {{ nextStationSuggestion.current }}</div>
              <div class="flex gap-2 justify-between">
                <button v-if="nextStationSuggestion.prev" @click="customStationName = nextStationSuggestion.prev" class="px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded text-xs flex-1 truncate">← {{ nextStationSuggestion.prev }}</button>
                <button v-if="nextStationSuggestion.next" @click="customStationName = nextStationSuggestion.next" class="px-2 py-1 bg-blue-600 hover:bg-blue-500 rounded text-xs flex-1 truncate">{{ nextStationSuggestion.next }} →</button>
              </div>
            </div>
          </div>
        </div>

        <div class="tools-section">
          <h3>Map Opacity</h3>
          <input type="range" v-model.number="editorStore.mapOpacity" min="0" max="100" class="opacity-slider" />
          <span class="opacity-value">{{ editorStore.mapOpacity }}%</span>
        </div>

        <div class="tools-section">
          <h3>Inner Circle Size</h3>
          <input type="range" v-model.number="innerCircleScale" min="30" max="150" step="5" class="opacity-slider" />
          <span class="opacity-value">{{ innerCircleScale }}%</span>
        </div>

        <div class="tools-section stats">
          <h3>Statistics</h3>
          <div class="stat">Stations: {{ editorStore.stations.length }}</div>
          <div class="stat">Tracks: {{ editorStore.tracks.length }}</div>
          <div class="stat">Zoom: {{ Math.round(canvas.zoom.value * 100) }}%</div>
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
        <div ref="canvasContainer" class="canvas-container"
          :class="{ 'pan-cursor': editorStore.selectedTool === 'pan' || canvas.isRightMousePanning.value, 'move-cursor': editorStore.selectedTool === 'move', 'grabbing': canvas.isPanning.value }"
          @wheel.prevent="(e) => canvas.handleWheel(e, canvasContainer)"
          @mousedown="handleMouseDown"
          @mousemove="handleMouseMove"
          @mouseup="handleMouseUp"
          @mouseleave="handleMouseUp"
          @click="handleCanvasClick"
          @contextmenu.prevent
          style="user-select: none;"
        >
          <!-- BVG Map Background -->
          <div class="map-background" :style="{ transform: `translate(${canvas.pan.x}px, ${canvas.pan.y}px) scale(${canvas.zoom.value})`, opacity: editorStore.mapOpacity / 100 }">
            <img src="/bvg_map.svg" alt="BVG Map" class="bvg-map" draggable="false" />
          </div>

          <!-- Editor Canvas Overlay -->
          <svg class="editor-overlay" :style="{ transform: `translate(${canvas.pan.x}px, ${canvas.pan.y}px) scale(${canvas.zoom.value})` }" :viewBox="`0 0 ${canvasWidth} ${canvasHeight}`">
            <!-- Tracks -->
            <g v-for="track in editorStore.tracks" :key="track.id">
              <path :d="getTrackPathForTrack(track)" :stroke="getLineColor(track.line)" :stroke-width="canvas.trackWidth.value" stroke-linecap="round" stroke-linejoin="round" fill="none" class="track-line" :class="{ selected: editorStore.selectedTrackId === track.id }" @click.stop="handleTrackClick(track)" />
              <g v-if="editorStore.selectedTrackId === track.id || editorStore.selectedTool === 'bend'">
                <circle v-for="waypoint in track.waypoints" :key="waypoint.id" :cx="waypoint.x" :cy="waypoint.y" :r="canvas.waypointRadius.value" class="waypoint" :class="{ selected: editorStore.selectedWaypointId === waypoint.id }" @mousedown.stop="handleWaypointMouseDown($event, track, waypoint)" @click.stop="handleWaypointClick(track, waypoint)" />
              </g>
            </g>

            <!-- Stations -->
            <g v-for="station in editorStore.stations" :key="station.id" class="station-group" :class="{ selected: editorStore.selectedStationId === station.id, 'multi-connect': editorStore.multiConnectStations.includes(station.id), dragging: dragging.draggingStationId.value === station.id }" :transform="`translate(${station.x}, ${station.y}) rotate(${station.rotation || 0})`" @mousedown.stop="handleStationMouseDown($event, station)" @click.stop="handleStationClick($event, station)">
              <!-- Single-line circle station -->
              <circle v-if="(!station.length || station.length <= 6) && station.lines.length <= 1" :r="canvas.stationRadius.value" :fill="getStationFill(station)" stroke="white" :stroke-width="canvas.stationStrokeWidth.value" class="station-circle" />
              
              <!-- Multi-line circle station (squarish with rounded corners) -->
              <g v-else-if="(!station.length || station.length <= 6) && station.lines.length > 1" :key="`multi-${station.id}-${innerCircleScale}`">
                <rect 
                  :x="-getMultiStationSize(station).width / 2" 
                  :y="-getMultiStationSize(station).height / 2" 
                  :width="getMultiStationSize(station).width" 
                  :height="getMultiStationSize(station).height" 
                  :rx="getMultiStationSize(station).radius" 
                  fill="white" 
                  stroke="white" 
                  :stroke-width="canvas.stationStrokeWidth.value" 
                  class="station-circle" 
                />
                <!-- Line indicator circles in grid -->
                <circle 
                  v-for="(linePos, idx) in getLineCirclePositions(station)" 
                  :key="`${station.lines[idx]}-${innerCircleScale}`" 
                  :cx="linePos.x" 
                  :cy="linePos.y" 
                  :r="linePos.r" 
                  :fill="getLineColor(station.lines[idx])" 
                  class="line-indicator" 
                />
              </g>
              
              <!-- Pill-shaped station -->
              <rect v-else :x="-station.length / 2" :y="-(station.width || canvas.stationHeight.value) / 2" :width="station.length" :height="station.width || canvas.stationHeight.value" :rx="(station.width || canvas.stationHeight.value) / 2" :ry="(station.width || canvas.stationHeight.value) / 2" :fill="getStationFill(station)" stroke="white" :stroke-width="canvas.stationStrokeWidth.value" class="station-pill" />
              
              <!-- Multi-line indicators for pill stations -->
              <g v-if="station.lines.length > 1 && station.length && station.length > 6">
                <circle 
                  v-for="(line, index) in station.lines.slice(0, 6)" 
                  :key="`${line}-${innerCircleScale}`" 
                  :cx="getPillCircleX(station, index)" 
                  :cy="0" 
                  :r="canvas.stationRadius.value * (innerCircleScale / 100)" 
                  :fill="getLineColor(line)" 
                  class="line-indicator" 
                />
              </g>
              <!-- Label -->
              <g v-if="canvas.zoom.value > 0.4" :transform="`rotate(${-(station.rotation || 0)}) translate(${station.labelOffsetX || 0}, ${station.labelOffsetY ?? -15})`">
                <line v-if="editorStore.selectedStationId === station.id" :x1="-(station.labelOffsetX || 0)" :y1="-(station.labelOffsetY ?? -15)" x2="0" y2="0" stroke="rgba(79, 70, 229, 0.5)" stroke-width="1" stroke-dasharray="2,2" class="label-connector" />
                <foreignObject :x="station.labelWidth ? -(station.labelWidth / 2) : -(measureTextWidth(station.name, station.labelFontSize || 8) / 2 + 4)" :y="-(station.labelHeight || (station.labelFontSize || 8) * 1.4) / 2" :width="station.labelWidth || (measureTextWidth(station.name, station.labelFontSize || 8) + 8)" :height="station.labelHeight || (station.labelFontSize || 8) * 1.4" @mousedown.stop="handleLabelMouseDown($event, station)">
                  <div xmlns="http://www.w3.org/1999/xhtml" class="label-box-content" :style="{ fontSize: `${station.labelFontSize || 8}px`, fontWeight: station.labelBold ? 'bold' : 'normal', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '1px 2px', boxSizing: 'border-box', overflow: 'hidden', wordWrap: 'break-word', color: '#fff', textShadow: '0 1px 3px rgba(0, 0, 0, 0.95)' }">{{ station.name }}</div>
                </foreignObject>
                <g v-if="editorStore.selectedStationId === station.id">
                  <rect :x="station.labelWidth ? -(station.labelWidth / 2) : -(measureTextWidth(station.name, station.labelFontSize || 8) / 2 + 4)" :y="-(station.labelHeight || (station.labelFontSize || 8) * 1.4) / 2" :width="station.labelWidth || (measureTextWidth(station.name, station.labelFontSize || 8) + 8)" :height="station.labelHeight || (station.labelFontSize || 8) * 1.4" fill="rgba(0, 0, 0, 0.5)" rx="2" class="label-bg" style="pointer-events: none;" />
                  <rect :x="station.labelWidth ? -(station.labelWidth / 2) - 2 : -(measureTextWidth(station.name, station.labelFontSize || 8) / 2 + 6)" :y="-(station.labelHeight || (station.labelFontSize || 8) * 1.4) / 2 - 2" :width="(station.labelWidth || (measureTextWidth(station.name, station.labelFontSize || 8) + 8)) + 4" :height="(station.labelHeight || (station.labelFontSize || 8) * 1.4) + 4" fill="none" stroke="rgba(79, 70, 229, 0.8)" stroke-width="1.5" stroke-dasharray="4,2" rx="3" />
                  <rect :x="(station.labelWidth || measureTextWidth(station.name, station.labelFontSize || 8) + 8) / 2 + 2" :y="(station.labelHeight || (station.labelFontSize || 8) * 1.4) / 2 + 2" width="8" height="8" rx="2" class="label-resize-handle corner-handle" @mousedown.stop="handleLabelResizeMouseDown($event, station)" />
                  <rect :x="(station.labelWidth || measureTextWidth(station.name, station.labelFontSize || 8) + 8) / 2 - 2" :y="-6" width="4" height="12" rx="1" class="label-resize-handle edge-handle-h" @mousedown.stop="handleLabelBoxResize($event, station, 'r')" />
                  <rect :x="-6" :y="(station.labelHeight || (station.labelFontSize || 8) * 1.4) / 2 - 2" width="12" height="4" rx="1" class="label-resize-handle edge-handle-v" @mousedown.stop="handleLabelBoxResize($event, station, 'b')" />
                </g>
              </g>
            </g>

            <!-- Endpoint Handles Layer -->
            <g v-for="track in editorStore.tracks" :key="`ep-group-${track.id}`">
              <g v-if="editorStore.selectedTrackId === track.id">
                <g v-for="(endpoint, idx) in getTrackEndpointsForTrack(track)" :key="`ep-${idx}`">
                  <circle :cx="endpoint.x" :cy="endpoint.y" :r="canvas.endpointVisualRadius.value" class="track-endpoint-visual" :class="{ dragging: dragging.draggingEndpoint.value?.trackId === track.id && dragging.draggingEndpoint.value?.endpoint === idx + 1 }" style="pointer-events: none;" />
                  <circle :cx="endpoint.x" :cy="endpoint.y" :r="canvas.endpointHitRadius.value" fill="transparent" stroke="none" style="cursor: move; pointer-events: all;" @mousedown.stop="handleEndpointMouseDown($event, track, idx + 1)" />
                </g>
              </g>
            </g>

            <!-- Text Nodes -->
            <g v-for="textNode in editorStore.textNodes" :key="textNode.id" class="text-node-group" :class="{ selected: editorStore.selectedTextNodeId === textNode.id, editing: editingTextNodeId === textNode.id }" :transform="`translate(${getTextNodePosition(textNode).x}, ${getTextNodePosition(textNode).y})`" @mousedown.stop="handleTextNodeMouseDown($event, textNode)" @click.stop="handleTextNodeClick(textNode)" @dblclick.stop="handleTextNodeDoubleClick(textNode)">
              <rect x="0" y="0" :width="textNode.width || 80" :height="textNode.height || 24" fill="rgba(0, 0, 0, 0.6)" rx="3" class="text-bg" />
              <foreignObject x="0" y="0" :width="textNode.width || 80" :height="textNode.height || 24">
                <div xmlns="http://www.w3.org/1999/xhtml" class="text-box-content" :style="{ fontSize: `${textNode.fontSize}px`, fontWeight: textNode.isBold ? 'bold' : 'normal', width: '100%', height: '100%', padding: '2px 4px', boxSizing: 'border-box', overflow: 'hidden', wordWrap: 'break-word', color: '#fff' }">{{ textNode.text }}</div>
              </foreignObject>
              <g v-if="editorStore.selectedTextNodeId === textNode.id">
                <rect x="-2" y="-2" :width="(textNode.width || 80) + 4" :height="(textNode.height || 24) + 4" fill="none" stroke="rgba(79, 70, 229, 0.8)" stroke-width="1.5" stroke-dasharray="4,2" rx="4" />
                <rect :x="(textNode.width || 80) - 4" :y="(textNode.height || 24) - 4" width="8" height="8" rx="2" class="text-resize-handle corner-handle" @mousedown.stop="handleTextNodeCornerResize($event, textNode, 'br')" />
                <rect :x="(textNode.width || 80) - 2" :y="(textNode.height || 24) / 2 - 6" width="4" height="12" rx="1" class="text-resize-handle edge-handle-h" @mousedown.stop="handleTextNodeCornerResize($event, textNode, 'r')" />
                <rect :x="(textNode.width || 80) / 2 - 6" :y="(textNode.height || 24) - 2" width="12" height="4" rx="1" class="text-resize-handle edge-handle-v" @mousedown.stop="handleTextNodeCornerResize($event, textNode, 'b')" />
              </g>
            </g>

            <!-- Multi-connect preview line -->
            <line v-if="editorStore.selectedTool === 'multiConnect' && editorStore.multiConnectStations.length > 0 && canvas.mousePosition.value" :x1="getStationById(editorStore.multiConnectStations[editorStore.multiConnectStations.length - 1])?.x || 0" :y1="getStationById(editorStore.multiConnectStations[editorStore.multiConnectStations.length - 1])?.y || 0" :x2="canvas.mousePosition.value.x" :y2="canvas.mousePosition.value.y" :stroke="getLineColor(editorStore.currentLine)" :stroke-width="canvas.trackWidth.value / 2" stroke-dasharray="5,5" class="preview-line" />
          </svg>

          <!-- Zoom Controls -->
          <div class="zoom-controls">
            <button @click="canvas.zoomIn" class="zoom-btn">+</button>
            <button @click="canvas.zoomOut" class="zoom-btn">−</button>
            <button @click="canvas.resetView" class="zoom-btn">⌂</button>
          </div>
        </div>
      </main>

      <!-- Properties Panel -->
      <PropertiesPanel @save="showSaveStatus" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, toRef } from 'vue';
import { useEditorStore, type EditorStation, type EditorTrack, type Waypoint, type TextNode } from '@/stores/editor';
import { allLines, getLineColor, getStationsForLine } from '@/data/stationNames';
import { useCanvasInteractions } from '@/composables/useCanvasInteractions';
import { useDragging } from '@/composables/useDragging';
import { useTrackBuilder } from '@/composables/useTrackBuilder';
import { measureTextWidth, getTrackPath, getTrackEndpoints, getTrackConnectionPoint, findWaypointInsertIndex } from '@/composables/useGeometry';
import PropertiesPanel from '@/components/editor/PropertiesPanel.vue';

const editorStore = useEditorStore();
const canvas = useCanvasInteractions();
const dragging = useDragging();
const currentLineRef = toRef(editorStore, 'currentLine');
const trackBuilder = useTrackBuilder(currentLineRef);

// Constants
const canvasWidth = 1190;
const canvasHeight = 842;

// UI refs
const canvasContainer = ref<HTMLElement | null>(null);
const importInput = ref<HTMLInputElement | null>(null);
const customStationName = ref('');
const saveStatus = ref('');
const autoConnect = ref(true);
const lastPlacedStationId = ref<string | null>(null);
const trackStartStation = ref<string | null>(null);
const editingTextNodeId = ref<string | null>(null);
const innerCircleScale = ref(45); // Percentage of single station size for multi-station circles

// Tool definitions
const tools = [
  { id: 'select', icon: '👆', label: 'Select', shortcut: 'V' },
  { id: 'pan', icon: '✋', label: 'Pan', shortcut: 'H' },
  { id: 'move', icon: '↔️', label: 'Move', shortcut: 'G' },
  { id: 'station', icon: '📍', label: 'Station', shortcut: 'S' },
  { id: 'track', icon: '🔗', label: 'Track', shortcut: 'T' },
  { id: 'bend', icon: '〰️', label: 'Bend', shortcut: 'B' },
  { id: 'multiConnect', icon: '⛓', label: 'Multi', shortcut: 'M' },
  { id: 'text', icon: '📝', label: 'Text', shortcut: 'X' },
] as const;

// Computed
const nextStationSuggestion = computed(() => {
  const lastStation = editorStore.stations.find(s => s.id === lastPlacedStationId.value);
  return lastStation ? trackBuilder.getNextStationSuggestion(lastStation.name) : null;
});

// Helpers
function getStationById(id: string): EditorStation | undefined {
  return editorStore.stations.find(s => s.id === id);
}

function getStationFill(station: EditorStation): string {
  if (station.lines.length === 0) return '#888';
  if (station.lines.length === 1) return getLineColor(station.lines[0]);
  return '#fff';
}

function getTrackPathForTrack(track: EditorTrack): string {
  return getTrackPath(track, editorStore.stations, canvas.stationRadius.value, canvas.stationHeight.value, editorStore.tracks);
}

function getTrackEndpointsForTrack(track: EditorTrack) {
  return getTrackEndpoints(track, editorStore.stations, canvas.stationRadius.value, canvas.stationHeight.value, editorStore.tracks);
}

// Calculate size for multi-line circle stations (squarish with rounded corners)
function getMultiStationSize(station: EditorStation): { width: number; height: number; radius: number } {
  const lineCount = station.lines.length;
  const baseSize = canvas.stationRadius.value * 2;
  
  // Determine grid layout: 1x1, 1x2, 2x2, 2x3, 3x3, etc.
  const cols = lineCount <= 2 ? lineCount : Math.ceil(Math.sqrt(lineCount));
  const rows = Math.ceil(lineCount / cols);
  
  // Circle size based on slider (percentage of single station radius)
  const circleRadius = canvas.stationRadius.value * (innerCircleScale.value / 100);
  const gap = circleRadius * 0.15; // Small gap
  const padding = circleRadius * 0.2; // Padding around the grid
  
  const width = cols * (circleRadius * 2) + (cols - 1) * gap + padding * 2;
  const height = rows * (circleRadius * 2) + (rows - 1) * gap + padding * 2;
  
  // Corner radius: more rounded when square-ish, less when rectangular
  const minDim = Math.min(width, height);
  const radius = minDim * 0.25;
  
  return { width, height, radius };
}

// Get positions for line indicator circles in a grid layout
function getLineCirclePositions(station: EditorStation): Array<{ x: number; y: number; r: number }> {
  const lineCount = station.lines.length;
  
  // Grid layout
  const cols = lineCount <= 2 ? lineCount : Math.ceil(Math.sqrt(lineCount));
  const rows = Math.ceil(lineCount / cols);
  
  // Circle size based on slider (percentage of single station radius)
  const circleRadius = canvas.stationRadius.value * (innerCircleScale.value / 100);
  const gap = circleRadius * 0.15; // Small gap
  
  const totalWidth = cols * (circleRadius * 2) + (cols - 1) * gap;
  const totalHeight = rows * (circleRadius * 2) + (rows - 1) * gap;
  
  const positions: Array<{ x: number; y: number; r: number }> = [];
  
  for (let i = 0; i < lineCount; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    
    // Center the circles in the grid
    const x = -totalWidth / 2 + circleRadius + col * (circleRadius * 2 + gap);
    const y = -totalHeight / 2 + circleRadius + row * (circleRadius * 2 + gap);
    
    positions.push({ x, y, r: circleRadius });
  }
  
  return positions;
}

// Get X position for pill station indicator circles with even gaps
function getPillCircleX(station: EditorStation, index: number): number {
  const circleRadius = canvas.stationRadius.value * (innerCircleScale.value / 100);
  const lineCount = Math.min(station.lines.length, 6);
  const pillWidth = station.length;
  
  // Calculate even gap: total space / (number of gaps + 1 for each side)
  // For n circles, we have n-1 gaps between + 2 edge gaps = n+1 total gaps
  const totalCircleWidth = lineCount * (circleRadius * 2);
  const availableForGaps = pillWidth - totalCircleWidth;
  const evenGap = availableForGaps / (lineCount + 1);
  
  // Position each circle with even spacing
  const startX = -pillWidth / 2 + evenGap + circleRadius;
  
  return startX + index * (circleRadius * 2 + evenGap);
}

function getTextNodePosition(textNode: TextNode): { x: number; y: number } {
  if (textNode.stationId) {
    const station = getStationById(textNode.stationId);
    if (station) return { x: station.x + textNode.x, y: station.y + textNode.y };
  }
  return { x: textNode.x, y: textNode.y };
}

function showSaveStatus() {
  saveStatus.value = '✓ Saved';
  setTimeout(() => { saveStatus.value = ''; }, 1500);
}

// Event handlers
function handleMouseDown(e: MouseEvent) {
  if (e.button === 2) {
    canvas.startRightMousePan(e);
    e.preventDefault();
    return;
  }
  const shouldPan = editorStore.selectedTool === 'pan' ? e.button === 0 : e.button === 1;
  if (shouldPan) {
    canvas.startPan(e);
    e.preventDefault();
  }
}

function handleMouseMove(e: MouseEvent) {
  canvas.updateMousePosition(e, canvasContainer.value);

  // Handle label dragging
  if (dragging.draggingLabel.value) {
    const dl = dragging.draggingLabel.value;
    const dx = (e.clientX - dl.startX) / canvas.zoom.value;
    const dy = (e.clientY - dl.startY) / canvas.zoom.value;
    editorStore.updateStation(dl.stationId, { labelOffsetX: dl.startOffsetX + dx, labelOffsetY: dl.startOffsetY + dy });
    return;
  }

  // Handle label resizing
  if (dragging.resizingLabel.value) {
    const rl = dragging.resizingLabel.value;
    const dx = (e.clientX - rl.startX) / canvas.zoom.value;
    const newFontSize = Math.max(6, Math.min(48, rl.startFontSize + dx * 0.2));
    const scale = newFontSize / rl.startFontSize;
    const updates: Partial<EditorStation> = { labelFontSize: newFontSize };
    if (rl.startWidth) updates.labelWidth = rl.startWidth * scale;
    if (rl.startHeight) updates.labelHeight = rl.startHeight * scale;
    editorStore.updateStation(rl.stationId, updates);
    return;
  }

  // Handle label box resizing
  if (dragging.resizingLabelBox.value) {
    const rlb = dragging.resizingLabelBox.value;
    if (rlb.edge === 'r') {
      const dx = (e.clientX - rlb.startX) / canvas.zoom.value;
      editorStore.updateStation(rlb.stationId, { labelWidth: Math.max(30, rlb.startWidth + dx * 2) });
    } else if (rlb.edge === 'b') {
      const dy = (e.clientY - rlb.startY) / canvas.zoom.value;
      editorStore.updateStation(rlb.stationId, { labelHeight: Math.max(16, rlb.startHeight + dy * 2) });
    }
    return;
  }

  // Handle text node dragging
  if (dragging.draggingTextNode.value) {
    const dt = dragging.draggingTextNode.value;
    const dx = (e.clientX - dt.startX) / canvas.zoom.value;
    const dy = (e.clientY - dt.startY) / canvas.zoom.value;
    editorStore.updateTextNode(dt.id, { x: dt.startNodeX + dx, y: dt.startNodeY + dy });
    return;
  }

  // Handle text box resizing
  if (dragging.resizingTextBox.value) {
    const rtb = dragging.resizingTextBox.value;
    const dx = (e.clientX - rtb.startX) / canvas.zoom.value;
    const dy = (e.clientY - rtb.startY) / canvas.zoom.value;
    const updates: { width?: number; height?: number } = {};
    if (rtb.edge === 'br' || rtb.edge === 'r') updates.width = Math.max(40, rtb.startWidth + dx);
    if (rtb.edge === 'br' || rtb.edge === 'b') updates.height = Math.max(16, rtb.startHeight + dy);
    editorStore.updateTextNode(rtb.id, updates);
    return;
  }

  // Handle waypoint dragging
  if (dragging.draggingWaypoint.value && canvasContainer.value) {
    const coords = canvas.getCanvasCoords(e, canvasContainer.value);
    if (coords && dragging.draggingWaypoint.value.waypointId) {
      editorStore.updateWaypoint(dragging.draggingWaypoint.value.trackId, dragging.draggingWaypoint.value.waypointId, coords.x, coords.y);
    }
    return;
  }

  // Handle endpoint dragging
  if (dragging.draggingEndpoint.value && canvasContainer.value) {
    const coords = canvas.getCanvasCoords(e, canvasContainer.value);
    if (coords) {
      const station = getStationById(dragging.draggingEndpoint.value.stationId);
      if (station) {
        const isPill = station.length && station.length > 6;
        const effectiveLength = isPill ? station.length : 20;
        const effectiveHeight = isPill ? (station.width || canvas.stationHeight.value) : canvas.stationRadius.value * 2;
        const rotation = (station.rotation || 0) * Math.PI / 180;
        const dx = coords.x - station.x;
        const dy = coords.y - station.y;
        const cos = Math.cos(rotation);
        const sin = Math.sin(rotation);
        const projectedOffset = dx * cos + dy * sin;
        const projectedLateral = -dx * sin + dy * cos;
        const maxOffset = effectiveLength / 2 - 1;
        const maxLateral = effectiveHeight / 2;
        const normalizedOffset = Math.max(-1, Math.min(1, projectedOffset / maxOffset));
        const normalizedLateral = Math.max(-1, Math.min(1, projectedLateral / maxLateral));
        editorStore.updateTrackOffset(dragging.draggingEndpoint.value.trackId, dragging.draggingEndpoint.value.endpoint, normalizedOffset, normalizedLateral);
      }
    }
    return;
  }

  // Handle station dragging
  if (dragging.draggingStationId.value && canvasContainer.value) {
    const coords = canvas.getCanvasCoords(e, canvasContainer.value);
    if (coords) editorStore.updateStation(dragging.draggingStationId.value, { x: coords.x, y: coords.y });
    return;
  }

  // Handle panning
  canvas.updatePan(e);
}

function handleMouseUp(e: MouseEvent) {
  if (dragging.isDragging()) showSaveStatus();
  dragging.clearAllDragging();
  if (e.button === 2) canvas.isRightMousePanning.value = false;
  canvas.endPan();
}

function handleStationMouseDown(e: MouseEvent, station: EditorStation) {
  if (e.button === 0 && editorStore.selectedTool === 'select') {
    dragging.startStationDrag(station.id);
    editorStore.selectStation(station.id);
    e.preventDefault();
  }
}

function handleWaypointMouseDown(e: MouseEvent, track: EditorTrack, waypoint: Waypoint) {
  if (e.button === 0) {
    const index = track.waypoints.findIndex(w => w.id === waypoint.id);
    dragging.startWaypointDrag(track.id, waypoint, index);
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
    dragging.startEndpointDrag(track, endpoint as 1 | 2);
    editorStore.selectTrack(track.id);
    e.preventDefault();
  }
}

function handleLabelMouseDown(e: MouseEvent, station: EditorStation) {
  if (e.button === 0) {
    if (editorStore.selectedStationId !== station.id) {
      editorStore.selectStation(station.id);
      return;
    }
    dragging.startLabelDrag(station, e.clientX, e.clientY);
    e.preventDefault();
  }
}

function handleLabelResizeMouseDown(e: MouseEvent, station: EditorStation) {
  if (e.button === 0 && editorStore.selectedStationId === station.id) {
    dragging.startLabelResize(station, e.clientX, e.clientY);
    e.preventDefault();
  }
}

function handleLabelBoxResize(e: MouseEvent, station: EditorStation, edge: 'r' | 'b') {
  if (e.button === 0 && editorStore.selectedStationId === station.id) {
    dragging.startLabelBoxResize(station, e.clientX, e.clientY, edge, measureTextWidth);
    e.preventDefault();
  }
}

function handleTrackClick(track: EditorTrack) {
  if (editorStore.selectedTool === 'bend') {
    if (canvas.mousePosition.value) {
      const insertIndex = findWaypointInsertIndex(track, canvas.mousePosition.value.x, canvas.mousePosition.value.y, editorStore.stations, canvas.stationRadius.value, canvas.stationHeight.value, editorStore.tracks);
      const waypoint = editorStore.addWaypoint(track.id, canvas.mousePosition.value.x, canvas.mousePosition.value.y, insertIndex);
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
  if (canvas.isPanning.value || dragging.draggingStationId.value || dragging.draggingWaypoint.value) return;
  if (editorStore.selectedTool === 'move') return;
  
  const coords = canvas.getCanvasCoords(e, canvasContainer.value);
  if (!coords) return;

  if (editorStore.selectedTool === 'station') {
    let stationName = 'New Station';
    let isBuilderPlacement = false;
    
    if (customStationName.value) {
      stationName = customStationName.value;
      customStationName.value = '';
    } else if (trackBuilder.trackBuilderLine.value && trackBuilder.currentBuilderStation.value) {
      stationName = trackBuilder.currentBuilderStation.value;
      isBuilderPlacement = true;
    } else if (autoConnect.value && nextStationSuggestion.value?.next) {
      stationName = nextStationSuggestion.value.next;
    }
    
    const station = editorStore.addStation(coords.x, coords.y, stationName);
    editorStore.selectStation(station.id);
    
    if (autoConnect.value && lastPlacedStationId.value) {
      editorStore.addTrack(lastPlacedStationId.value, station.id, editorStore.currentLine);
    }
    
    lastPlacedStationId.value = station.id;
    if (isBuilderPlacement) trackBuilder.advanceBuilder();
    showSaveStatus();
  } else if (editorStore.selectedTool === 'text') {
    const textNode = editorStore.addTextNode(coords.x, coords.y, 'New Text');
    editorStore.selectTextNode(textNode.id);
    editingTextNodeId.value = textNode.id;
    showSaveStatus();
  } else if (editorStore.selectedTool === 'select' || editorStore.selectedTool === 'bend') {
    editorStore.clearSelection();
    editingTextNodeId.value = null;
    trackStartStation.value = null;
  }
}

function handleStationClick(e: MouseEvent, station: EditorStation) {
  if (editorStore.selectedTool === 'move') return;
  if (dragging.draggingStationId.value) return;
  
  if (editorStore.selectedTool === 'select' || editorStore.selectedTool === 'bend') {
    editorStore.selectStation(station.id);
    if (station.lines && station.lines.length > 0 && !station.lines.includes(editorStore.currentLine)) {
      editorStore.currentLine = station.lines[0];
    }
    lastPlacedStationId.value = station.id;
    e.stopPropagation();
  } else if (editorStore.selectedTool === 'station') {
    if (!station.lines.includes(editorStore.currentLine)) {
      editorStore.updateStation(station.id, { lines: [...station.lines, editorStore.currentLine] });
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

// Text node handlers
function handleTextNodeMouseDown(e: MouseEvent, textNode: TextNode) {
  if (e.button === 0 && (editorStore.selectedTool === 'select' || editorStore.selectedTool === 'text')) {
    const pos = getTextNodePosition(textNode);
    dragging.startTextNodeDrag(textNode, e.clientX, e.clientY, pos.x, pos.y);
    editorStore.selectTextNode(textNode.id);
    e.preventDefault();
  }
}

function handleTextNodeClick(textNode: TextNode) {
  if (editorStore.selectedTool === 'select' || editorStore.selectedTool === 'text') {
    editorStore.selectTextNode(textNode.id);
    if (textNode.stationId) editorStore.selectStation(textNode.stationId);
  }
}

function handleTextNodeDoubleClick(textNode: TextNode) {
  editingTextNodeId.value = textNode.id;
  editorStore.selectTextNode(textNode.id);
}

function handleTextNodeCornerResize(e: MouseEvent, textNode: TextNode, edge: 'br' | 'r' | 'b') {
  if (e.button === 0) {
    dragging.startTextBoxResize(textNode, e.clientX, e.clientY, edge);
    e.preventDefault();
  }
}

// File handlers
function handleClear() {
  if (confirm('Clear all stations and tracks?')) {
    editorStore.clearAll();
    lastPlacedStationId.value = null;
    showSaveStatus();
  }
}

function handleExport() { editorStore.exportToFile(); }
function triggerImport() { importInput.value?.click(); }

async function handleImport(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) {
    const success = await editorStore.importFromFile(file);
    if (success) showSaveStatus();
    else alert('Failed to import file. Please check the format.');
  }
  if (importInput.value) importInput.value.value = '';
}

// Keyboard shortcuts
function handleKeyDown(e: KeyboardEvent) {
  if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'SELECT') return;
  
  const key = e.key.toLowerCase();
  const selectedWaypointTrack = editorStore.selectedWaypointId ? editorStore.tracks.find(t => t.waypoints.some(w => w.id === editorStore.selectedWaypointId)) : null;
  
  if (key === 'delete' || key === 'backspace') {
    if (editorStore.selectedWaypointId && selectedWaypointTrack) {
      editorStore.removeWaypoint(selectedWaypointTrack.id, editorStore.selectedWaypointId);
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
  } else if (key === 'r' && editorStore.selectedStation) {
    let newRotation = (editorStore.selectedStation.rotation + 15) % 360;
    editorStore.updateStation(editorStore.selectedStationId!, { rotation: newRotation });
    showSaveStatus();
  } else if (key === 'v' || key === '1') editorStore.selectedTool = 'select';
  else if (key === 'h' || key === '2') editorStore.selectedTool = 'pan';
  else if (key === 'g') editorStore.selectedTool = 'move';
  else if (key === 's' || key === '3') { editorStore.selectedTool = 'station'; e.preventDefault(); }
  else if (key === 't' || key === '4') editorStore.selectedTool = 'track';
  else if (key === 'b' || key === '5') editorStore.selectedTool = 'bend';
  else if (key === 'm' || key === '6') editorStore.selectedTool = 'multiConnect';
  else if (key === 'x' || key === '7') editorStore.selectedTool = 'text';
  else if (key === '+' || key === '=') canvas.zoomIn();
  else if (key === '-') canvas.zoomOut();
  else if (key === '0') canvas.resetView();
  else if ((e.ctrlKey || e.metaKey)) {
    if (key === 'z') { if (e.shiftKey) editorStore.redo(); else editorStore.undo(); }
    else if (key === 'y') editorStore.redo();
  }
}

onMounted(() => { window.addEventListener('keydown', handleKeyDown); });
onUnmounted(() => { window.removeEventListener('keydown', handleKeyDown); });
</script>

<style scoped>
.editor-page { width: 100vw; height: 100vh; display: flex; flex-direction: column; background: #1a1a2e; color: #fff; }
.editor-header { display: flex; justify-content: space-between; align-items: center; padding: 8px 16px; background: rgba(255, 255, 255, 0.05); border-bottom: 1px solid rgba(255, 255, 255, 0.1); }
.header-left { display: flex; align-items: center; gap: 16px; }
.back-btn { color: #fff; text-decoration: none; padding: 5px 10px; border-radius: 4px; background: rgba(255, 255, 255, 0.1); font-size: 13px; }
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
.tools-panel { width: 170px; background: rgba(255, 255, 255, 0.03); border-right: 1px solid rgba(255, 255, 255, 0.1); padding: 10px; display: flex; flex-direction: column; gap: 12px; overflow-y: auto; font-size: 12px; }
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
.line-select { width: 100%; padding: 5px; border-radius: 4px; border: 1px solid rgba(255, 255, 255, 0.2); background: rgba(255, 255, 255, 0.05); color: #fff; font-size: 12px; }
.line-preview { height: 5px; border-radius: 2px; margin-top: 5px; }
.opacity-slider { width: 100%; margin-bottom: 3px; }
.opacity-value { font-size: 11px; color: rgba(255, 255, 255, 0.5); }
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
.track-endpoint, .track-endpoint-visual { fill: #fff; stroke: #4f46e5; stroke-width: 2px; cursor: move; transition: r 0.2s ease; }
.track-endpoint.dragging, .track-endpoint-visual.dragging { fill: #4f46e5; stroke: #fff; }
.station-group { cursor: pointer; }
.station-pill { transition: filter 0.15s; }
.station-group.selected .station-pill, .station-group.selected .station-circle { filter: brightness(1.3) drop-shadow(0 0 3px rgba(255,255,255,0.5)); }
.station-group.dragging .station-pill { filter: brightness(1.5); }
.station-group.multi-connect .station-pill { stroke: #4f46e5; stroke-width: 3; }
.line-segment { pointer-events: none; }
.label-connector { pointer-events: none; }
.label-resize-handle { fill: #4f46e5; stroke: #fff; stroke-width: 1; cursor: ew-resize; }
.label-resize-handle:hover { fill: #6366f1; }
.preview-line { pointer-events: none; }
.zoom-controls { position: absolute; bottom: 12px; right: 12px; display: flex; flex-direction: column; gap: 2px; }
.zoom-btn { width: 28px; height: 28px; border: none; border-radius: 4px; background: rgba(255, 255, 255, 0.9); color: #333; font-size: 14px; cursor: pointer; }
.zoom-btn:hover { background: #fff; }
.text-node-group { cursor: pointer; }
.text-node-group:hover .text-bg { fill: rgba(0, 0, 0, 0.8); }
.text-node-group.selected .text-bg { fill: rgba(30, 30, 60, 0.9); }
.text-resize-handle { fill: #4f46e5; stroke: white; stroke-width: 1; cursor: ew-resize; }
.text-resize-handle:hover { fill: #6366f1; }
.text-resize-handle.corner-handle { cursor: nwse-resize; }
.text-resize-handle.edge-handle-h { cursor: ew-resize; }
.text-resize-handle.edge-handle-v { cursor: ns-resize; }
.text-box-content { font-family: 'Inter', -apple-system, sans-serif; line-height: 1.3; }
.label-box-content { font-family: 'Inter', -apple-system, sans-serif; line-height: 1.2; }
.label-bg { pointer-events: none; }
</style>
