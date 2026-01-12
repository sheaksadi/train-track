<template>
  <aside class="properties-panel">
    <h3>Properties</h3>
    
    <!-- Station Properties -->
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
          min="5" 
          max="80" 
          step="1"
          class="length-slider"
        />
      </div>

      <div class="property-group" v-if="editorStore.selectedStation.length > 6">
        <label>Width: {{ editorStore.selectedStation.width || 8 }}px</label>
        <input 
          type="range" 
          :value="editorStore.selectedStation.width || 8"
          @input="updateStationWidth($event)"
          min="4" 
          max="30" 
          step="1"
          class="length-slider"
        />
        <button @click="resetStationWidth" class="btn btn-small btn-secondary">
          Reset Width
        </button>
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

    <!-- Track Properties -->
    <div v-else-if="editorStore.selectedTrack" class="property-content">
      <div class="property-group">
        <label>Track Line</label>
        <select 
          :value="editorStore.selectedTrack.line"
          @change="updateTrackLine($event)"
          class="line-select mb-2"
        >
          <option v-for="line in allLines" :key="line" :value="line">
            {{ line }}
          </option>
        </select>
        
        <label class="block text-gray-500 text-xs mb-1">Corner Radius: {{ editorStore.selectedTrack.cornerRadius ?? 20 }}</label>
        <input 
          type="range" 
          min="0" 
          max="100" 
          step="5"
          :value="editorStore.selectedTrack.cornerRadius ?? 20"
          @input="editorStore.updateTrackCornerRadius(editorStore.selectedTrack.id, +($event.target as HTMLInputElement).value)"
          class="w-full mb-2"
        />
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

    <!-- Waypoint Properties -->
    <div v-else-if="editorStore.selectedWaypointId && selectedWaypointTrack" class="property-content">
      <div class="property-group">
        <label>Bend Point</label>
        <p class="hint">Drag to reposition</p>
      </div>
      <button @click="deleteSelectedWaypoint" class="btn btn-danger delete-btn">
        🗑 Delete Bend Point
      </button>
    </div>

    <!-- Text Node Properties -->
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

    <!-- No Selection -->
    <div v-else class="property-placeholder">
      <p>Select a station, track, or text</p>
      <p class="hint">Click existing station to add tracks</p>
      <p class="hint">Use X to add text nodes</p>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useEditorStore } from '@/stores/editor';
import { allLines, getLineColor } from '@/data/stationNames';
import StationSelector from '@/components/StationSelector.vue';

const editorStore = useEditorStore();

// Station filtering
const showS = ref(true);
const showU = ref(true);
const showOther = ref(true);

// Find track containing selected waypoint
const selectedWaypointTrack = computed(() => {
  if (!editorStore.selectedWaypointId) return null;
  return editorStore.tracks.find(t => 
    t.waypoints.some(w => w.id === editorStore.selectedWaypointId)
  ) || null;
});

const emit = defineEmits<{
  (e: 'save'): void
}>();

function showSaveStatus() {
  emit('save');
}

