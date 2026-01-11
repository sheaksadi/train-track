
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import * as xml2js from 'xml2js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Load VBB stations and Levenshtein
// vbb-stations exports an array of station objects or a function
const stations = require('vbb-stations')('all');
const levenshtein = require('fast-levenshtein');

interface Station {
    id: string;
    name: string;
    location: {
        latitude: number;
        longitude: number;
    };
}

// Map color to line name (reuse from previous script)
const RGB_TO_LINE: Record<string, string> = {
    // S-Bahn red (general S-Bahn markers)
    '89,2,7': 'S-Bahn',
    // S1 magenta
    '65,9,51': 'S1',
    '87,42,65': 'S1',
    // S2, S25, S26 - Green variants
    '0,48,24': 'S2',
    '0,57,33': 'S2',
    '33,48,17': 'S2',
    '38,68,18': 'S2',
    // S3 - Blue
    '0,35,60': 'S3',
    '0,40,68': 'S3',
    // S41, S42 - Ring lines
    '79,38,10': 'S41',
    '72,35,22': 'S41',
    '69,35,22': 'S41',
    '91,31,6': 'S42',
    '93,45,1': 'S42',
    // S5 - Orange
    '95,53,0': 'S5',
    // S7 - Purple/Violet
    '52,43,67': 'S7',
    '74,70,84': 'S7',
    // S46 - Ochre
    '80,61,33': 'S46',
    // S9 - Wine
    '61,17,28': 'S9',
    // U3 - Teal
    '0,63,57': 'U3',
    '0,49,54': 'U3',
    // U4 - Yellow
    '100,93,0': 'U4',
    '100,90,0': 'U4',
    '100,84,0': 'U4',
    // U5 - Brown
    '51,32,22': 'U5',
    // U6 - Violet (same as S7 visually)
    // U7 - Light blue
    '0,61,85': 'U7',
    // U8 - Dark blue (same as S3 visually)
};

function parseRgbPercent(rgbStr: string): [number, number, number] | null {
    const match = rgbStr.match(/rgb\(\s*([\d.]+)%?,\s*([\d.]+)%?,\s*([\d.]+)%?\s*\)/);
    if (match) {
        return [
            parseFloat(match[1]),
            parseFloat(match[2]),
            parseFloat(match[3])
        ];
    }
    return null;
}

function rgbToKey(r: number, g: number, b: number): string {
    return `${Math.round(r)},${Math.round(g)},${Math.round(b)}`;
}

class MapExtractor {
    private pdfPath: string;
    private svgPath: string;
    private outputPath: string;

    constructor(pdfPath: string, svgPath: string, outputPath: string) {
        this.pdfPath = pdfPath;
        this.svgPath = svgPath;
        this.outputPath = outputPath;
    }

    async extract() {
        console.log('Starting extraction...');

        // 1. Get Text Blocks from PDF
        console.log('Extracting text from PDF...');
        const textBlocks = await this.extractTextBlocks();
        console.log(`Found ${textBlocks.length} text blocks`);

        // 2. Parse SVG for Geometry (Lines and Station Markers)
        console.log('Parsing SVG geometry...');
        const { lines, stationMarkers } = this.parseSvg();
        console.log(`Found ${Object.keys(lines).length} lines and ${stationMarkers.length} potential stations`);

        // 3. Match Text to Station Markers
        console.log('Matching labels to stations...');
        const matchedStations = this.matchLabelsToStations(textBlocks, stationMarkers);
        console.log(`Matched ${matchedStations.length} stations`);

        // 4. Tag with VBB IDs
        console.log('Tagging with VBB IDs...');
        const taggedStations = this.tagStationsWithVbb(matchedStations);

        // 5. Build Final Output
        const output = {
            width: 1190,
            height: 842,
            stations: taggedStations,
            lines: lines
        };

        fs.writeFileSync(this.outputPath, JSON.stringify(output, null, 2));
        console.log(`Saved to ${this.outputPath}`);
    }

