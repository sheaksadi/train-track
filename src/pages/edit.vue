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
        <button @click="handleExport" class="btn btn-secondary">
          📤 Export
        </button>
        <input type="file" ref="importInput" @change="handleImport" accept=".json" hidden />
        <button @click="triggerImport" class="btn btn-secondary">
          📥 Import
        </button>
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
          <div class="suggestion-ui bg-gray-700 p-2 rounded text-sm">
            <div class="text-xs text-gray-400 mb-1">Current: {{ nextStationSuggestion.current }}</div>
            <div class="flex gap-2 justify-between">
              <button 
                v-if="nextStationSuggestion.prev"
                @click="customStationName = nextStationSuggestion.prev"
                class="px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded text-xs flex-1 truncate"
                title="Use Previous Station"
              >
                ← {{ nextStationSuggestion.prev }}
              </button>
              <button 
                v-if="nextStationSuggestion.next"
                @click="customStationName = nextStationSuggestion.next"
                class="px-2 py-1 bg-blue-600 hover:bg-blue-500 rounded text-xs flex-1 truncate"
                title="Use Next Station"
              >
                {{ nextStationSuggestion.next }} →
              </button>
            </div>
          </div>
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
              @click.stop="handleStationClick($event, station)"
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
                <!-- Label text (always visible) -->
                <foreignObject
                  :x="station.labelWidth ? -(station.labelWidth / 2) : -(measureTextWidth(station.name, station.labelFontSize || 8) / 2 + 4)"
                  :y="-(station.labelHeight || (station.labelFontSize || 8) * 1.4) / 2"
                  :width="station.labelWidth || (measureTextWidth(station.name, station.labelFontSize || 8) + 8)"
                  :height="station.labelHeight || (station.labelFontSize || 8) * 1.4"
                  @mousedown.stop="handleLabelMouseDown($event, station)"
                >
                  <div 
                    xmlns="http://www.w3.org/1999/xhtml"
                    class="label-box-content"
                    :style="{
                      fontSize: `${station.labelFontSize || 8}px`,
                      fontWeight: station.labelBold ? 'bold' : 'normal',
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textAlign: 'center',
                      padding: '1px 2px',
                      boxSizing: 'border-box',
                      overflow: 'hidden',
                      wordWrap: 'break-word',
                      color: '#fff',
                      textShadow: '0 1px 3px rgba(0, 0, 0, 0.95)',
                    }"
                  >{{ station.name }}</div>
                </foreignObject>
                
                <!-- Selection UI (only when selected) -->
                <g v-if="editorStore.selectedStationId === station.id">
                  <!-- Label background (visible when selected) -->
                  <rect
                    :x="station.labelWidth ? -(station.labelWidth / 2) : -(measureTextWidth(station.name, station.labelFontSize || 8) / 2 + 4)"
                    :y="-(station.labelHeight || (station.labelFontSize || 8) * 1.4) / 2"
                    :width="station.labelWidth || (measureTextWidth(station.name, station.labelFontSize || 8) + 8)"
                    :height="station.labelHeight || (station.labelFontSize || 8) * 1.4"
                    fill="rgba(0, 0, 0, 0.5)"
                    rx="2"
                    class="label-bg"
                    style="pointer-events: none;"
                  />
                  
                  <!-- Selection border -->
                  <rect
                    :x="station.labelWidth ? -(station.labelWidth / 2) - 2 : -(measureTextWidth(station.name, station.labelFontSize || 8) / 2 + 6)"
                    :y="-(station.labelHeight || (station.labelFontSize || 8) * 1.4) / 2 - 2"
                    :width="(station.labelWidth || (measureTextWidth(station.name, station.labelFontSize || 8) + 8)) + 4"
                    :height="(station.labelHeight || (station.labelFontSize || 8) * 1.4) + 4"
                    fill="none"
                    stroke="rgba(79, 70, 229, 0.8)"
                    stroke-width="1.5"
                    stroke-dasharray="4,2"
                    rx="3"
                  />
                  
                  <!-- Corner handle (bottom-right) - font size -->
                  <rect
                    :x="(station.labelWidth || measureTextWidth(station.name, station.labelFontSize || 8) + 8) / 2 + 2"
                    :y="(station.labelHeight || (station.labelFontSize || 8) * 1.4) / 2 + 2"
                    width="8"
                    height="8"
                    rx="2"
                    class="label-resize-handle corner-handle"
                    @mousedown.stop="handleLabelResizeMouseDown($event, station)"
                  />
                  
                  <!-- Right edge handle - width -->
                  <rect
                    :x="(station.labelWidth || measureTextWidth(station.name, station.labelFontSize || 8) + 8) / 2 - 2"
                    :y="-6"
                    width="4"
                    height="12"
                    rx="1"
                    class="label-resize-handle edge-handle-h"
                    @mousedown.stop="handleLabelBoxResize($event, station, 'r')"
                  />
                  
                  <!-- Bottom edge handle - height -->
                  <rect
                    :x="-6"
                    :y="(station.labelHeight || (station.labelFontSize || 8) * 1.4) / 2 - 2"
                    width="12"
                    height="4"
                    rx="1"
                    class="label-resize-handle edge-handle-v"
                    @mousedown.stop="handleLabelBoxResize($event, station, 'b')"
                  />
                </g>
              </g>
            </g>

            <!-- Text Nodes -->
            <g
              v-for="textNode in editorStore.textNodes"
              :key="textNode.id"
              class="text-node-group"
              :class="{ 
                selected: editorStore.selectedTextNodeId === textNode.id,
                editing: editingTextNodeId === textNode.id,
              }"
              :transform="`translate(${getTextNodePosition(textNode).x}, ${getTextNodePosition(textNode).y})`"
              @mousedown.stop="handleTextNodeMouseDown($event, textNode)"
              @click.stop="handleTextNodeClick(textNode)"
              @dblclick.stop="handleTextNodeDoubleClick(textNode)"
            >
              <!-- Text box background -->
              <rect
                x="0"
                y="0"
                :width="textNode.width || 80"
                :height="textNode.height || 24"
                fill="rgba(0, 0, 0, 0.6)"
                rx="3"
                class="text-bg"
              />
              
              <!-- Multi-line text using foreignObject -->
              <foreignObject
                x="0"
                y="0"
                :width="textNode.width || 80"
                :height="textNode.height || 24"
              >
                <div 
                  xmlns="http://www.w3.org/1999/xhtml"
                  class="text-box-content"
                  :style="{
                    fontSize: `${textNode.fontSize}px`,
                    fontWeight: textNode.isBold ? 'bold' : 'normal',
                    width: '100%',
                    height: '100%',
                    padding: '2px 4px',
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                    wordWrap: 'break-word',
                    color: '#fff',
                  }"
                >{{ textNode.text }}</div>
              </foreignObject>
              
              <!-- Selection indicator and resize handles -->
              <g v-if="editorStore.selectedTextNodeId === textNode.id">
                <!-- Selection border -->
                <rect
                  x="-2"
                  y="-2"
                  :width="(textNode.width || 80) + 4"
                  :height="(textNode.height || 24) + 4"
                  fill="none"
                  stroke="rgba(79, 70, 229, 0.8)"
                  stroke-width="1.5"
                  stroke-dasharray="4,2"
                  rx="4"
                />
                
                <!-- Corner resize handles -->
                <!-- Bottom-right (main resize) -->
                <rect
                  :x="(textNode.width || 80) - 4"
                  :y="(textNode.height || 24) - 4"
                  width="8"
                  height="8"
                  rx="2"
                  class="text-resize-handle corner-handle"
                  @mousedown.stop="handleTextNodeCornerResize($event, textNode, 'br')"
                />
                <!-- Right edge (width only) -->
                <rect
                  :x="(textNode.width || 80) - 2"
                  :y="(textNode.height || 24) / 2 - 6"
                  width="4"
                  height="12"
                  rx="1"
                  class="text-resize-handle edge-handle-h"
                  @mousedown.stop="handleTextNodeCornerResize($event, textNode, 'r')"
                />
                <!-- Bottom edge (height only) -->
                <rect
                  :x="(textNode.width || 80) / 2 - 6"
                  :y="(textNode.height || 24) - 2"
                  width="12"
                  height="4"
                  rx="1"
                  class="text-resize-handle edge-handle-v"
                  @mousedown.stop="handleTextNodeCornerResize($event, textNode, 'b')"
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
            <div class="filter-controls" style="display: flex; gap: 10px; margin-bottom: 5px; font-size: 12px;">
              <label><input type="checkbox" v-model="showS"> S-Bahn</label>
              <label><input type="checkbox" v-model="showU"> U-Bahn</label>
              <label><input type="checkbox" v-model="showOther"> Other</label>
            </div>
            <StationSelector
              :modelValue="editorStore.selectedStation.name"
              @update:modelValue="(val) => editorStore.selectedStationId && editorStore.updateStation(editorStore.selectedStationId, { name: val })"
              @select="handleStationSelect"
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
            <label class="toggle-row">
              <input 
                type="checkbox" 
                :checked="editorStore.selectedStation.labelBold"
                @change="toggleLabelBold"
              />
              <span>Bold Label</span>
            </label>
            <button @click="resetLabelPosition" class="btn btn-small btn-secondary">
              Reset Label Position
            </button>
          </div>

          <div class="property-group">
            <label>Label Width: {{ editorStore.selectedStation.labelWidth ? Math.round(editorStore.selectedStation.labelWidth) + 'px' : 'Auto' }}</label>
            <input 
              type="range" 
              :value="editorStore.selectedStation.labelWidth || 40"
              @input="updateLabelWidth($event)"
              min="30" 
              max="200" 
              step="5"
              class="length-slider"
            />
            <button @click="resetLabelWidth" class="btn btn-small btn-secondary">
              Reset Width
            </button>
          </div>

          <div class="property-group">
            <label>Label Height: {{ editorStore.selectedStation.labelHeight ? Math.round(editorStore.selectedStation.labelHeight) + 'px' : 'Auto' }}</label>
            <input 
              type="range" 
              :value="editorStore.selectedStation.labelHeight || 16"
              @input="updateLabelHeight($event)"
              min="10" 
              max="100" 
              step="2"
              class="length-slider"
            />
            <button @click="resetLabelHeight" class="btn btn-small btn-secondary">
              Reset Height
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

        <div v-else-if="editorStore.selectedTextNode" class="property-content">
          <div class="property-group">
            <label>Text Content</label>
            <input 
              type="text" 
              :value="editorStore.selectedTextNode.text"
              @input="updateTextNodeText($event)"
              class="text-input"
              placeholder="Enter text..."
            />
          </div>

          <div class="property-group">
            <label>Font Size: {{ editorStore.selectedTextNode.fontSize }}px</label>
            <input 
              type="range" 
              :value="editorStore.selectedTextNode.fontSize"
              @input="updateTextNodeFontSize($event)"
              min="6" 
              max="48" 
              step="1"
              class="length-slider"
            />
            <label class="toggle-row">
              <input 
                type="checkbox" 
                :checked="editorStore.selectedTextNode.isBold"
                @change="toggleTextNodeBold"
              />
              <span>Bold Text</span>
            </label>
          </div>

          <div class="property-group">
            <label>Width: {{ editorStore.selectedTextNode.width || 80 }}px</label>
            <input 
              type="range" 
              :value="editorStore.selectedTextNode.width || 80"
              @input="updateTextNodeWidth($event)"
              min="40" 
              max="300" 
              step="10"
              class="length-slider"
            />
          </div>

          <div class="property-group">
            <label>Height: {{ editorStore.selectedTextNode.height || 24 }}px</label>
            <input 
              type="range" 
              :value="editorStore.selectedTextNode.height || 24"
              @input="updateTextNodeHeight($event)"
              min="16" 
              max="200" 
              step="4"
              class="length-slider"
            />
          </div>

          <div class="property-group">
            <label>Link to Station (optional)</label>
            <select 
              :value="editorStore.selectedTextNode.stationId || ''"
              @change="updateTextNodeStation($event)"
              class="line-select"
            >
              <option value="">None (standalone)</option>
              <option v-for="station in editorStore.stations" :key="station.id" :value="station.id">
                {{ station.name }}
              </option>
            </select>
          </div>

          <div class="property-group">
            <label>Position</label>
            <div class="position-inputs">
              <input 
                type="number" 
                :value="Math.round(editorStore.selectedTextNode.x)"
                @input="updateTextNodePosition('x', $event)"
                placeholder="X"
              />
              <input 
                type="number" 
                :value="Math.round(editorStore.selectedTextNode.y)"
                @input="updateTextNodePosition('y', $event)"
                placeholder="Y"
              />
            </div>
          </div>

          <button @click="deleteSelectedTextNode" class="btn btn-danger delete-btn">
            🗑 Delete Text
          </button>
        </div>

        <div v-else class="property-placeholder">
          <p>Select a station, track, or text</p>
          <p class="hint">Click existing station to add tracks</p>
          <p class="hint">Use X to add text nodes</p>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import { useEditorStore, type EditorStation, type EditorTrack, type Waypoint, type TextNode } from '@/stores/editorStore';
