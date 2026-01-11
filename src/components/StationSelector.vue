<template>
  <div class="station-selector relative w-full" ref="container">
    <input
      type="text"
      v-model="searchQuery"
      @focus="handleFocus"
      @input="handleInput"
      placeholder="Search station..."
      class="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
    />
    
    <Teleport to="body">
      <div 
        v-if="showDropdown" 
        class="fixed bg-gray-800 border border-gray-600 rounded shadow-xl z-[9999] max-h-60 overflow-y-auto station-dropdown-menu"
        :style="dropdownStyle"
      >
        <div v-if="loading" class="p-3 text-center text-gray-400">
          Searching API...
        </div>
        
        <div v-else-if="displayedStations.length === 0" class="p-3 text-center text-gray-400">
          No stations found
        </div>
        
        <ul v-else class="divide-y divide-gray-700">
          <li
            v-for="station in displayedStations"
            :key="station.id"
            @click="selectStation(station)"
            class="px-3 py-2 hover:bg-gray-700 cursor-pointer text-sm flex flex-col"
          >
            <span class="font-medium text-white">{{ cleanStationName(station.name) }}</span>
            <span class="text-xs text-gray-400 flex gap-2">
              <span v-if="station.products?.suburban" class="text-green-400">S</span>
              <span v-if="station.products?.subway" class="text-blue-400">U</span>
              <span v-if="station.products?.regional" class="text-red-400">RE/RB</span>
              <span v-if="station.products?.tram" class="text-red-200">Tram</span>
              <span v-if="station.products?.bus" class="text-purple-300">Bus</span>
            </span>
          </li>
        </ul>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { allBvgStations } from '@/data/stationNames';

const props = defineProps<{
  modelValue: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'select', station: any): void;
}>();

const searchQuery = ref(props.modelValue);
const showDropdown = ref(false);
const loading = ref(false);
const apiResults = ref<any[]>([]);
const container = ref<HTMLElement | null>(null);
const dropdownStyle = ref({});

// Debounce timer
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

// Combined results: API results have priority, otherwise filter local stations
const displayedStations = computed(() => {
  if (apiResults.value.length > 0) {
    return apiResults.value;
  }
  
  // If no API results yet, filter local data
  const query = searchQuery.value.toLowerCase().trim();
  if (!query) {
    return allBvgStations.slice(0, 50); // Show first 50 local stations initially
  }
  
  return allBvgStations
    .filter(s => s.name.toLowerCase().includes(query))
    .slice(0, 50);
});

function updateDropdownPosition() {
  if (container.value) {
    const rect = container.value.getBoundingClientRect();
    dropdownStyle.value = {
      top: `${rect.bottom + 4}px`,
      left: `${rect.left}px`,
      width: `${rect.width}px`,
    };
  }
}

function handleFocus() {
  showDropdown.value = true;
  updateDropdownPosition();
  // If empty, reset results to local defaults
  if (!searchQuery.value) {
    apiResults.value = [];
  }
}

function handleInput() {
  showDropdown.value = true;
  loading.value = true;
  updateDropdownPosition();
  
  if (debounceTimer) clearTimeout(debounceTimer);
  
  debounceTimer = setTimeout(() => {
    fetchStations(searchQuery.value);
  }, 300);
  
  emit('update:modelValue', searchQuery.value);
}

async function fetchStations(query: string) {
  if (!query || query.length < 2) {
    loading.value = false;
    apiResults.value = [];
    return;
  }

  try {
    const response = await fetch(`https://v6.bvg.transport.rest/locations?query=${encodeURIComponent(query)}&results=20&stations=true&poi=false&addresses=false`);
    if (!response.ok) throw new Error('API failed');
    const data = await response.json();
    
    // Transform API data to match our shape roughly
    apiResults.value = data.map((item: any) => ({
      id: item.id,
      name: item.name,
      // Create a simplified products object if missing
      products: item.products || {},
      location: item.location,
    }));
  } catch (err) {
    console.error('Station search error:', err);
    apiResults.value = [];
  } finally {
    loading.value = false;
  }
}


function cleanStationName(name: string): string {
  if (!name) return '';
  return name
    .replace(/\s*\(Berlin\)\s*/i, '') // Remove (Berlin)
    .replace(/^(S\+U|S|U)\s+/i, '')   // Remove S+U, S, U prefixes
    .trim();
}

function selectStation(station: any) {
  const cleanedName = cleanStationName(station.name);
  searchQuery.value = cleanedName;
  showDropdown.value = false;
  emit('update:modelValue', cleanedName);
  
  // Normalize station data for the parent
  // If it's from API, it has .location.latitude
  // If it's local (allBvgStations), it has .lat
  const selected = {
    name: cleanedName, // Use cleaned name
    lat: station.location?.latitude || station.lat,
    lng: station.location?.longitude || station.lng,
    lines: station.lines || [], // API doesn't give specific lines list easily without extra calls, but we can infer or leave empty
  };
  
  emit('select', selected);
}

// Close dropdown when clicking outside
function handleClickOutside(e: MouseEvent) {
  // Check if click is inside container OR inside the dropdown (which is in portal)
  const target = e.target as HTMLElement;
  const dropdownEl = document.querySelector('.station-dropdown-menu');
  
  if (container.value && !container.value.contains(target) && (!dropdownEl || !dropdownEl.contains(target))) {
    showDropdown.value = false;
  }
}

// Update position on scroll/resize
function handleScroll() {
  if (showDropdown.value) {
    updateDropdownPosition();
  }
}

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside);
  window.addEventListener('scroll', handleScroll, true); // Capture phase to catch nested scrolls
  window.addEventListener('resize', handleScroll);
});

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside);
  window.removeEventListener('scroll', handleScroll, true);
  window.removeEventListener('resize', handleScroll);
});

watch(() => props.modelValue, (newVal) => {
  if (searchQuery.value !== newVal) {
    searchQuery.value = newVal;
  }
});
</script>

<style scoped>
/* Scrollbar styling for dropdown */
.overflow-y-auto::-webkit-scrollbar {
  width: 8px;
}
.overflow-y-auto::-webkit-scrollbar-track {
  background: #2d3748;
}
.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #4a5568;
  border-radius: 4px;
}
</style>
