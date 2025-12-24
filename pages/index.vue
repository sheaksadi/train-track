<template>
  <div class="map-container w-screen h-screen bg-neutral-900 overflow-hidden">
    <ClientOnly>
      <TransitMap />
      <template #fallback>
        <div class="loading-screen">
          <div class="loading-content">
            <div class="loading-spinner">🚂</div>
            <div class="loading-text">Loading transit map...</div>
          </div>
        </div>
      </template>
    </ClientOnly>
  </div>
</template>

<script setup>
// Three.js Transit Map - Berlin Public Transport Visualization
</script>

<style scoped>
.map-container {
  width: 100vw;
  height: 100vh;
  background: #1a1a2e;
}

.loading-screen {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1a1a2e;
}

.loading-content {
  text-align: center;
}

.loading-spinner {
  font-size: 48px;
  animation: bounce 1s ease-in-out infinite;
}

.loading-text {
  color: #888;
  margin-top: 16px;
  font-size: 14px;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}
</style>