import { allStationNames, allLines, getLineColor, allBvgStations, getStationsForLine } from '@/data/stationNames';
import { ubahnLines } from '@/data/ubahn';
import { sbahnLines } from '@/data/sbahn';
import StationSelector from '@/components/StationSelector.vue';

const editorStore = useEditorStore();

// Station Filtering (Manual List - no need for strict filters now as list is pre-filtered, but keeping if useful)
// Actually, since the list is manual, we can simplify/remove filters or keep 'Other' for lines.
const params = new URLSearchParams(window.location.search);
const showS = ref(true);
const showU = ref(true);
const showOther = ref(true); 

console.log('Edit.vue setup starting');

// Filter logic (optional now, but good for searching)
const filteredStationNames = computed(() => {
  try {
    const list = allBvgStations || [];
    return list.filter(s => {
        // If we have line info, use it for filtering
        if (s.lines && s.lines.length > 0) {
            const hasS = s.lines.some(l => l && l.toString().startsWith('S'));
            const hasU = s.lines.some(l => l && l.toString().startsWith('U'));
            const hasOther = !hasS && !hasU;
            
            return (hasS && showS.value) || (hasU && showU.value) || (hasOther && showOther.value);
        }
        return true;
    }).map(s => s.name).sort();
  } catch (e) {
    console.error('Error in filteredStationNames computed:', e);
    return [];
  }
});

