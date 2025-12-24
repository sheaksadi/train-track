<template>
  <div class="test-container w-screen h-screen bg-neutral-900 overflow-hidden flex items-center justify-center">
    <ClientOnly>
      <LeafletMap />
      <template #fallback>
        <div class="text-white">Loading map...</div>
      </template>
    </ClientOnly>
  </div>
</template>

<script setup>
// Main page wrapper
</script>

<style scoped>
.test-container {
    width: 100vw;
    height: 100vh;
}
.chart {
  height: 100%;
  width: 100%;
  min-height: 400px; /* Fallback */
}
</style>