// Station handlers
function handleStationSelect(station: any) {
  if (editorStore.selectedStationId) {
    editorStore.updateStation(editorStore.selectedStationId, { 
      name: station.name,
      lat: station.lat,
      lng: station.lng
    });
    
    const updatedStation = editorStore.stations.find(s => s.id === editorStore.selectedStationId);
    if (updatedStation && updatedStation.lines.length > 0 && !updatedStation.lines.includes(editorStore.currentLine)) {
       editorStore.currentLine = updatedStation.lines[0];
    }
    
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

function updateStationWidth(e: Event) {
  const value = parseInt((e.target as HTMLInputElement).value);
  if (editorStore.selectedStationId && !isNaN(value)) {
    editorStore.updateStation(editorStore.selectedStationId, { width: value });
    showSaveStatus();
  }
}

function resetStationWidth() {
  if (editorStore.selectedStationId) {
    editorStore.updateStation(editorStore.selectedStationId, { width: undefined });
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

function toggleLabelBold() {
  if (editorStore.selectedStationId) {
    const current = editorStore.selectedStation?.labelBold || false;
    editorStore.updateStation(editorStore.selectedStationId, { labelBold: !current });
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

function updateStationPosition(axis: 'x' | 'y', e: Event) {
  const value = parseInt((e.target as HTMLInputElement).value);
  if (editorStore.selectedStationId && !isNaN(value)) {
    editorStore.updateStation(editorStore.selectedStationId, { [axis]: value });
    showSaveStatus();
  }
}

function deleteSelectedStation() {
  if (editorStore.selectedStationId) {
    editorStore.removeStation(editorStore.selectedStationId);
    showSaveStatus();
  }
}

// Track handlers
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

// Waypoint handlers
function deleteSelectedWaypoint() {
  if (editorStore.selectedWaypointId && selectedWaypointTrack.value) {
    editorStore.removeWaypoint(selectedWaypointTrack.value.id, editorStore.selectedWaypointId);
    showSaveStatus();
  }
}

// Text node handlers
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

function toggleTextNodeBold() {
  if (editorStore.selectedTextNodeId) {
    const current = editorStore.selectedTextNode?.isBold || false;
    editorStore.updateTextNode(editorStore.selectedTextNodeId, { isBold: !current });
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
    showSaveStatus();
  }
}
</script>

<style scoped>
.properties-panel { 
  width: 220px; 
  background: rgba(255, 255, 255, 0.03); 
  border-left: 1px solid rgba(255, 255, 255, 0.1); 
  padding: 10px; 
  overflow-y: auto; 
}
.properties-panel h3 { margin: 0 0 10px 0; font-size: 13px; font-weight: 600; }
.property-content { display: flex; flex-direction: column; gap: 12px; }
.property-placeholder { color: rgba(255, 255, 255, 0.4); font-size: 12px; text-align: center; padding: 16px 8px; }
.property-placeholder .hint { margin-top: 8px; }

.property-group { display: flex; flex-direction: column; gap: 5px; }
.property-group label { font-size: 10px; font-weight: 500; color: rgba(255, 255, 255, 0.5); text-transform: uppercase; }

.lines-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 3px; }
.line-btn { padding: 3px 2px; border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 3px; background: rgba(255, 255, 255, 0.05); color: #fff; font-size: 9px; font-weight: 600; cursor: pointer; }
.line-btn:hover { background: rgba(255, 255, 255, 0.15); }
.line-btn.active { border-color: transparent; }

.rotation-slider, .length-slider { width: 100%; margin-bottom: 3px; }
.rotation-buttons { display: flex; gap: 4px; }
.position-inputs { display: flex; gap: 6px; }
.position-inputs input { flex: 1; padding: 5px 6px; border-radius: 4px; border: 1px solid rgba(255, 255, 255, 0.2); background: rgba(255, 255, 255, 0.05); color: #fff; font-size: 12px; }

.delete-btn { width: 100%; margin-top: 6px; }

.btn { padding: 5px 12px; border: none; border-radius: 4px; font-size: 12px; font-weight: 500; cursor: pointer; }
.btn-small { padding: 3px 8px; font-size: 11px; }
.btn-secondary { background: rgba(255, 255, 255, 0.1); color: #fff; }
.btn-secondary:hover { background: rgba(255, 255, 255, 0.2); }
.btn-danger { background: #dc2626; color: #fff; }
.btn-danger:hover { background: #b91c1c; }

.toggle-row { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 12px; }
.toggle-row input { margin: 0; }

.hint { font-size: 10px; color: rgba(255, 255, 255, 0.5); margin-bottom: 6px; }

.line-select { width: 100%; padding: 5px; border-radius: 4px; border: 1px solid rgba(255, 255, 255, 0.2); background: rgba(255, 255, 255, 0.05); color: #fff; font-size: 12px; }
.text-input { width: 100%; padding: 6px 8px; border-radius: 4px; border: 1px solid rgba(255, 255, 255, 0.2); background: rgba(255, 255, 255, 0.08); color: #fff; font-size: 13px; }
.text-input:focus { outline: none; border-color: #4f46e5; }

.mb-2 { margin-bottom: 0.5rem; }
.w-full { width: 100%; }
</style>