const stationOptions = computed(() => {
  return filteredStationNames.value;
});

console.log('Edit.vue setup continuing...');

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
const draggingWaypoint = ref<{ trackId: string, index: number, waypointId?: string } | null>(null); // Index is typically used
const draggingEndpoint = ref<{ trackId: string; endpoint: 1 | 2; stationId: string } | null>(null);
const draggingLabel = ref<{ stationId: string; startX: number; startY: number; startOffsetX: number; startOffsetY: number } | null>(null);
const resizingLabel = ref<{ stationId: string, startFontSize: number, startX: number, startY: number, startWidth?: number, startHeight?: number } | null>(null);
const resizingLabelBox = ref<{ stationId: string, startWidth: number, startHeight: number, startX: number, startY: number, edge: 'r' | 'b' } | null>(null);
const resizingTextBox = ref<{ id: string, startWidth: number, startHeight: number, startX: number, startY: number, edge: string } | null>(null);

const draggingTextNode = ref<{ id: string; startX: number; startY: number; startNodeX: number; startNodeY: number } | null>(null);
const resizingTextNode = ref<{ id: string; startX: number; startFontSize: number } | null>(null);
const editingTextNodeId = ref<string | null>(null);

// UI refs
const canvasContainer = ref<HTMLElement | null>(null);
const importInput = ref<HTMLInputElement | null>(null);
const customStationName = ref('');
const saveStatus = ref('');

