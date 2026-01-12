// Editor History (Undo/Redo)
import { ref, type Ref } from 'vue';
import type { EditorStation, EditorTrack, TextNode } from './types';

export interface HistorySnapshot {
    stations: EditorStation[];
    tracks: EditorTrack[];
    textNodes: TextNode[];
}

export function useHistory(
    stations: Ref<EditorStation[]>,
    tracks: Ref<EditorTrack[]>,
    textNodes: Ref<TextNode[]>,
    saveToLocalStorage: () => void
) {
    const history = ref<string[]>([]);
    const historyIndex = ref(-1);
    const isUndoing = ref(false);

    function pushHistory() {
        if (isUndoing.value) return;

        const snapshot = JSON.stringify({
            stations: stations.value,
            tracks: tracks.value,
            textNodes: textNodes.value,
        });

        // If we have history ahead (we undid), chop it off
        if (historyIndex.value < history.value.length - 1) {
            history.value = history.value.slice(0, historyIndex.value + 1);
        }

        history.value.push(snapshot);
        historyIndex.value++;

        // Limit history size (optional, e.g. 50 steps)
        if (history.value.length > 50) {
            history.value.shift();
            historyIndex.value--;
        }
    }

    function undo() {
        if (historyIndex.value > 0) {
            isUndoing.value = true;
            historyIndex.value--;
            const snapshot: HistorySnapshot = JSON.parse(history.value[historyIndex.value]);
            stations.value = snapshot.stations;
            tracks.value = snapshot.tracks;
            textNodes.value = snapshot.textNodes;
            saveToLocalStorage();
            isUndoing.value = false;
        }
    }

    function redo() {
        if (historyIndex.value < history.value.length - 1) {
            isUndoing.value = true;
            historyIndex.value++;
            const snapshot: HistorySnapshot = JSON.parse(history.value[historyIndex.value]);
            stations.value = snapshot.stations;
            tracks.value = snapshot.tracks;
            textNodes.value = snapshot.textNodes;
            saveToLocalStorage();
            isUndoing.value = false;
        }
    }

    return {
        pushHistory,
        undo,
        redo,
    };
}