    private async extractTextBlocks() {
        // Run pdftotext -bbox
        const xmlOutput = execSync(`pdftotext -bbox "${this.pdfPath}" -`, { encoding: 'utf-8' });

        // Parse XML
        const parser = new xml2js.Parser();
        const result = await parser.parseStringPromise(xmlOutput);

        const blocks: { text: string, x: number, y: number, width: number, height: number }[] = [];

        // Navigate XML structure (html -> body -> doc -> page -> word)
        const pages = result.html.body[0].doc[0].page;
        if (!pages) return [];

        // Consider only first page for now (the map)
        const page = pages[0];
        const words = page.word || [];

        // Simple clustering to form full station names from words
        // This is a naive approach: group words that are close to each other
        // For a cleaner map, we might need more sophisticated clustering

        // Using a simplified approach: just return words for now, or short phrases
        // Ideally we group words on the same line or close proximity

        let currentBlock = null;

        for (const word of words) {
            const xMin = parseFloat(word.$.xMin);
            const yMin = parseFloat(word.$.yMin);
            const xMax = parseFloat(word.$.xMax);
            const yMax = parseFloat(word.$.yMax);
            const text = word._;

            // If close to previous word, append
            if (currentBlock &&
                Math.abs(yMin - currentBlock.y) < 5 && // Same line
                xMin - (currentBlock.x + currentBlock.width) < 10 // Close horizontally
            ) {
                currentBlock.text += ' ' + text;
                currentBlock.width = xMax - currentBlock.x;
            } else {
                if (currentBlock) blocks.push(currentBlock);
                currentBlock = {
                    text: text,
                    x: xMin,
                    y: yMin,
                    width: xMax - xMin,
                    height: yMax - yMin
                };
            }
        }
        if (currentBlock) blocks.push(currentBlock);

        return blocks.map(b => ({
            ...b,
            x: b.x + b.width / 2, // Center X
            y: b.y + b.height / 2 // Center Y
        }));
    }

    private parseSvg() {
        const svgContent = fs.readFileSync(this.svgPath, 'utf-8');
        const lines: Record<string, { color: string, shape: string }> = {};
        const stationMarkers: { x: number, y: number, shape: string }[] = [];

        // This regex approach is simple but fragile. Ideally use an XML parser.
        // Re-using the regex approach from the previous script which worked well for paths

        const pathRegex = /<path[^>]*>/g;
        let match;

        // Extract Lines
        // ... (Use similar logic to previous script to populate `lines`)
        // Ref: previous extract_bvg_map.ts logic
        // I'll copy-paste the extract logic here but adapted

        const paths = this.extractPathsFromSvg(svgContent);

        // Group paths by line
        const lineGroups: Record<string, string[]> = {};
        const lineColors: Record<string, string> = {}; // Store one color per line

        for (const p of paths) {
            if (p.line && p.line !== 'S-Bahn-General') {
                if (!lineGroups[p.line]) lineGroups[p.line] = [];
                lineGroups[p.line].push(p.d);
                if (!lineColors[p.line]) lineColors[p.line] = p.colorOriginal; // Use the hex or rgb string
            }

            // Identify Station Markers
            // Station markers often are small paths or circles without a 'line' color (e.g. black or white stroke)
            // Or specific shapes.
            // In BVG map, interchange stations are often capsules or connected shapes.
            // Simple stations are often ticks on the line.
            // This is the HARD part: distinguishing geometry.

            // For now, let's assume ANY path that is NOT a line track is a potential station marker? 
            // No, that's too much noise (text glyphs etc).
            // But we know Glyph paths are in <defs> or similar?
            // The snippet showed <g id="glyph...">. We should IGNORE those.
            // We only care about paths in the main body.

            // Heuristic: Station markers are usually small.
            // We can interpret the bounding box of the path `d`.

            // Better yet: Just use the Text Labels as the "Station" location for now.
            // If we can't reliably find the geometric marker, the Label position is a good proxy.
            // `bvg-topological-map` uses "stations" with "shape".

            // Let's rely on finding "white filled" shapes or specific styles for interchanges?
            // <path ... class="station interchange" ...> - but we don't have classes.

            // Let's stick to Lines first.
        }

        for (const [lineName, shapes] of Object.entries(lineGroups)) {
            lines[lineName] = {
                color: lineColors[lineName],
                shape: shapes.join(' ')
            };
        }

        return { lines, stationMarkers };
    }

