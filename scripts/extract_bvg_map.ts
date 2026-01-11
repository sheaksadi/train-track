/**
 * Extract BVG Map Data from SVG
 * 
 * Parses the BVG transit map SVG file and extracts:
 * - Line paths with colors
 * - Station circles/shapes
 * - Generates JSON in bvg-topological-map format
 */

import * as fs from 'fs';
import * as path from 'path';

// Color mappings (RGB percent -> line name)
// These are the official BVG colors converted to RGB percentage format
const LINE_COLORS: Record<string, { r: [number, number], g: [number, number], b: [number, number] }> = {
    // S-Bahn lines
    'S1': { r: [64, 67], g: [7, 10], b: [49, 52] },   // #A5136F ~magenta
    'S2': { r: [0, 3], g: [36, 40], b: [14, 18] },   // #005F27 green
    'S25': { r: [0, 3], g: [36, 40], b: [14, 18] },   // Same as S2
    'S26': { r: [0, 3], g: [36, 40], b: [14, 18] },   // Same as S2
    'S3': { r: [2, 6], g: [28, 32], b: [58, 62] },   // #0A4C99 blue
    'S41': { r: [62, 66], g: [21, 25], b: [10, 14] },   // #A23B1E terracotta
    'S42': { r: [76, 80], g: [41, 45], b: [20, 24] },   // #C66D38 orange
    'S45': { r: [74, 78], g: [51, 55], b: [20, 24] },   // #C38737 ochre
    'S46': { r: [74, 78], g: [51, 55], b: [20, 24] },   // Same as S45
    'S47': { r: [74, 78], g: [51, 55], b: [20, 24] },   // Same as S45
    'S5': { r: [98, 102], g: [33, 37], b: [0, 4] },     // #FF5900 orange
    'S7': { r: [42, 46], g: [29, 33], b: [60, 64] },   // #6F4E9C purple
    'S75': { r: [42, 46], g: [29, 33], b: [60, 64] },   // Same as S7
    'S8': { r: [32, 36], g: [64, 68], b: [12, 16] },   // #55A822 green
    'S85': { r: [32, 36], g: [64, 68], b: [12, 16] },   // Same as S8
    'S9': { r: [53, 57], g: [9, 13], b: [30, 34] },   // #8B1C52 wine

    // U-Bahn lines
    'U1': { r: [47, 51], g: [66, 70], b: [28, 32] },   // #7DAD4C lime
    'U2': { r: [84, 88], g: [24, 28], b: [10, 14] },   // #DA421E orange-red
    'U3': { r: [0, 4], g: [46, 50], b: [34, 38] },   // #007A5B teal
    'U4': { r: [92, 96], g: [82, 86], b: [12, 16] },   // #F0D722 yellow
    'U5': { r: [47, 51], g: [30, 34], b: [16, 20] },   // #7E5330 brown
    'U55': { r: [47, 51], g: [30, 34], b: [16, 20] },   // Same as U5
    'U6': { r: [53, 57], g: [41, 45], b: [66, 70] },   // #8C6DAB violet
    'U7': { r: [30, 34], g: [53, 57], b: [71, 75] },   // #528DBA light blue
    'U8': { r: [12, 16], g: [29, 33], b: [50, 54] },   // #224F86 dark blue
    'U9': { r: [93, 97], g: [45, 49], b: [9, 13] },    // #F3791D orange
};

// Specific RGB values found in the SVG file (rounded)
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


interface PathData {
    id: string;
    d: string;
    stroke?: string;
    fill?: string;
    transform?: string;
    line?: string;
}

interface MapData {
    width: number;
    height: number;
    stations: Record<string, {
        interchange: boolean;
        lines: string[];
        shape: string;
    }>;
    lines: Record<string, {
        color: string;
        shape: string;
    }>;
}

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

function rgbToHex(r: number, g: number, b: number): string {
    // Convert percentage to 0-255
    const rHex = Math.round(r * 2.55).toString(16).padStart(2, '0');
    const gHex = Math.round(g * 2.55).toString(16).padStart(2, '0');
    const bHex = Math.round(b * 2.55).toString(16).padStart(2, '0');
    return `#${rHex}${gHex}${bHex}`;
}

function identifyLineFromColor(r: number, g: number, b: number): string | null {
    // Check specific known colors first
    const key = `${Math.round(r)},${Math.round(g)},${Math.round(b)}`;
    if (RGB_TO_LINE[key]) {
        return RGB_TO_LINE[key];
    }

    // Check against range mappings
    for (const [line, ranges] of Object.entries(LINE_COLORS)) {
        if (r >= ranges.r[0] && r <= ranges.r[1] &&
            g >= ranges.g[0] && g <= ranges.g[1] &&
            b >= ranges.b[0] && b <= ranges.b[1]) {
            return line;
        }
    }

    return null;
}

