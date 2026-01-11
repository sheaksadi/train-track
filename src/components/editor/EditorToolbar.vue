<template>
  <aside class="tools-panel">
    <div class="tools-section">
      <h3>Tools</h3>
      <div class="tool-buttons">
        <button 
          v-for="tool in tools" 
          :key="tool.id"
          @click="$emit('select-tool', tool.id)"
          :class="['tool-btn', { active: selectedTool === tool.id }]"
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
      <select :value="currentLine" @change="$emit('update:currentLine', ($event.target as HTMLSelectElement).value)" class="line-select">
        <option v-for="line in allLines" :key="line" :value="line">
          {{ line }}
        </option>
      </select>
      <div 
        class="line-preview" 
        :style="{ backgroundColor: getLineColor(currentLine) }"
      ></div>
    </div>

    <div class="tools-section">
      <label class="toggle-row">
        <input type="checkbox" :checked="autoConnect" @change="$emit('update:autoConnect', ($event.target as HTMLInputElement).checked)" />
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
        :value="mapOpacity" 
        @input="$emit('update:mapOpacity', parseInt(($event.target as HTMLInputElement).value))"
        min="0" 
        max="100" 
        class="opacity-slider"
      />
      <span class="opacity-value">{{ mapOpacity }}%</span>
    </div>

    <div class="tools-section stats">
      <h3>Statistics</h3>
      <div class="stat">Stations: {{ stationCount }}</div>
      <div class="stat">Tracks: {{ trackCount }}</div>
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
</template>

<script setup lang="ts">
import { allLines, getLineColor } from '@/data/stationNames';

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

defineProps<{
  selectedTool: string;
  currentLine: string;
  autoConnect: boolean;
  nextStationSuggestion: string | null;
  mapOpacity: number;
  stationCount: number;
  trackCount: number;
  zoom: number;
}>();

defineEmits<{
  'select-tool': [tool: string];
  'update:currentLine': [line: string];
  'update:autoConnect': [value: boolean];
  'update:mapOpacity': [value: number];
}>();
</script>

<style scoped>
.tools-panel {
  width: 170px;
  background: rgba(255, 255, 255, 0.03);
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
}

.tools-section h3 {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.5);
  margin: 0 0 8px 0;
}

.tool-buttons {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.tool-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.03);
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  font-size: 11px;
}

.tool-btn:hover {
  background: rgba(255, 255, 255, 0.08);
}

.tool-btn.active {
  background: rgba(79, 70, 229, 0.2);
  border-color: #4f46e5;
  color: #fff;
}

.tool-icon {
  font-size: 13px;
}

.tool-shortcut {
  margin-left: auto;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.4);
}

.line-select {
  width: 100%;
  padding: 6px 8px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
  font-size: 12px;
  margin-bottom: 6px;
}

.line-preview {
  height: 6px;
  border-radius: 3px;
}

.toggle-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  cursor: pointer;
}

.toggle-row input {
  cursor: pointer;
}

.next-station-hint {
  font-size: 12px;
  color: #4ade80;
  padding: 4px 8px;
  background: rgba(74, 222, 128, 0.1);
  border-radius: 4px;
}

.opacity-slider {
  width: 100%;
}

.opacity-value {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
}

.stats .stat {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
  padding: 2px 0;
}

.shortcuts {
  margin-top: auto;
}

.shortcuts .shortcut {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.4);
  padding: 2px 0;
}
</style>