    private extractPathsFromSvg(svgContent: string) {
        const paths: any[] = [];
        const pathRegex = /<path[^>]*>/g;
        let match;
        let id = 0;

        while ((match = pathRegex.exec(svgContent)) !== null) {
            const pathElement = match[0];
            // Skip glyphs inside <defs> - naive check: does it look like a glyph definition?
            // Actually, extractPathsFromSvg runs on the whole file. Glyphs are usually in <g id="glyph...">
            // We should really ignore <g id="glyph"> blocks.
            // But regex is hard.

            // Let's proceed with previous logic which filtered by COLOR.
            // Paths without color (or black) might be station markers.

            const dMatch = pathElement.match(/\sd="([^"]+)"/);
            const strokeMatch = pathElement.match(/stroke="([^"]+)"/);
            const fillMatch = pathElement.match(/fill="([^"]+)"/);

            if (!dMatch) continue;

            const pathData: any = { d: dMatch[1] };
            let foundColor = false;

            // Check Stroke
            if (strokeMatch && strokeMatch[1] !== 'none') {
                const rgb = parseRgbPercent(strokeMatch[1]);
                if (rgb) {
                    const key = rgbToKey(rgb[0], rgb[1], rgb[2]);
                    if (RGB_TO_LINE[key]) {
                        pathData.line = RGB_TO_LINE[key];
                        pathData.colorOriginal = strokeMatch[1]; // simplified
                        foundColor = true;
                    }
                }
            }

            // Check Fill
            if (!foundColor && fillMatch && fillMatch[1] !== 'none') {
                const rgb = parseRgbPercent(fillMatch[1]);
                if (rgb) {
                    const key = rgbToKey(rgb[0], rgb[1], rgb[2]);
                    if (RGB_TO_LINE[key]) {
                        pathData.line = RGB_TO_LINE[key];
                        pathData.colorOriginal = fillMatch[1];
                        foundColor = true;
                    }
                }
            }

            if (pathData.line) {
                paths.push(pathData);
            }
        }
        return paths;
    }

    private matchLabelsToStations(textBlocks: any[], stationMarkers: any[]) {
        // For now, since we struggle to identify station PATTERNS, 
        // we will treat every Text Block that looks like a station name as a station.

        // Filter out obvious non-stations (single numbers, "Berlin", "Zone", etc)
        const candidates = textBlocks.filter(b => {
            return b.text.length > 2 && !/^\d+$/.test(b.text);
        });

        return candidates.map(c => ({
            name: c.text,
            x: c.x,
            y: c.y,
            extractedName: c.text
        }));
    }

    private tagStationsWithVbb(matchedStations: any[]) {
        const tagged = {};

        for (const s of matchedStations) {
            // Fuzzy match s.name against VBB stations
            let bestMatch = null;
            let minDist = Infinity;

            // Optimization: Filter VBB stations by basic string inclusion first if possible,
            // or just iterate all. VBB has ~13k stations. Iterating all 13k for each of ~200 labels is fine (200 * 13000 = 2.6M ops, fast enough).

            for (const vbbStation of stations) {
                // Simple heuristic: Station usually starts with name.
                // PDF: "Zoologischer Garten"
                // VBB: "S+U Zoologischer Garten Bhf"

                // Let's try to normalize matches
                const vbbName = vbbStation.name;
                // Clean up names
                const cleanVbb = vbbName.replace(/S\+U|S|U|Bhf|Berlin,/g, '').trim().toLowerCase();
                const cleanPdf = s.name.replace(/Berlin,/g, '').trim().toLowerCase();

                const dist = levenshtein.get(cleanPdf, cleanVbb);

                if (dist < minDist) {
                    minDist = dist;
                    bestMatch = vbbStation;
                }
            }

            // Threshold for match
            if (minDist <= 3 || (bestMatch && bestMatch.name.includes(s.name))) {
                // Valid match
                tagged[bestMatch.id] = {
                    name: bestMatch.name,
                    label: s.name,
                    x: s.x,
                    y: s.y,
                    // lines: [...] // We can infer lines from spatial proximity to line paths later?
                    lines: ['?']
                };
            }
        }

        return tagged;
    }
}

// Main execution
const PDF_PATH = path.join(process.cwd(), 'public', 'bvg_subahn_2025.pdf');
const SVG_PATH = path.join(process.cwd(), 'public', 'bvg_subahn_2025.svg');
const OUT_PATH = path.join(process.cwd(), 'public', 'data', 'bvg_map.json');

const extractor = new MapExtractor(PDF_PATH, SVG_PATH, OUT_PATH);
extractor.extract().catch(console.error);