function extractPathsFromSvg(svgContent: string): PathData[] {
    const paths: PathData[] = [];

    // Match all path elements
    const pathRegex = /<path[^>]*>/g;
    let match;
    let id = 0;

    while ((match = pathRegex.exec(svgContent)) !== null) {
        const pathElement = match[0];

        // Extract attributes
        const dMatch = pathElement.match(/\sd="([^"]+)"/);
        const strokeMatch = pathElement.match(/stroke="([^"]+)"/);
        const fillMatch = pathElement.match(/fill="([^"]+)"/);
        const transformMatch = pathElement.match(/transform="([^"]+)"/);

        if (dMatch) {
            const pathData: PathData = {
                id: `path-${id++}`,
                d: dMatch[1],
            };

            if (strokeMatch && strokeMatch[1] !== 'none') {
                pathData.stroke = strokeMatch[1];
                const rgb = parseRgbPercent(strokeMatch[1]);
                if (rgb) {
                    const line = identifyLineFromColor(rgb[0], rgb[1], rgb[2]);
                    if (line) {
                        pathData.line = line;
                    }
                }
            }

            if (fillMatch && fillMatch[1] !== 'none') {
                pathData.fill = fillMatch[1];
                if (!pathData.line) {
                    const rgb = parseRgbPercent(fillMatch[1]);
                    if (rgb) {
                        const line = identifyLineFromColor(rgb[0], rgb[1], rgb[2]);
                        if (line) {
                            pathData.line = line;
                        }
                    }
                }
            }

            if (transformMatch) {
                pathData.transform = transformMatch[1];
            }

            // Only include paths with transit line colors
            if (pathData.line) {
                paths.push(pathData);
            }
        }
    }

    return paths;
}

function extractSvgDimensions(svgContent: string): { width: number; height: number } {
    const widthMatch = svgContent.match(/width="([\d.]+)/);
    const heightMatch = svgContent.match(/height="([\d.]+)/);

    return {
        width: widthMatch ? parseFloat(widthMatch[1]) : 1190,
        height: heightMatch ? parseFloat(heightMatch[1]) : 842,
    };
}

function buildMapData(paths: PathData[], dimensions: { width: number; height: number }): MapData {
    const lines: Record<string, { color: string; shapes: string[] }> = {};
    const stations: Record<string, { interchange: boolean; lines: string[]; shape: string }> = {};

    for (const p of paths) {
        if (!p.line || p.line === 'S-Bahn') continue;

        if (!lines[p.line]) {
            lines[p.line] = {
                color: p.stroke || p.fill || '#888',
                shapes: [],
            };
        }

        lines[p.line].shapes.push(p.d);
    }

    // Convert shapes array to single shape string
    const linesOutput: Record<string, { color: string; shape: string }> = {};
    for (const [lineName, lineData] of Object.entries(lines)) {
        // Get hex color
        let hexColor = lineData.color;
        const rgb = parseRgbPercent(lineData.color);
        if (rgb) {
            hexColor = rgbToHex(rgb[0], rgb[1], rgb[2]);
        }

        linesOutput[lineName] = {
            color: hexColor,
            shape: lineData.shapes.join(' '),
        };
    }

    return {
        width: dimensions.width,
        height: dimensions.height,
        stations,
        lines: linesOutput,
    };
}

async function main() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  BVG Map SVG Extractor');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const svgPath = path.join(process.cwd(), 'public', 'bvg_subahn_2025.svg');
    const outputPath = path.join(process.cwd(), 'public', 'data', 'bvg_map.json');

    if (!fs.existsSync(svgPath)) {
        console.error(`❌ SVG file not found: ${svgPath}`);
        process.exit(1);
    }

    console.log(`Reading SVG: ${svgPath}`);
    const svgContent = fs.readFileSync(svgPath, 'utf-8');

    const dimensions = extractSvgDimensions(svgContent);
    console.log(`  Dimensions: ${dimensions.width} x ${dimensions.height}`);

    console.log('\nExtracting paths...');
    const paths = extractPathsFromSvg(svgContent);
    console.log(`  Found ${paths.length} transit line paths`);

    // Group by line for summary
    const lineGroups: Record<string, number> = {};
    for (const p of paths) {
        if (p.line) {
            lineGroups[p.line] = (lineGroups[p.line] || 0) + 1;
        }
    }

    console.log('\nLine path counts:');
    for (const [line, count] of Object.entries(lineGroups).sort()) {
        console.log(`  ${line}: ${count} paths`);
    }

    console.log('\nBuilding map data...');
    const mapData = buildMapData(paths, dimensions);

    console.log(`  Lines: ${Object.keys(mapData.lines).length}`);
    console.log(`  Stations: ${Object.keys(mapData.stations).length}`);

    fs.writeFileSync(outputPath, JSON.stringify(mapData, null, 2));
    console.log(`\n✓ Saved to ${outputPath}`);

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  Done!');
    console.log('═══════════════════════════════════════════════════════════════\n');
}

main().catch(console.error);