// Auto-connect and last placed station
const autoConnect = ref(true);
const lastPlacedStationId = ref<string | null>(null);

// Find track containing selected waypoint
const selectedWaypointTrack = computed(() => {
  if (!editorStore.selectedWaypointId) return null;
  return editorStore.tracks.find(t => 
    t.waypoints.some(w => w.id === editorStore.selectedWaypointId)
  ) || null;
});

const nextStationSuggestion = computed(() => {
  if (!lastPlacedStationId.value) return null;
  
  const lastStation = editorStore.stations.find(s => s.id === lastPlacedStationId.value);
  if (!lastStation) return null;

  // Smart Suggestion Strategy:
  // 1. Get current active line (e.g. U8)
  const line = editorStore.currentLine;
  
  // 2. Get all stations on this line from our manual data
  const stationsOnLine = getStationsForLine(line);
  
  if (!stationsOnLine || stationsOnLine.length === 0) return null;
  
  // 3. Find neighbor in list
  // Levenshtein distance for fuzzy matching
  const levenshtein = (a: string, b: string): number => {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
            }
        }
    }
    return matrix[b.length][a.length];
  };

  const clean = (n: string) => n.replace(/\s*\(Berlin\)\s*/i, '').replace(/^(S\+U|S|U)\s+/i, '').trim();
  const targetName = clean(lastStation.name);

  // Find best match
  let bestMatchIdx = -1;
  let minDistance = Infinity;

  stationsOnLine.forEach((stationName, index) => {
      const dist = levenshtein(clean(stationName).toLowerCase(), targetName.toLowerCase());
      if (dist < minDistance) {
          minDistance = dist;
          bestMatchIdx = index;
      }
  });

  // Threshold for match (allow small typos or variations)
  if (bestMatchIdx !== -1 && minDistance <= 5) {
      return {
          current: stationsOnLine[bestMatchIdx],
          prev: bestMatchIdx > 0 ? stationsOnLine[bestMatchIdx - 1] : null,
          next: bestMatchIdx < stationsOnLine.length - 1 ? stationsOnLine[bestMatchIdx + 1] : null
      };
  }
  
  // Fallback: just return first station if nothing matches well
  return { current: 'Unknown', next: stationsOnLine[0], prev: null };
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
  { id: 'text', icon: '📝', label: 'Text', shortcut: 'X' },
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

