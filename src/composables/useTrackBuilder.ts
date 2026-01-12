// Track Builder workflow
import { ref, computed, type Ref } from 'vue';
import { getStationsForLine } from '@/data/stationNames';

export function useTrackBuilder(currentLine: Ref<string>) {
    const trackBuilderLine = ref('');
    const trackBuilderIndex = ref(0);

    const currentBuilderStation = computed(() => {
        if (!trackBuilderLine.value) return null;
        const stations = getStationsForLine(trackBuilderLine.value);
        if (!stations || stations.length === 0) return null;
        if (trackBuilderIndex.value >= stations.length) return 'End of Line';
        return stations[trackBuilderIndex.value];
    });

    function startTrackBuilder(line: string) {
        trackBuilderLine.value = line;
        trackBuilderIndex.value = 0;
        currentLine.value = line;
    }

    function skipBuilderStation() {
        trackBuilderIndex.value++;
    }

    function resetBuilder() {
        trackBuilderLine.value = '';
        trackBuilderIndex.value = 0;
    }

    function advanceBuilder() {
        trackBuilderIndex.value++;
    }

    // Smart suggestion for next station
    function getNextStationSuggestion(lastPlacedStationName: string | null) {
        if (!lastPlacedStationName) return null;

        const line = currentLine.value;
        const stationsOnLine = getStationsForLine(line);

        if (!stationsOnLine || stationsOnLine.length === 0) return null;

        // Levenshtein distance for fuzzy matching
        const levenshtein = (a: string, b: string): number => {
            const matrix: number[][] = [];
            for (let i = 0; i <= b.length; i++) matrix[i] = [i];
            for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
            for (let i = 1; i <= b.length; i++) {
                for (let j = 1; j <= a.length; j++) {
                    if (b.charAt(i - 1) === a.charAt(j - 1)) {
                        matrix[i][j] = matrix[i - 1][j - 1];
                    } else {
                        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
                    }
                }
            }
            return matrix[b.length][a.length];
        };

        const clean = (n: string) => n.replace(/\s*\(Berlin\)\s*/i, '').replace(/^(S\+U|S|U)\s+/i, '').trim();
        const targetName = clean(lastPlacedStationName);

        let bestMatchIdx = -1;
        let minDistance = Infinity;

        stationsOnLine.forEach((stationName, index) => {
            const dist = levenshtein(clean(stationName).toLowerCase(), targetName.toLowerCase());
            if (dist < minDistance) {
                minDistance = dist;
                bestMatchIdx = index;
            }
        });

        if (bestMatchIdx !== -1 && minDistance <= 5) {
            return {
                current: stationsOnLine[bestMatchIdx],
                prev: bestMatchIdx > 0 ? stationsOnLine[bestMatchIdx - 1] : null,
                next: bestMatchIdx < stationsOnLine.length - 1 ? stationsOnLine[bestMatchIdx + 1] : null
            };
        }

        return { current: 'Unknown', next: stationsOnLine[0], prev: null };
    }

    return {
        trackBuilderLine,
        trackBuilderIndex,
        currentBuilderStation,
        startTrackBuilder,
        skipBuilderStation,
        resetBuilder,
        advanceBuilder,
        getNextStationSuggestion,
    };
}
