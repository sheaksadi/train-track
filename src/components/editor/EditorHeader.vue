<template>
  <header class="editor-header">
    <div class="header-left">
      <router-link to="/" class="back-btn">← Back</router-link>
      <h1>Map Editor</h1>
    </div>
    <div class="header-right">
      <span class="save-status" v-if="saveStatus">{{ saveStatus }}</span>
      <button @click="$emit('export')" class="btn btn-secondary">
        📤 Export
      </button>
      <input type="file" ref="importInputRef" @change="handleImportChange" accept=".json" hidden />
      <button @click="triggerImport" class="btn btn-secondary">
        📥 Import
      </button>
      <button @click="$emit('clear')" class="btn btn-danger">
        🗑 Clear All
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref } from 'vue';

defineProps<{
  saveStatus: string;
}>();

const emit = defineEmits<{
  export: [];
  import: [file: File];
  clear: [];
}>();

const importInputRef = ref<HTMLInputElement | null>(null);

function triggerImport() {
  importInputRef.value?.click();
}

function handleImportChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) {
    emit('import', file);
  }
  if (importInputRef.value) importInputRef.value.value = '';
}
</script>

<style scoped>
.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-left h1 {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
}

.back-btn {
  color: rgba(255, 255, 255, 0.7);
  text-decoration: none;
  font-size: 13px;
}

.back-btn:hover {
  color: #fff;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.save-status {
  color: #4ade80;
  font-size: 12px;
  padding: 3px 6px;
  background: rgba(74, 222, 128, 0.1);
  border-radius: 3px;
}

.btn {
  padding: 5px 12px;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.2);
}

.btn-danger {
  background: #dc2626;
  color: #fff;
}

.btn-danger:hover {
  background: #b91c1c;
}
</style>
