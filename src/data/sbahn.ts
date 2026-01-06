// Berlin S-Bahn Lines and Stations with Schematic Positions
// Source: BVG December 2025
// Contains both real-world GPS coords AND schematic diagram positions

export interface SBahnStation {
    name: string;
    lat: number;
    lng: number;
    schematicX: number;
    schematicY: number;
    lines: string[];
}

// Official S-Bahn Colors
export const sbahnColors: Record<string, string> = {
    'S1': '#DD6CA5',   // Pink
    'S2': '#00632E',   // Green
    'S25': '#00632E',  // Green (branch)
    'S26': '#00632E',  // Green (branch)
    'S3': '#0A4C9D',   // Blue
    'S41': '#A4361D',  // Ring (brick red)
    'S42': '#C4631C',  // Ring (orange-ish)
    'S45': '#C38737',  // Brown
    'S46': '#C38737',  // Brown
    'S47': '#C38737',  // Brown
    'S5': '#F57921',   // Orange
    'S7': '#816DA6',   // Purple
    'S75': '#816DA6',  // Purple (branch)
    'S8': '#55A822',   // Light Green
    'S85': '#55A822',  // Light Green (branch)
    'S9': '#8A1212',   // Dark Red
};

// S-Bahn station data with schematic positions
// Grid matches BVG map proportions (approx 1000x700 logical units)
export const sbahnStations: Record<string, SBahnStation> = {
    // RINGBAHN STATIONS (S41/S42) - Circular layout
    'Westkreuz': {
        name: 'Westkreuz',
        lat: 52.5013, lng: 13.2833,
        schematicX: 250, schematicY: 400,
        lines: ['S41', 'S42', 'S3', 'S5', 'S7', 'S9'],
    },
    'Messe Nord/ICC': {
        name: 'Messe Nord/ICC',
        lat: 52.5000, lng: 13.2830,
        schematicX: 270, schematicY: 450,
        lines: ['S41', 'S42'],
    },
    'Westend': {
        name: 'Westend',
        lat: 52.5179, lng: 13.2840,
        schematicX: 280, schematicY: 480,
        lines: ['S41', 'S42'],
    },
    'Jungfernheide': {
        name: 'Jungfernheide',
        lat: 52.5309, lng: 13.2983,
        schematicX: 300, schematicY: 510,
        lines: ['S41', 'S42', 'S9'],
    },
    'Beusselstraße': {
        name: 'Beusselstraße',
        lat: 52.5340, lng: 13.3223,
        schematicX: 340, schematicY: 530,
        lines: ['S41', 'S42'],
    },
    'Westhafen': {
        name: 'Westhafen',
        lat: 52.5359, lng: 13.3433,
        schematicX: 380, schematicY: 540,
        lines: ['S41', 'S42'],
    },
    'Wedding': {
        name: 'Wedding',
        lat: 52.5424, lng: 13.3665,
        schematicX: 420, schematicY: 545,
        lines: ['S41', 'S42'],
    },
    'Gesundbrunnen': {
        name: 'Gesundbrunnen',
        lat: 52.5488, lng: 13.3879,
        schematicX: 460, schematicY: 540,
        lines: ['S41', 'S42', 'S1', 'S2', 'S25', 'S8', 'S85'],
    },
    'Schönhauser Allee': {
        name: 'Schönhauser Allee',
        lat: 52.5488, lng: 13.4133,
        schematicX: 500, schematicY: 530,
        lines: ['S41', 'S42', 'S8', 'S85'],
    },
    'Prenzlauer Allee': {
        name: 'Prenzlauer Allee',
        lat: 52.5359, lng: 13.4270,
        schematicX: 530, schematicY: 510,
        lines: ['S41', 'S42'],
    },
    'Greifswalder Straße': {
        name: 'Greifswalder Straße',
        lat: 52.5275, lng: 13.4384,
        schematicX: 555, schematicY: 485,
        lines: ['S41', 'S42'],
    },
    'Landsberger Allee': {
        name: 'Landsberger Allee',
        lat: 52.5275, lng: 13.4536,
        schematicX: 575, schematicY: 460,
        lines: ['S41', 'S42'],
    },
    'Storkower Straße': {
        name: 'Storkower Straße',
        lat: 52.5243, lng: 13.4637,
        schematicX: 590, schematicY: 430,
        lines: ['S41', 'S42'],
    },
    'Frankfurter Allee': {
        name: 'Frankfurter Allee',
        lat: 52.5133, lng: 13.4737,
        schematicX: 600, schematicY: 400,
        lines: ['S41', 'S42'],
    },
    'Ostkreuz': {
        name: 'Ostkreuz',
        lat: 52.5029, lng: 13.4690,
        schematicX: 610, schematicY: 370,
        lines: ['S41', 'S42', 'S3', 'S5', 'S7', 'S75', 'S8', 'S85', 'S9'],
    },
    'Treptower Park': {
        name: 'Treptower Park',
        lat: 52.4960, lng: 13.4638,
        schematicX: 600, schematicY: 340,
        lines: ['S41', 'S42', 'S8', 'S85', 'S9'],
    },
    'Sonnenallee': {
        name: 'Sonnenallee',
        lat: 52.4787, lng: 13.4578,
        schematicX: 580, schematicY: 310,
        lines: ['S41', 'S42'],
    },
    'Neukölln': {
        name: 'Neukölln',
        lat: 52.4689, lng: 13.4447,
        schematicX: 555, schematicY: 285,
        lines: ['S41', 'S42'],
    },
    'Hermannstraße': {
        name: 'Hermannstraße',
        lat: 52.4671, lng: 13.4316,
        schematicX: 520, schematicY: 265,
        lines: ['S41', 'S42'],
    },
    'Tempelhof': {
        name: 'Tempelhof',
        lat: 52.4697, lng: 13.3834,
        schematicX: 470, schematicY: 255,
        lines: ['S41', 'S42'],
    },
    'Südkreuz': {
        name: 'Südkreuz',
        lat: 52.4750, lng: 13.3654,
        schematicX: 430, schematicY: 260,
        lines: ['S41', 'S42', 'S2', 'S25', 'S26'],
    },
    'Schöneberg': {
        name: 'Schöneberg',
        lat: 52.4830, lng: 13.3600,
        schematicX: 400, schematicY: 275,
        lines: ['S41', 'S42', 'S1'],
    },
    'Innsbrucker Platz': {
        name: 'Innsbrucker Platz',
        lat: 52.4783, lng: 13.3424,
        schematicX: 370, schematicY: 290,
        lines: ['S41', 'S42', 'S45', 'S46'],
    },
    'Bundesplatz': {
        name: 'Bundesplatz',
        lat: 52.4766, lng: 13.3253,
        schematicX: 340, schematicY: 310,
        lines: ['S41', 'S42', 'S45', 'S46'],
    },
    'Heidelberger Platz': {
        name: 'Heidelberger Platz',
        lat: 52.4851, lng: 13.2979,
        schematicX: 305, schematicY: 335,
        lines: ['S41', 'S42', 'S45', 'S46'],
    },
    'Hohenzollerndamm': {
        name: 'Hohenzollerndamm',
        lat: 52.4908, lng: 13.2884,
        schematicX: 280, schematicY: 355,
        lines: ['S41', 'S42'],
    },
    'Halensee': {
        name: 'Halensee',
        lat: 52.4972, lng: 13.2916,
        schematicX: 260, schematicY: 378,
        lines: ['S41', 'S42'],
    },

    // S1 LINE - North to South (Pink)
    'Oranienburg': {
        name: 'Oranienburg',
        lat: 52.7550, lng: 13.2457,
        schematicX: 400, schematicY: 700,
        lines: ['S1'],
    },
    'Lehnitz': {
        name: 'Lehnitz',
        lat: 52.7310, lng: 13.2550,
        schematicX: 405, schematicY: 680,
        lines: ['S1'],
    },
    'Borgsdorf': {
        name: 'Borgsdorf',
        lat: 52.6948, lng: 13.2720,
        schematicX: 410, schematicY: 660,
        lines: ['S1'],
    },
    'Birkenwerder': {
        name: 'Birkenwerder',
        lat: 52.6833, lng: 13.2865,
        schematicX: 420, schematicY: 640,
        lines: ['S1', 'S8'],
    },
    'Hohen Neuendorf': {
        name: 'Hohen Neuendorf',
        lat: 52.6756, lng: 13.2917,
        schematicX: 430, schematicY: 625,
        lines: ['S1'],
    },
    'Frohnau': {
        name: 'Frohnau',
        lat: 52.6300, lng: 13.2920,
        schematicX: 445, schematicY: 605,
        lines: ['S1'],
    },
    'Hermsdorf': {
        name: 'Hermsdorf',
        lat: 52.6195, lng: 13.3020,
        schematicX: 450, schematicY: 590,
        lines: ['S1'],
    },
    'Waidmannslust': {
        name: 'Waidmannslust',
        lat: 52.6140, lng: 13.3160,
        schematicX: 455, schematicY: 580,
        lines: ['S1'],
    },
    'Wittenau': {
        name: 'Wittenau',
        lat: 52.5970, lng: 13.3261,
        schematicX: 460, schematicY: 570,
        lines: ['S1'],
    },
    'Bornholmer Straße': {
        name: 'Bornholmer Straße',
        lat: 52.5510, lng: 13.4033,
        schematicX: 465, schematicY: 555,
        lines: ['S1', 'S2', 'S25', 'S8', 'S85'],
    },
    'Humboldthain': {
        name: 'Humboldthain',
        lat: 52.5463, lng: 13.3848,
        schematicX: 460, schematicY: 530,
        lines: ['S1', 'S2', 'S25'],
    },
    'Nordbahnhof': {
        name: 'Nordbahnhof',
        lat: 52.5314, lng: 13.3880,
        schematicX: 455, schematicY: 505,
        lines: ['S1', 'S2', 'S25'],
    },
    'Oranienburger Straße': {
        name: 'Oranienburger Straße',
        lat: 52.5258, lng: 13.3930,
        schematicX: 450, schematicY: 480,
        lines: ['S1', 'S2', 'S25'],
    },
    'Friedrichstraße': {
        name: 'Friedrichstraße',
        lat: 52.5199, lng: 13.3873,
        schematicX: 445, schematicY: 455,
        lines: ['S1', 'S2', 'S25', 'S3', 'S5', 'S7', 'S9'],
    },
    'Brandenburger Tor': {
        name: 'Brandenburger Tor',
        lat: 52.5163, lng: 13.3777,
        schematicX: 440, schematicY: 430,
        lines: ['S1', 'S2', 'S25'],
    },
    'Potsdamer Platz': {
        name: 'Potsdamer Platz',
        lat: 52.5096, lng: 13.3761,
        schematicX: 435, schematicY: 405,
        lines: ['S1', 'S2', 'S25'],
    },
    'Anhalter Bahnhof': {
        name: 'Anhalter Bahnhof',
        lat: 52.5041, lng: 13.3822,
        schematicX: 430, schematicY: 380,
        lines: ['S1', 'S2', 'S25'],
    },
    'Yorckstraße (S)': {
        name: 'Yorckstraße (S)',
        lat: 52.4918, lng: 13.3745,
        schematicX: 420, schematicY: 355,
        lines: ['S1', 'S2', 'S25'],
    },
    'Julius-Leber-Brücke': {
        name: 'Julius-Leber-Brücke',
        lat: 52.4802, lng: 13.3562,
        schematicX: 395, schematicY: 310,
        lines: ['S1'],
    },
    'Friedenau': {
        name: 'Friedenau',
        lat: 52.4700, lng: 13.3243,
        schematicX: 370, schematicY: 285,
        lines: ['S1'],
    },
    'Feuerbachstraße': {
        name: 'Feuerbachstraße',
        lat: 52.4650, lng: 13.3313,
        schematicX: 350, schematicY: 265,
        lines: ['S1'],
    },
    'Rathaus Steglitz': {
        name: 'Rathaus Steglitz',
        lat: 52.4560, lng: 13.3228,
        schematicX: 330, schematicY: 245,
        lines: ['S1'],
    },
    'Botanischer Garten': {
        name: 'Botanischer Garten',
        lat: 52.4430, lng: 13.3047,
        schematicX: 305, schematicY: 220,
        lines: ['S1'],
    },
    'Lichterfelde West': {
        name: 'Lichterfelde West',
        lat: 52.4396, lng: 13.2889,
        schematicX: 280, schematicY: 200,
        lines: ['S1'],
    },
    'Sundgauer Straße': {
        name: 'Sundgauer Straße',
        lat: 52.4408, lng: 13.2726,
        schematicX: 260, schematicY: 185,
        lines: ['S1'],
    },
    'Zehlendorf': {
        name: 'Zehlendorf',
        lat: 52.4425, lng: 13.2571,
        schematicX: 240, schematicY: 170,
        lines: ['S1'],
    },
    'Mexikoplatz': {
        name: 'Mexikoplatz',
        lat: 52.4484, lng: 13.2334,
        schematicX: 220, schematicY: 155,
        lines: ['S1'],
    },
    'Schlachtensee': {
        name: 'Schlachtensee',
        lat: 52.4430, lng: 13.2157,
        schematicX: 200, schematicY: 145,
        lines: ['S1'],
    },
    'Nikolassee': {
        name: 'Nikolassee',
        lat: 52.4352, lng: 13.1958,
        schematicX: 180, schematicY: 140,
        lines: ['S1', 'S7'],
    },
    'Wannsee': {
        name: 'Wannsee',
        lat: 52.4210, lng: 13.1792,
        schematicX: 155, schematicY: 135,
        lines: ['S1', 'S7'],
    },

    // CENTRAL STATIONS
    'Hauptbahnhof': {
        name: 'Hauptbahnhof',
        lat: 52.5251, lng: 13.3694,
        schematicX: 420, schematicY: 460,
        lines: ['S3', 'S5', 'S7', 'S9'],
    },
    'Bellevue': {
        name: 'Bellevue',
        lat: 52.5199, lng: 13.3475,
        schematicX: 390, schematicY: 455,
        lines: ['S3', 'S5', 'S7', 'S9'],
    },
    'Tiergarten': {
        name: 'Tiergarten',
        lat: 52.5143, lng: 13.3360,
        schematicX: 360, schematicY: 450,
        lines: ['S3', 'S5', 'S7', 'S9'],
    },
    'Zoologischer Garten': {
        name: 'Zoologischer Garten',
        lat: 52.5068, lng: 13.3327,
        schematicX: 330, schematicY: 445,
        lines: ['S3', 'S5', 'S7', 'S9'],
    },
    'Savignyplatz': {
        name: 'Savignyplatz',
        lat: 52.5055, lng: 13.3191,
        schematicX: 305, schematicY: 440,
        lines: ['S3', 'S5', 'S7', 'S9'],
    },
    'Charlottenburg': {
        name: 'Charlottenburg',
        lat: 52.5049, lng: 13.3037,
        schematicX: 280, schematicY: 435,
        lines: ['S3', 'S5', 'S7', 'S9'],
    },
    'Hackescher Markt': {
        name: 'Hackescher Markt',
        lat: 52.5228, lng: 13.4026,
        schematicX: 515, schematicY: 455,
        lines: ['S3', 'S5', 'S7', 'S9'],
    },
    'Alexanderplatz': {
        name: 'Alexanderplatz',
        lat: 52.5219, lng: 13.4132,
        schematicX: 535, schematicY: 455,
        lines: ['S3', 'S5', 'S7', 'S9'],
    },
    'Jannowitzbrücke': {
        name: 'Jannowitzbrücke',
        lat: 52.5150, lng: 13.4189,
        schematicX: 555, schematicY: 450,
        lines: ['S3', 'S5', 'S7', 'S9'],
    },
    'Ostbahnhof': {
        name: 'Ostbahnhof',
        lat: 52.5099, lng: 13.4350,
        schematicX: 575, schematicY: 440,
        lines: ['S3', 'S5', 'S7', 'S9'],
    },
    'Warschauer Straße': {
        name: 'Warschauer Straße',
        lat: 52.5053, lng: 13.4495,
        schematicX: 595, schematicY: 420,
        lines: ['S3', 'S5', 'S7', 'S9'],
    },

    // S3 East - to Erkner
    'Nöldnerplatz': {
        name: 'Nöldnerplatz',
        lat: 52.5072, lng: 13.4826,
        schematicX: 635, schematicY: 370,
        lines: ['S3', 'S5', 'S7', 'S75'],
    },
    'Lichtenberg': {
        name: 'Lichtenberg',
        lat: 52.5128, lng: 13.4994,
        schematicX: 660, schematicY: 370,
        lines: ['S3', 'S5', 'S7', 'S75'],
    },
    'Friedrichsfelde Ost': {
        name: 'Friedrichsfelde Ost',
        lat: 52.5089, lng: 13.5249,
        schematicX: 690, schematicY: 365,
        lines: ['S3', 'S5', 'S7'],
    },
    'Biesdorf': {
        name: 'Biesdorf',
        lat: 52.5077, lng: 13.5507,
        schematicX: 720, schematicY: 360,
        lines: ['S3', 'S5'],
    },
    'Wuhlheide': {
        name: 'Wuhlheide',
        lat: 52.4619, lng: 13.5590,
        schematicX: 750, schematicY: 340,
        lines: ['S3'],
    },
    'Köpenick': {
        name: 'Köpenick',
        lat: 52.4555, lng: 13.5759,
        schematicX: 780, schematicY: 320,
        lines: ['S3'],
    },
    'Hirschgarten': {
        name: 'Hirschgarten',
        lat: 52.4527, lng: 13.6005,
        schematicX: 810, schematicY: 305,
        lines: ['S3'],
    },
    'Friedrichshagen': {
        name: 'Friedrichshagen',
        lat: 52.4481, lng: 13.6290,
        schematicX: 840, schematicY: 290,
        lines: ['S3'],
    },
    'Rahnsdorf': {
        name: 'Rahnsdorf',
        lat: 52.4467, lng: 13.6960,
        schematicX: 875, schematicY: 280,
        lines: ['S3'],
    },
    'Wilhelmshagen': {
        name: 'Wilhelmshagen',
        lat: 52.4330, lng: 13.7220,
        schematicX: 905, schematicY: 270,
        lines: ['S3'],
    },
    'Erkner': {
        name: 'Erkner',
        lat: 52.4227, lng: 13.7505,
        schematicX: 940, schematicY: 260,
        lines: ['S3'],
    },

    // S3 West - to Spandau
    'Messe Süd': {
        name: 'Messe Süd',
        lat: 52.5019, lng: 13.2726,
        schematicX: 240, schematicY: 420,
        lines: ['S3', 'S9'],
    },
    'Heerstraße': {
        name: 'Heerstraße',
        lat: 52.5095, lng: 13.2613,
        schematicX: 220, schematicY: 430,
        lines: ['S3', 'S9'],
    },
    'Olympiastadion': {
        name: 'Olympiastadion',
        lat: 52.5115, lng: 13.2416,
        schematicX: 195, schematicY: 445,
        lines: ['S3', 'S9'],
    },
    'Pichelsberg': {
        name: 'Pichelsberg',
        lat: 52.5169, lng: 13.2297,
        schematicX: 170, schematicY: 460,
        lines: ['S3', 'S9'],
    },
    'Stresow': {
        name: 'Stresow',
        lat: 52.5315, lng: 13.2190,
        schematicX: 145, schematicY: 475,
        lines: ['S3', 'S9'],
    },
    'Spandau': {
        name: 'Spandau',
        lat: 52.5341, lng: 13.1975,
        schematicX: 115, schematicY: 490,
        lines: ['S3', 'S9'],
    },

    // S7 West - to Potsdam
    'Grunewald': {
        name: 'Grunewald',
        lat: 52.4876, lng: 13.2619,
        schematicX: 220, schematicY: 380,
        lines: ['S7'],
    },
    'Griebnitzsee': {
        name: 'Griebnitzsee',
        lat: 52.3949, lng: 13.1267,
        schematicX: 130, schematicY: 120,
        lines: ['S7'],
    },
    'Babelsberg': {
        name: 'Babelsberg',
        lat: 52.3994, lng: 13.1024,
        schematicX: 100, schematicY: 105,
        lines: ['S7'],
    },
    'Potsdam Hauptbahnhof': {
        name: 'Potsdam Hauptbahnhof',
        lat: 52.3916, lng: 13.0667,
        schematicX: 60, schematicY: 90,
        lines: ['S7'],
    },

    // S9 South - to Flughafen BER
    'Schöneweide': {
        name: 'Schöneweide',
        lat: 52.4566, lng: 13.5092,
        schematicX: 620, schematicY: 300,
        lines: ['S8', 'S85', 'S9', 'S45', 'S46', 'S47'],
    },
    'Adlershof': {
        name: 'Adlershof',
        lat: 52.4354, lng: 13.5418,
        schematicX: 660, schematicY: 260,
        lines: ['S8', 'S85', 'S9', 'S45', 'S46'],
    },
    'Altglienicke': {
        name: 'Altglienicke',
        lat: 52.4230, lng: 13.5270,
        schematicX: 690, schematicY: 230,
        lines: ['S9'],
    },
    'Grünbergallee': {
        name: 'Grünbergallee',
        lat: 52.4120, lng: 13.5115,
        schematicX: 720, schematicY: 200,
        lines: ['S9'],
    },
    'Schönefeld': {
        name: 'Schönefeld',
        lat: 52.4004, lng: 13.5026,
        schematicX: 750, schematicY: 170,
        lines: ['S9'],
    },
    'Flughafen BER': {
        name: 'Flughafen BER',
        lat: 52.3650, lng: 13.5185,
        schematicX: 780, schematicY: 130,
        lines: ['S9', 'S45'],
    },
};

