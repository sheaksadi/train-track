export const sbahnColors: Record<string, string> = {
    'S1': '#DA4D8A', // Pink
    'S2': '#00703C', // Dark Green
    'S3': '#003F87', // Blue
    'S5': '#FF5900', // Orange
    'S7': '#793F96', // Purple
    'S9': '#9D262F', // Dark Red
    'S25': '#00703C',
    'S26': '#00703C',
    'S41': '#A64F16', // Ringbahn Brown
    'S42': '#A64F16', // Ringbahn Brown
    'S45': '#CC8844',
    'S46': '#CC8844',
    'S47': '#CC8844',
    'S8': '#66B531',  // Light Green
    'S85': '#66B531',
};

// Route data placeholder (would require station lists)
export function getSbahnRoute(line: string): [number, number][] {
    return [];
}
