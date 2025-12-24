// Regional train data (RE1 Magdeburg - Berlin - Frankfurt/Oder)
export const regionalColors: Record<string, string> = {
    'RE1': '#E30613',  // Red (DB Regio color)
};

// RE1 stations - Full route: Magdeburg to Frankfurt (Oder) via Berlin
export interface RegionalStation {
    id: string;
    name: string;
    lat: number;
    lng: number;
    lines: string[];
}

export const re1Stations: RegionalStation[] = [
    // Western section: Magdeburg to Berlin
    { id: 're1-1', name: 'Magdeburg Hauptbahnhof', lat: 52.1306, lng: 11.6269, lines: ['RE1'] },
    { id: 're1-2', name: 'Burg (b Magdeburg)', lat: 52.2729, lng: 11.8547, lines: ['RE1'] },
    { id: 're1-3', name: 'Genthin', lat: 52.4043, lng: 12.1617, lines: ['RE1'] },
    { id: 're1-4', name: 'Brandenburg Hauptbahnhof', lat: 52.4106, lng: 12.5633, lines: ['RE1'] },
    { id: 're1-5', name: 'Werder (Havel)', lat: 52.3781, lng: 12.9342, lines: ['RE1'] },
    { id: 're1-6', name: 'Potsdam Hauptbahnhof', lat: 52.3916, lng: 13.0669, lines: ['RE1'] },
    { id: 're1-7', name: 'Berlin-Wannsee', lat: 52.4213, lng: 13.1792, lines: ['RE1'] },
    { id: 're1-8', name: 'Berlin-Charlottenburg', lat: 52.5048, lng: 13.3037, lines: ['RE1'] },
    { id: 're1-9', name: 'Berlin Zoologischer Garten', lat: 52.5066, lng: 13.3325, lines: ['RE1'] },
    { id: 're1-10', name: 'Berlin Hauptbahnhof', lat: 52.5251, lng: 13.3694, lines: ['RE1'] },
    { id: 're1-11', name: 'Berlin Friedrichstraße', lat: 52.5199, lng: 13.3870, lines: ['RE1'] },
    { id: 're1-12', name: 'Berlin Alexanderplatz', lat: 52.5219, lng: 13.4133, lines: ['RE1'] },
    { id: 're1-13', name: 'Berlin Ostbahnhof', lat: 52.5105, lng: 13.4346, lines: ['RE1'] },
    { id: 're1-14', name: 'Berlin Ostkreuz', lat: 52.5031, lng: 13.4694, lines: ['RE1'] },
    // Eastern section: Berlin to Frankfurt (Oder)
    { id: 're1-15', name: 'Berlin-Köpenick', lat: 52.4594, lng: 13.5764, lines: ['RE1'] },
    { id: 're1-16', name: 'Erkner', lat: 52.4251, lng: 13.7517, lines: ['RE1'] },
    { id: 're1-17', name: 'Fürstenwalde (Spree)', lat: 52.3608, lng: 14.0650, lines: ['RE1'] },
    { id: 're1-18', name: 'Berkenbrück', lat: 52.3508, lng: 14.1350, lines: ['RE1'] },
    { id: 're1-19', name: 'Briesen (Mark)', lat: 52.3450, lng: 14.2033, lines: ['RE1'] },
    { id: 're1-20', name: 'Jacobsdorf (Mark)', lat: 52.3425, lng: 14.3250, lines: ['RE1'] },
    { id: 're1-21', name: 'Pillgram', lat: 52.3367, lng: 14.3817, lines: ['RE1'] },
    { id: 're1-22', name: 'Frankfurt (Oder)', lat: 52.3350, lng: 14.5500, lines: ['RE1'] },
];

// Get RE1 route coordinates
export function getRE1Route(): [number, number][] {
    return re1Stations.map(s => [s.lat, s.lng]);
}
