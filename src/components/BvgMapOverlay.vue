<template>
  <div 
    v-if="mapStore.svgMapEnabled" 
    class="bvg-map-overlay"
    :style="overlayStyle"
  >
    <div 
      class="svg-container" 
      :style="transformStyle"
      v-html="svgContent"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useMapStore } from '~/stores/mapStore';

const mapStore = useMapStore();
const svgContent = ref('');

// Load SVG on mount
onMounted(async () => {
  try {
    const response = await fetch('/bvg_subahn_2025.svg');
    if (response.ok) {
      svgContent.value = await response.text();
    }
  } catch (e) {
    console.error('Failed to load BVG map SVG:', e);
  }
});

// Container style (full screen, behind canvas)
const overlayStyle = computed(() => ({
  opacity: mapStore.svgMapOpacity,
}));

// SVG transform to sync with Three.js camera
// The SVG is 1190.55pt x 841.89pt (A4 landscape)
// We need to scale and translate to match the Three.js coordinate system
const transformStyle = computed(() => {
  const zoom = mapStore.currentZoom;
  const camX = mapStore.cameraX;
  const camY = mapStore.cameraY;
  
  // SVG dimensions in points
  const svgWidth = 1190.55;
  const svgHeight = 841.89;
  
  // Base scale factor - needs calibration
  // The SVG covers Berlin area, we need to map it to scene coords
  // Berlin center is at scene (0, 0) which is lat 52.52, lng 13.40
  // Scale factor determined empirically
  const baseScale = 0.45; 
  
  // Calculate transform
  const scale = baseScale * zoom;
  
  // Offset to center the map (SVG origin is top-left)
  // These offsets position Berlin center roughly at scene origin
  const offsetX = -svgWidth / 2 + camX / baseScale;
  const offsetY = -svgHeight / 2 - camY / baseScale;
  
  return {
    transform: `scale(${scale}) translate(${offsetX}px, ${offsetY}px)`,
    transformOrigin: 'center center',
  };
});
</script>

<style scoped>
.bvg-map-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.svg-container {
  width: 1190.55pt;
  height: 841.89pt;
  transition: transform 0.05s ease-out;
}

.svg-container :deep(svg) {
  width: 100%;
  height: 100%;
}

/* Dim the map slightly for better contrast with trains/stations */
.svg-container :deep(path),
.svg-container :deep(line),
.svg-container :deep(polyline) {
  opacity: 0.9;
}
</style>