// Get text node position (supports station-linked text)
function getTextNodePosition(textNode: TextNode): { x: number; y: number } {
  if (textNode.stationId) {
    const station = getStationById(textNode.stationId);
    if (station) {
      return {
        x: station.x + textNode.x,
        y: station.y + textNode.y,
      };
    }
  }
  return { x: textNode.x, y: textNode.y };
}

// Text node handlers
function handleTextNodeMouseDown(e: MouseEvent, textNode: TextNode) {
  if (e.button === 0 && (editorStore.selectedTool === 'select' || editorStore.selectedTool === 'text')) {
    const pos = getTextNodePosition(textNode);
    draggingTextNode.value = {
      id: textNode.id,
      startX: e.clientX,
      startY: e.clientY,
      startNodeX: pos.x,
      startNodeY: pos.y,
    };
    editorStore.selectTextNode(textNode.id);
    e.preventDefault();
  }
}

function handleTextNodeClick(textNode: TextNode) {
  if (editorStore.selectedTool === 'select' || editorStore.selectedTool === 'text') {
    editorStore.selectTextNode(textNode.id);
    // If text is linked to a station, also highlight it (select station for properties)
    if (textNode.stationId) {
      editorStore.selectStation(textNode.stationId);
    }
  }
}

function handleTextNodeDoubleClick(textNode: TextNode) {
  editingTextNodeId.value = textNode.id;
  editorStore.selectTextNode(textNode.id);
}

function handleTextNodeResizeMouseDown(e: MouseEvent, textNode: TextNode) {
  if (e.button === 0) {
    resizingTextNode.value = {
      id: textNode.id,
      startX: e.clientX,
      startFontSize: textNode.fontSize,
    };
    e.preventDefault();
  }
}

