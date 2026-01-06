<template>
  <div class="bvg-map">
    <!-- Controls -->
    <div class="controls">
      <div class="zoom-controls">
        <button @click="zoomIn">+</button>
        <button @click="zoomOut">−</button>
        <button @click="resetView">⌂</button>
      </div>
    </div>
    
    <!-- Map Container -->
    <div 
      ref="mapContainer" 
      class="map-container"
      @wheel.prevent="onWheel"
      @mousedown="onMouseDown"
      @mousemove="onMouseMove"
      @mouseup="onMouseUp"
      @mouseleave="onMouseUp"
    >
      <!-- SVG Map -->
      <div 
        class="svg-wrapper"
        :style="{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '50% 50%'
        }"
      >
        <object 
          ref="svgObject"
          type="image/svg+xml" 
          :data="svgUrl"
          class="bvg-svg"
          @load="onSvgLoad"
        ></object>
      </div>
    </div>
    
    <!-- Info Panel -->
    <div v-if="hoveredStation" class="info-panel" :style="infoStyle">
      <div class="info-title">{{ hoveredStation }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';

const svgUrl = '/bvg_map.svg';
const mapContainer = ref<HTMLElement | null>(null);
const svgObject = ref<HTMLObjectElement | null>(null);

// View state
const zoom = ref(1);
const pan = reactive({ x: 0, y: 0 });
const isPanning = ref(false);
const panStart = reactive({ x: 0, y: 0 });
const panOffset = reactive({ x: 0, y: 0 });

// Hover state
const hoveredStation = ref('');
const mousePos = reactive({ x: 0, y: 0 });

const infoStyle = computed(() => ({
  left: `${mousePos.x + 15}px`,
  top: `${mousePos.y + 15}px`,
}));

function zoomIn() {
  zoom.value = Math.min(5, zoom.value * 1.2);
}

function zoomOut() {
  zoom.value = Math.max(0.3, zoom.value / 1.2);
}

function resetView() {
  zoom.value = 1;
  pan.x = 0;
  pan.y = 0;
}

function onWheel(e: WheelEvent) {
  const delta = e.deltaY < 0 ? 1.1 : 0.9;
  zoom.value = Math.max(0.3, Math.min(5, zoom.value * delta));
}

function onMouseDown(e: MouseEvent) {
  isPanning.value = true;
  panStart.x = e.clientX;
  panStart.y = e.clientY;
  panOffset.x = pan.x;
  panOffset.y = pan.y;
}

function onMouseMove(e: MouseEvent) {
  mousePos.x = e.clientX;
  mousePos.y = e.clientY;
  
  if (isPanning.value) {
    pan.x = panOffset.x + (e.clientX - panStart.x);
    pan.y = panOffset.y + (e.clientY - panStart.y);
  }
}

function onMouseUp() {
  isPanning.value = false;
}

function onSvgLoad() {
  console.log('BVG SVG loaded');
  
  // Try to access SVG DOM for interactivity
  try {
    const svgDoc = svgObject.value?.contentDocument;
    if (svgDoc) {
      // Add hover effects to paths
      const paths = svgDoc.querySelectorAll('path');
      paths.forEach(path => {
        path.style.cursor = 'pointer';
        path.addEventListener('mouseenter', () => {
          const fill = path.getAttribute('fill');
          const stroke = path.getAttribute('stroke');
          // Could extract station info here
        });
      });
    }
  } catch (e) {
    console.log('Could not access SVG DOM (cross-origin)');
  }
}

onMounted(() => {
  // Initial setup
});
</script>

<style scoped>
.bvg-map {
  width: 100vw;
  height: 100vh;
  background: #fff;
  overflow: hidden;
  position: relative;
}

.map-container {
  width: 100%;
  height: 100%;
  cursor: grab;
  display: flex;
  align-items: center;
  justify-content: center;
}

.map-container:active {
  cursor: grabbing;
}

.svg-wrapper {
  transition: transform 0.1s ease-out;
  will-change: transform;
}

.bvg-svg {
  width: 100vw;
  height: auto;
  max-height: 100vh;
  pointer-events: all;
}

.controls {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 100;
}

.zoom-controls {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.zoom-controls button {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  font-size: 20px;
  cursor: pointer;
  transition: background 0.2s;
}

.zoom-controls button:hover {
  background: rgba(0, 0, 0, 0.9);
}

.info-panel {
  position: fixed;
  background: rgba(0, 0, 0, 0.9);
  color: #fff;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 13px;
  pointer-events: none;
  z-index: 200;
}

.info-title {
  font-weight: 600;
}
</style>
