// Text Node Actions
import { type Ref } from 'vue';
import type { TextNode } from './types';

export function useTextNodeActions(
    textNodes: Ref<TextNode[]>,
    selectedTextNodeId: Ref<string | null>,
    selectedStationId: Ref<string | null>,
    selectedTrackId: Ref<string | null>,
    generateId: () => string,
    pushHistory: () => void,
    saveToLocalStorage: () => void
) {
    function addTextNode(x: number, y: number, text: string = 'New Text', stationId?: string): TextNode {
        pushHistory();
        const textNode: TextNode = {
            id: generateId(),
            text,
            x,
            y,
            fontSize: 10,
            stationId,
        };
        textNodes.value.push(textNode);
        saveToLocalStorage();
        return textNode;
    }

    function removeTextNode(id: string): void {
        pushHistory();
        textNodes.value = textNodes.value.filter(t => t.id !== id);
        if (selectedTextNodeId.value === id) {
            selectedTextNodeId.value = null;
        }
        saveToLocalStorage();
    }

    function updateTextNode(id: string, updates: Partial<Omit<TextNode, 'id'>>): void {
        pushHistory();
        const textNode = textNodes.value.find(t => t.id === id);
        if (textNode) {
            Object.assign(textNode, updates);
            saveToLocalStorage();
        }
    }

    function selectTextNode(id: string | null): void {
        selectedTextNodeId.value = id;
        selectedStationId.value = null;
        selectedTrackId.value = null;
    }

    return {
        addTextNode,
        removeTextNode,
        updateTextNode,
        selectTextNode,
    };
}