function handleTextNodeCornerResize(e: MouseEvent, textNode: TextNode, edge: 'br' | 'r' | 'b') {
  if (e.button === 0) {
    resizingTextBox.value = {
      id: textNode.id,
      edge,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: textNode.width || 80,
      startHeight: textNode.height || 24,
    };
    e.preventDefault();
  }
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
    const oldFontSize = resizingLabel.value.startFontSize;
    const newFontSize = Math.max(6, Math.min(48, oldFontSize + dx * 0.2));
    const scale = newFontSize / oldFontSize;
    
    const updates: Partial<EditorStation> = { labelFontSize: newFontSize };
    
    // If width/height were set at start, scale them proportionally
    if (resizingLabel.value.startWidth) {
      updates.labelWidth = resizingLabel.value.startWidth * scale;
    }
    if (resizingLabel.value.startHeight) {
      updates.labelHeight = resizingLabel.value.startHeight * scale;
    }
    
    editorStore.updateStation(resizingLabel.value.stationId, updates);
    return;
  }

  // Handle label box resizing
  if (resizingLabelBox.value) {
    if (resizingLabelBox.value.edge === 'r') {
      const dx = (e.clientX - resizingLabelBox.value.startX) / zoom.value;
      const newWidth = Math.max(30, resizingLabelBox.value.startWidth + dx * 2); // *2 because centered
      editorStore.updateStation(resizingLabelBox.value.stationId, { labelWidth: newWidth });
    } else if (resizingLabelBox.value.edge === 'b') {
      const dy = (e.clientY - resizingLabelBox.value.startY) / zoom.value;
      const newHeight = Math.max(16, resizingLabelBox.value.startHeight + dy * 2); // *2 because centered
      editorStore.updateStation(resizingLabelBox.value.stationId, { labelHeight: newHeight });
    }
    return;
  }

  // Handle text node dragging
  if (draggingTextNode.value) {
    const dx = (e.clientX - draggingTextNode.value.startX) / zoom.value;
    const dy = (e.clientY - draggingTextNode.value.startY) / zoom.value;
    
    editorStore.updateTextNode(draggingTextNode.value.id, {
      x: draggingTextNode.value.startNodeX + dx,
      y: draggingTextNode.value.startNodeY + dy,
    });
    return;
  }

  // Handle text node resizing
  if (resizingTextNode.value) {
    const dx = (e.clientX - resizingTextNode.value.startX) / zoom.value;
    const newFontSize = Math.max(6, Math.min(48, resizingTextNode.value.startFontSize + dx * 0.2));
    
    editorStore.updateTextNode(resizingTextNode.value.id, {
      fontSize: newFontSize,
    });
    return;
  }

  // Handle text box corner/edge resizing
  if (resizingTextBox.value) {
    const dx = (e.clientX - resizingTextBox.value.startX) / zoom.value;
    const dy = (e.clientY - resizingTextBox.value.startY) / zoom.value;
    
    const updates: { width?: number; height?: number } = {};
    
    if (resizingTextBox.value.edge === 'br' || resizingTextBox.value.edge === 'r') {
      updates.width = Math.max(40, resizingTextBox.value.startWidth + dx);
    }
    if (resizingTextBox.value.edge === 'br' || resizingTextBox.value.edge === 'b') {
      updates.height = Math.max(16, resizingTextBox.value.startHeight + dy);
    }
    
    editorStore.updateTextNode(resizingTextBox.value.id, updates);
    return;
  }

  if (draggingWaypoint.value && canvasContainer.value) {
    const rect = canvasContainer.value.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom.value;
    const y = (e.clientY - rect.top - pan.y) / zoom.value;
    if (draggingWaypoint.value.waypointId) {
      editorStore.updateWaypoint(draggingWaypoint.value.trackId, draggingWaypoint.value.waypointId, x, y);
    } else {
      // Fallback if we only have index (legacy support or if logic changes)
      // For now, we always set waypointId in handleWaypointMouseDown
      const track = editorStore.tracks.find(t => t.id === draggingWaypoint.value!.trackId);
      if (track) {
         const wp = track.waypoints[draggingWaypoint.value.index];
         if (wp) editorStore.updateWaypoint(track.id, wp.id, x, y);
      }
    }
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
  if (draggingStationId.value || draggingWaypoint.value || draggingEndpoint.value || draggingLabel.value || resizingLabel.value || resizingLabelBox.value || draggingTextNode.value || resizingTextNode.value || resizingTextBox.value) showSaveStatus();
  
  draggingStationId.value = null;
  draggingWaypoint.value = null;
  draggingEndpoint.value = null;
  draggingLabel.value = null;
  resizingLabel.value = null;
  resizingLabelBox.value = null;
  draggingTextNode.value = null;
  resizingTextNode.value = null;
  resizingTextBox.value = null;
  
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
    const index = track.waypoints.findIndex(w => w.id === waypoint.id);
    draggingWaypoint.value = { trackId: track.id, index, waypointId: waypoint.id };
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
  if (e.button === 0) {
    // If station not selected, select it first
    if (editorStore.selectedStationId !== station.id) {
      editorStore.selectStation(station.id);
      return;
    }
    
    // Station is already selected, enable dragging
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
      startY: e.clientY,
      startFontSize: station.labelFontSize || 8,
      startWidth: station.labelWidth,
      startHeight: station.labelHeight,
    };
    e.preventDefault();
  }
}

