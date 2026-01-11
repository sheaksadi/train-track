import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputPath = path.resolve(__dirname, '../src/data/raw_map_text.txt');
const rawText = fs.readFileSync(inputPath, 'utf-8');

// Step 1: Handle hyphenated line breaks
// e.g. "Eisen-\nhütten-\nstadt" -> "Eisenhüttenstadt"
// We look for "-\n" and replace with nothing (joining the words)
// But we also need to handle simple newlines that separate distinct items.

// Strategy:
// 1. Replace "-\n" with "" (join hyphenated).
// 2. Split by newline.
// 3. Iterate and merge lines if the SECOND line starts with "(" (e.g. "Werder\n(Havel)") or ends unexpectedly?
//    Actually, "Werder\n(Havel)" -> the pdf dump put them on separate lines.
//    We can check: if a line starts with '(', append it to the previous line.

let temp = rawText
    .replace(/-\n/g, '')
    .replace(/-\r\n/g, '')
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

const merged = [];
for (const line of temp) {
    if (merged.length > 0 && line.startsWith('(')) {
        // Append to previous
        merged[merged.length - 1] = merged[merged.length - 1] + ' ' + line;
    } else if (merged.length > 0 && line.match(/^[a-z]/)) {
        // Heuristic: if starts with lowercase, might be continuation? (e.g. "Eisen-\nhütten-\nstadt" handled by replace, but "burg/\nMagde-\nburg"?)
        // Let's stick to the parens fix first.
        merged.push(line);
    } else {
        merged.push(line);
    }
}

const cleaned = merged
    .filter(line => !line.match(/^[:%0-9\s]+$/) && line.length > 1); // Remove noise

// Deduplicate
const distinct = [...new Set(cleaned)];
// Sort
distinct.sort();

console.log(`Found ${distinct.length} distinct items.`);
console.log('Sample items:', distinct.slice(0, 10));

// Determine which seem like Lines vs Stations
// Lines: RE1, S41, U2, etc. (Regex: ^[A-Z]+\s?[0-9]+$)
// Stations: Everything else?

const lines = [];
const stations = [];

const lineRegex = /^([A-Z]+)\s?([0-9]+)(\s?[A-Z0-9]+)*$/;

for (const item of distinct) {
    if (item.length < 2) continue; // Skip single chars
    if (lineRegex.test(item) || item.includes('.REQ')) {
        lines.push(item);
    } else {
        stations.push(item);
    }
}

console.log(`Identify ${lines.length} lines and ${stations.length} stations.`);
console.log('Sample stations:', stations.slice(0, 10));

// We will save the "stations" list for the next step (API fetching)
const outputPath = path.resolve(__dirname, 'cleaned_station_names.json');
fs.writeFileSync(outputPath, JSON.stringify(stations, null, 2));
console.log(`Saved cleaned list to ${outputPath}`);