// S-Bahn line routes
export const sbahnLines: Record<string, string[]> = {
    'S41': [
        'Westkreuz', 'Messe Nord/ICC', 'Westend', 'Jungfernheide', 'Beusselstraße',
        'Westhafen', 'Wedding', 'Gesundbrunnen', 'Schönhauser Allee', 'Prenzlauer Allee',
        'Greifswalder Straße', 'Landsberger Allee', 'Storkower Straße', 'Frankfurter Allee',
        'Ostkreuz', 'Treptower Park', 'Sonnenallee', 'Neukölln', 'Hermannstraße',
        'Tempelhof', 'Südkreuz', 'Schöneberg', 'Innsbrucker Platz', 'Bundesplatz',
        'Heidelberger Platz', 'Hohenzollerndamm', 'Halensee', 'Westkreuz'
    ],
    'S42': [
        'Westkreuz', 'Halensee', 'Hohenzollerndamm', 'Heidelberger Platz', 'Bundesplatz',
        'Innsbrucker Platz', 'Schöneberg', 'Südkreuz', 'Tempelhof', 'Hermannstraße',
        'Neukölln', 'Sonnenallee', 'Treptower Park', 'Ostkreuz', 'Frankfurter Allee',
        'Storkower Straße', 'Landsberger Allee', 'Greifswalder Straße', 'Prenzlauer Allee',
        'Schönhauser Allee', 'Gesundbrunnen', 'Wedding', 'Westhafen', 'Beusselstraße',
        'Jungfernheide', 'Westend', 'Messe Nord/ICC', 'Westkreuz'
    ],
    'S1': [
        'Oranienburg', 'Lehnitz', 'Borgsdorf', 'Birkenwerder', 'Hohen Neuendorf',
        'Frohnau', 'Hermsdorf', 'Waidmannslust', 'Wittenau', 'Bornholmer Straße',
        'Gesundbrunnen', 'Humboldthain', 'Nordbahnhof', 'Oranienburger Straße',
        'Friedrichstraße', 'Brandenburger Tor', 'Potsdamer Platz', 'Anhalter Bahnhof',
        'Yorckstraße (S)', 'Julius-Leber-Brücke', 'Schöneberg', 'Friedenau',
        'Feuerbachstraße', 'Rathaus Steglitz', 'Botanischer Garten', 'Lichterfelde West',
        'Sundgauer Straße', 'Zehlendorf', 'Mexikoplatz', 'Schlachtensee', 'Nikolassee', 'Wannsee'
    ],
    'S3': [
        'Spandau', 'Stresow', 'Pichelsberg', 'Olympiastadion', 'Heerstraße',
        'Messe Süd', 'Westkreuz', 'Charlottenburg', 'Savignyplatz', 'Zoologischer Garten',
        'Tiergarten', 'Bellevue', 'Hauptbahnhof', 'Friedrichstraße', 'Hackescher Markt',
        'Alexanderplatz', 'Jannowitzbrücke', 'Ostbahnhof', 'Warschauer Straße', 'Ostkreuz',
        'Nöldnerplatz', 'Lichtenberg', 'Friedrichsfelde Ost', 'Biesdorf', 'Wuhlheide',
        'Köpenick', 'Hirschgarten', 'Friedrichshagen', 'Rahnsdorf', 'Wilhelmshagen', 'Erkner'
    ],
    'S5': [
        'Westkreuz', 'Charlottenburg', 'Savignyplatz', 'Zoologischer Garten',
        'Tiergarten', 'Bellevue', 'Hauptbahnhof', 'Friedrichstraße', 'Hackescher Markt',
        'Alexanderplatz', 'Jannowitzbrücke', 'Ostbahnhof', 'Warschauer Straße', 'Ostkreuz',
        'Nöldnerplatz', 'Lichtenberg', 'Friedrichsfelde Ost', 'Biesdorf'
    ],
    'S7': [
        'Potsdam Hauptbahnhof', 'Babelsberg', 'Griebnitzsee', 'Wannsee', 'Nikolassee',
        'Grunewald', 'Westkreuz', 'Charlottenburg', 'Savignyplatz', 'Zoologischer Garten',
        'Tiergarten', 'Bellevue', 'Hauptbahnhof', 'Friedrichstraße', 'Hackescher Markt',
        'Alexanderplatz', 'Jannowitzbrücke', 'Ostbahnhof', 'Warschauer Straße', 'Ostkreuz',
        'Nöldnerplatz', 'Lichtenberg'
    ],
    'S9': [
        'Spandau', 'Stresow', 'Pichelsberg', 'Olympiastadion', 'Heerstraße',
        'Messe Süd', 'Westkreuz', 'Charlottenburg', 'Savignyplatz', 'Zoologischer Garten',
        'Tiergarten', 'Bellevue', 'Hauptbahnhof', 'Friedrichstraße', 'Hackescher Markt',
        'Alexanderplatz', 'Jannowitzbrücke', 'Ostbahnhof', 'Warschauer Straße', 'Ostkreuz',
        'Treptower Park', 'Schöneweide', 'Adlershof', 'Altglienicke', 'Grünbergallee',
        'Schönefeld', 'Flughafen BER'
    ],
};

export function getAllSBahnStations(): SBahnStation[] {
    return Object.values(sbahnStations);
}