function handleLabelBoxResize(e: MouseEvent, station: EditorStation, edge: 'r' | 'b') {
  if (e.button === 0 && editorStore.selectedStationId === station.id) {
    resizingLabelBox.value = {
      stationId: station.id,
      edge,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: station.labelWidth || measureTextWidth(station.name, station.labelFontSize || 8) + 8,
      startHeight: station.labelHeight || (station.labelFontSize || 8) * 1.4,
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
    let stationName = 'New Station';
    
    if (customStationName.value) {
      stationName = customStationName.value;
      customStationName.value = '';
    } else if (autoConnect.value && nextStationSuggestion.value?.next) {
      stationName = nextStationSuggestion.value.next;
    }
    
    const station = editorStore.addStation(x, y, stationName);
    editorStore.selectStation(station.id);
    
    if (autoConnect.value && lastPlacedStationId.value) {
      editorStore.addTrack(lastPlacedStationId.value, station.id, editorStore.currentLine);
    }
    
    lastPlacedStationId.value = station.id;
    showSaveStatus();
  } else if (editorStore.selectedTool === 'text') {
    // Create a new text node
    const textNode = editorStore.addTextNode(x, y, 'New Text');
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
  if (draggingStationId.value) return;
  
  if (editorStore.selectedTool === 'select' || editorStore.selectedTool === 'bend') {
    editorStore.selectStation(station.id);
    
    // Auto-switch line if current line is not served by this station
    if (station.lines && station.lines.length > 0) {
      if (!station.lines.includes(editorStore.currentLine)) {
        editorStore.currentLine = station.lines[0];
      }
    }
    
    // Update last placed station for suggestion logic
    lastPlacedStationId.value = station.id;
    
    e.stopPropagation();
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
  const target = e.target as HTMLInputElement;
  if (editorStore.selectedStationId) {
    editorStore.updateStation(editorStore.selectedStationId, { name: target.value });
  }
}

function handleStationSelect(station: any) {
  if (editorStore.selectedStationId) {
    // Update station with new name and coordinates
    editorStore.updateStation(editorStore.selectedStationId, { 
      name: station.name,
      lat: station.lat,
      lng: station.lng
    });
    
    // Auto-switch line if possible (though we might not know lines from API yet, usually we rely on existing lines)
    // If the station has lines (from local update or if API provided them), switch
    // Note: API 'lines' might be empty here, but if we updated the station, we can check.
    const updatedStation = editorStore.stations.find(s => s.id === editorStore.selectedStationId);
    if (updatedStation && updatedStation.lines.length > 0 && !updatedStation.lines.includes(editorStore.currentLine)) {
       editorStore.currentLine = updatedStation.lines[0];
    }
    
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

function updateLabelWidth(e: Event) {
  const value = parseInt((e.target as HTMLInputElement).value);
  if (editorStore.selectedStationId && !isNaN(value)) {
    editorStore.updateStation(editorStore.selectedStationId, { labelWidth: value });
    showSaveStatus();
  }
}

function resetLabelWidth() {
  if (editorStore.selectedStationId) {
    editorStore.updateStation(editorStore.selectedStationId, { labelWidth: undefined });
    showSaveStatus();
  }
}

function updateLabelHeight(e: Event) {
  const value = parseInt((e.target as HTMLInputElement).value);
  if (editorStore.selectedStationId && !isNaN(value)) {
    editorStore.updateStation(editorStore.selectedStationId, { labelHeight: value });
    showSaveStatus();
  }
}

function resetLabelHeight() {
  if (editorStore.selectedStationId) {
    editorStore.updateStation(editorStore.selectedStationId, { labelHeight: undefined });
    showSaveStatus();
  }
}

function updateTextNodeWidth(e: Event) {
  const value = parseInt((e.target as HTMLInputElement).value);
  if (editorStore.selectedTextNodeId && !isNaN(value)) {
    editorStore.updateTextNode(editorStore.selectedTextNodeId, { width: value });
    showSaveStatus();
  }
}

function updateTextNodeHeight(e: Event) {
  const value = parseInt((e.target as HTMLInputElement).value);
  if (editorStore.selectedTextNodeId && !isNaN(value)) {
    editorStore.updateTextNode(editorStore.selectedTextNodeId, { height: value });
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

// Text node updates
function updateTextNodeText(e: Event) {
  const value = (e.target as HTMLInputElement).value;
  if (editorStore.selectedTextNodeId) {
    editorStore.updateTextNode(editorStore.selectedTextNodeId, { text: value });
    showSaveStatus();
  }
}

function updateTextNodeFontSize(e: Event) {
  const value = parseInt((e.target as HTMLInputElement).value);
  if (editorStore.selectedTextNodeId && !isNaN(value)) {
    editorStore.updateTextNode(editorStore.selectedTextNodeId, { fontSize: value });
    showSaveStatus();
  }
}

function updateTextNodeStation(e: Event) {
  const value = (e.target as HTMLSelectElement).value;
  if (editorStore.selectedTextNodeId) {
    editorStore.updateTextNode(editorStore.selectedTextNodeId, { 
      stationId: value || undefined 
    });
    showSaveStatus();
  }
}

function updateTextNodePosition(axis: 'x' | 'y', e: Event) {
  const value = parseInt((e.target as HTMLInputElement).value);
  if (editorStore.selectedTextNodeId && !isNaN(value)) {
    editorStore.updateTextNode(editorStore.selectedTextNodeId, { [axis]: value });
    showSaveStatus();
  }
}

function deleteSelectedTextNode() {
  if (editorStore.selectedTextNodeId) {
    editorStore.removeTextNode(editorStore.selectedTextNodeId);
    editingTextNodeId.value = null;
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

function handleExport() {
  editorStore.exportToFile();
}

function triggerImport() {
  importInput.value?.click();
}

async function handleImport(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) {
    const success = await editorStore.importFromFile(file);
    if (success) {
      showSaveStatus();
    } else {
      alert('Failed to import file. Please check the format.');
    }
  }
  // Reset input so same file can be selected again
  if (importInput.value) importInput.value.value = '';
}

function toggleLabelBold() {
  if (editorStore.selectedStationId) {
    const current = editorStore.selectedStation?.labelBold || false;
    editorStore.updateStation(editorStore.selectedStationId, { labelBold: !current });
    showSaveStatus();
  }
}

function toggleTextNodeBold() {
  if (editorStore.selectedTextNodeId) {
    const current = editorStore.selectedTextNode?.isBold || false;
    editorStore.updateTextNode(editorStore.selectedTextNodeId, { isBold: !current });
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
  } else if (key === 'x' || key === '7') {
    editorStore.selectedTool = 'text';
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

.name-select, .custom-name-input, .name-input { width: 100%; padding: 5px 6px; border-radius: 4px; border: 1px solid rgba(255, 255, 255, 0.2); background: rgba(255, 255, 255, 0.05); color: #fff; font-size: 12px; }
.lines-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 3px; }
.line-btn { padding: 3px 2px; border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 3px; background: rgba(255, 255, 255, 0.05); color: #fff; font-size: 9px; font-weight: 600; cursor: pointer; }
.line-btn:hover { background: rgba(255, 255, 255, 0.15); }
.line-btn.active { border-color: transparent; }

.rotation-buttons { display: flex; gap: 4px; }
.position-inputs { display: flex; gap: 6px; }
.position-inputs input { flex: 1; padding: 5px 6px; border-radius: 4px; border: 1px solid rgba(255, 255, 255, 0.2); background: rgba(255, 255, 255, 0.05); color: #fff; font-size: 12px; }

.delete-btn { width: 100%; margin-top: 6px; }

/* Text nodes */
.text-node-group { cursor: pointer; }
.text-node-group:hover .text-bg { fill: rgba(0, 0, 0, 0.8); }
.text-node-group.selected .text-bg { fill: rgba(30, 30, 60, 0.9); }
.text-node-text { fill: #fff; font-family: 'Inter', -apple-system, sans-serif; font-weight: 500; cursor: pointer; }
.text-resize-handle { fill: #4f46e5; stroke: white; stroke-width: 1; cursor: ew-resize; }
.text-resize-handle:hover { fill: #6366f1; }
.text-resize-handle.corner-handle { cursor: nwse-resize; }
.text-resize-handle.edge-handle-h { cursor: ew-resize; }
.text-resize-handle.edge-handle-v { cursor: ns-resize; }
.text-input { width: 100%; padding: 6px 8px; border-radius: 4px; border: 1px solid rgba(255, 255, 255, 0.2); background: rgba(255, 255, 255, 0.08); color: #fff; font-size: 13px; }
.text-input:focus { outline: none; border-color: #4f46e5; }

/* Text box content styling */
.text-box-content { font-family: 'Inter', -apple-system, sans-serif; line-height: 1.3; }
.label-box-content { font-family: 'Inter', -apple-system, sans-serif; line-height: 1.2; }
.label-bg { pointer-events: none; }
.label-resize-handle { fill: #4f46e5; stroke: white; stroke-width: 1; }
.label-resize-handle.edge-handle-h { cursor: ew-resize; }
</style>
