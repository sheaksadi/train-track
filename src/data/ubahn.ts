// Berlin U-Bahn Lines and Stations
// Source: BVG December 2025
// Schematic coordinates scaled to match S-Bahn (0-1000 range)

export interface Station {
    name: string;
    lat: number;
    lng: number;
    schematicX: number;
    schematicY: number;
    lines: string[];
}

// Official BVG U-Bahn Colors
export const ubahnColors: Record<string, string> = {
    'U1': '#7DAD4C',  // Green
    'U2': '#DA421E',  // Red
    'U3': '#007A5B',  // Teal
    'U4': '#F0D722',  // Yellow
    'U5': '#7E5330',  // Brown
    'U6': '#8C6DAB',  // Purple
    'U7': '#528DBA',  // Blue
    'U8': '#224F86',  // Dark Blue
    'U9': '#F3791D',  // Orange
};

// Station data with schematic positions (scaled to 0-1000 range)
export const ubahnStations: Record<string, Station> = {
    // U1 LINE (Green) - Uhlandstraße to Warschauer Straße
    'Uhlandstraße': { name: 'Uhlandstraße', lat: 52.5023, lng: 13.3280, schematicX: 280, schematicY: 420, lines: ['U1'] },
    'Kurfürstendamm': { name: 'Kurfürstendamm', lat: 52.5042, lng: 13.3319, schematicX: 305, schematicY: 420, lines: ['U1', 'U9'] },
    'Wittenbergplatz': { name: 'Wittenbergplatz', lat: 52.5019, lng: 13.3428, schematicX: 340, schematicY: 420, lines: ['U1', 'U2', 'U3'] },
    'Nollendorfplatz': { name: 'Nollendorfplatz', lat: 52.4994, lng: 13.3536, schematicX: 360, schematicY: 400, lines: ['U1', 'U2', 'U3', 'U4'] },
    'Kurfürstenstraße': { name: 'Kurfürstenstraße', lat: 52.5016, lng: 13.3623, schematicX: 380, schematicY: 400, lines: ['U1', 'U3'] },
    'Gleisdreieck': { name: 'Gleisdreieck', lat: 52.4995, lng: 13.3743, schematicX: 400, schematicY: 400, lines: ['U1', 'U2', 'U3'] },
    'Möckernbrücke': { name: 'Möckernbrücke', lat: 52.4987, lng: 13.3828, schematicX: 420, schematicY: 380, lines: ['U1', 'U3', 'U7'] },
    'Hallesches Tor': { name: 'Hallesches Tor', lat: 52.4976, lng: 13.3916, schematicX: 440, schematicY: 360, lines: ['U1', 'U3', 'U6'] },
    'Prinzenstraße': { name: 'Prinzenstraße', lat: 52.4999, lng: 13.4043, schematicX: 460, schematicY: 360, lines: ['U1', 'U3'] },
    'Kottbusser Tor': { name: 'Kottbusser Tor', lat: 52.4994, lng: 13.4178, schematicX: 490, schematicY: 360, lines: ['U1', 'U3', 'U8'] },
    'Görlitzer Bahnhof': { name: 'Görlitzer Bahnhof', lat: 52.4989, lng: 13.4261, schematicX: 515, schematicY: 360, lines: ['U1', 'U3'] },
    'Schlesisches Tor': { name: 'Schlesisches Tor', lat: 52.5009, lng: 13.4420, schematicX: 540, schematicY: 360, lines: ['U1', 'U3'] },
    'Warschauer Straße': { name: 'Warschauer Straße', lat: 52.5053, lng: 13.4495, schematicX: 570, schematicY: 380, lines: ['U1', 'U3'] },

    // U2 LINE (Red) - Ruhleben to Pankow
    'Ruhleben': { name: 'Ruhleben', lat: 52.5254, lng: 13.2415, schematicX: 80, schematicY: 480, lines: ['U2'] },
    'Olympia-Stadion': { name: 'Olympia-Stadion', lat: 52.5115, lng: 13.2416, schematicX: 100, schematicY: 480, lines: ['U2'] },
    'Neu-Westend': { name: 'Neu-Westend', lat: 52.5163, lng: 13.2593, schematicX: 125, schematicY: 480, lines: ['U2'] },
    'Theodor-Heuss-Platz': { name: 'Theodor-Heuss-Platz', lat: 52.5096, lng: 13.2738, schematicX: 150, schematicY: 480, lines: ['U2'] },
    'Kaiserdamm': { name: 'Kaiserdamm', lat: 52.5176, lng: 13.2803, schematicX: 175, schematicY: 480, lines: ['U2'] },
    'Sophie-Charlotte-Platz': { name: 'Sophie-Charlotte-Platz', lat: 52.5195, lng: 13.2941, schematicX: 200, schematicY: 480, lines: ['U2'] },
    'Bismarckstraße': { name: 'Bismarckstraße', lat: 52.5189, lng: 13.3035, schematicX: 225, schematicY: 480, lines: ['U2', 'U7'] },
    'Deutsche Oper': { name: 'Deutsche Oper', lat: 52.5166, lng: 13.3131, schematicX: 250, schematicY: 480, lines: ['U2'] },
    'Ernst-Reuter-Platz': { name: 'Ernst-Reuter-Platz', lat: 52.5122, lng: 13.3219, schematicX: 275, schematicY: 475, lines: ['U2'] },
    'Zoologischer Garten': { name: 'Zoologischer Garten', lat: 52.5068, lng: 13.3327, schematicX: 310, schematicY: 460, lines: ['U2', 'U9'] },
    'Bülowstraße': { name: 'Bülowstraße', lat: 52.4994, lng: 13.3620, schematicX: 360, schematicY: 425, lines: ['U2'] },
    'Mendelssohn-Bartholdy-Park': { name: 'Mendelssohn-Bartholdy-Park', lat: 52.5058, lng: 13.3729, schematicX: 420, schematicY: 420, lines: ['U2'] },
    'Potsdamer Platz': { name: 'Potsdamer Platz', lat: 52.5096, lng: 13.3761, schematicX: 440, schematicY: 435, lines: ['U2'] },
    'Mohrenstraße': { name: 'Mohrenstraße', lat: 52.5109, lng: 13.3816, schematicX: 460, schematicY: 455, lines: ['U2'] },
    'Stadtmitte': { name: 'Stadtmitte', lat: 52.5117, lng: 13.3885, schematicX: 480, schematicY: 455, lines: ['U2', 'U6'] },
    'Hausvogteiplatz': { name: 'Hausvogteiplatz', lat: 52.5129, lng: 13.3925, schematicX: 500, schematicY: 455, lines: ['U2'] },
    'Spittelmarkt': { name: 'Spittelmarkt', lat: 52.5105, lng: 13.3989, schematicX: 520, schematicY: 455, lines: ['U2'] },
    'Märkisches Museum': { name: 'Märkisches Museum', lat: 52.5124, lng: 13.4074, schematicX: 545, schematicY: 455, lines: ['U2'] },
    'Klosterstraße': { name: 'Klosterstraße', lat: 52.5177, lng: 13.4115, schematicX: 560, schematicY: 470, lines: ['U2'] },
    'Alexanderplatz': { name: 'Alexanderplatz', lat: 52.5219, lng: 13.4132, schematicX: 580, schematicY: 490, lines: ['U2', 'U5', 'U8'] },
    'Rosa-Luxemburg-Platz': { name: 'Rosa-Luxemburg-Platz', lat: 52.5280, lng: 13.4109, schematicX: 580, schematicY: 520, lines: ['U2'] },
    'Senefelderplatz': { name: 'Senefelderplatz', lat: 52.5323, lng: 13.4123, schematicX: 580, schematicY: 545, lines: ['U2'] },
    'Eberswalder Straße': { name: 'Eberswalder Straße', lat: 52.5412, lng: 13.4042, schematicX: 580, schematicY: 575, lines: ['U2'] },
    'Schönhauser Allee': { name: 'Schönhauser Allee', lat: 52.5488, lng: 13.4133, schematicX: 580, schematicY: 610, lines: ['U2'] },
    'Vinetastraße': { name: 'Vinetastraße', lat: 52.5607, lng: 13.4109, schematicX: 580, schematicY: 645, lines: ['U2'] },
    'Pankow': { name: 'Pankow', lat: 52.5673, lng: 13.4108, schematicX: 580, schematicY: 680, lines: ['U2'] },

    // U3 LINE (Teal) - Krumme Lanke to Warschauer Straße
    'Krumme Lanke': { name: 'Krumme Lanke', lat: 52.4420, lng: 13.2419, schematicX: 180, schematicY: 170, lines: ['U3'] },
    'Onkel Toms Hütte': { name: 'Onkel Toms Hütte', lat: 52.4426, lng: 13.2553, schematicX: 200, schematicY: 190, lines: ['U3'] },
    'Oskar-Helene-Heim': { name: 'Oskar-Helene-Heim', lat: 52.4485, lng: 13.2778, schematicX: 220, schematicY: 210, lines: ['U3'] },
    'Freie Universität (Thielplatz)': { name: 'Freie Universität (Thielplatz)', lat: 52.4550, lng: 13.2848, schematicX: 240, schematicY: 230, lines: ['U3'] },
    'Dahlem-Dorf': { name: 'Dahlem-Dorf', lat: 52.4597, lng: 13.2876, schematicX: 260, schematicY: 250, lines: ['U3'] },
    'Podbielskiallee': { name: 'Podbielskiallee', lat: 52.4665, lng: 13.2870, schematicX: 280, schematicY: 270, lines: ['U3'] },
    'Breitenbachplatz': { name: 'Breitenbachplatz', lat: 52.4754, lng: 13.2883, schematicX: 295, schematicY: 290, lines: ['U3'] },
    'Rüdesheimer Platz': { name: 'Rüdesheimer Platz', lat: 52.4810, lng: 13.2919, schematicX: 295, schematicY: 315, lines: ['U3'] },
    'Heidelberger Platz': { name: 'Heidelberger Platz', lat: 52.4851, lng: 13.2979, schematicX: 295, schematicY: 340, lines: ['U3'] },
    'Fehrbelliner Platz': { name: 'Fehrbelliner Platz', lat: 52.4875, lng: 13.3083, schematicX: 310, schematicY: 355, lines: ['U3', 'U7'] },
    'Hohenzollernplatz': { name: 'Hohenzollernplatz', lat: 52.4895, lng: 13.3194, schematicX: 315, schematicY: 375, lines: ['U3'] },
    'Spichernstraße': { name: 'Spichernstraße', lat: 52.4964, lng: 13.3296, schematicX: 315, schematicY: 395, lines: ['U3', 'U9'] },
    'Augsburger Straße': { name: 'Augsburger Straße', lat: 52.5023, lng: 13.3312, schematicX: 330, schematicY: 420, lines: ['U3'] },

    // U4 LINE (Yellow) - Short line
    'Innsbrucker Platz': { name: 'Innsbrucker Platz', lat: 52.4783, lng: 13.3424, schematicX: 355, schematicY: 295, lines: ['U4'] },
    'Rathaus Schöneberg': { name: 'Rathaus Schöneberg', lat: 52.4830, lng: 13.3399, schematicX: 355, schematicY: 320, lines: ['U4'] },
    'Bayerischer Platz': { name: 'Bayerischer Platz', lat: 52.4891, lng: 13.3396, schematicX: 355, schematicY: 345, lines: ['U4', 'U7'] },
    'Viktoria-Luise-Platz': { name: 'Viktoria-Luise-Platz', lat: 52.4967, lng: 13.3431, schematicX: 360, schematicY: 375, lines: ['U4'] },

    // U5 LINE (Brown) - Hauptbahnhof to Hönow
    'Hauptbahnhof': { name: 'Hauptbahnhof', lat: 52.5251, lng: 13.3694, schematicX: 420, schematicY: 490, lines: ['U5'] },
    'Bundestag': { name: 'Bundestag', lat: 52.5184, lng: 13.3752, schematicX: 445, schematicY: 490, lines: ['U5'] },
    'Brandenburger Tor': { name: 'Brandenburger Tor', lat: 52.5163, lng: 13.3777, schematicX: 470, schematicY: 490, lines: ['U5'] },
    'Unter den Linden': { name: 'Unter den Linden', lat: 52.5170, lng: 13.3884, schematicX: 490, schematicY: 490, lines: ['U5', 'U6'] },
    'Museumsinsel': { name: 'Museumsinsel', lat: 52.5201, lng: 13.3979, schematicX: 515, schematicY: 490, lines: ['U5'] },
    'Rotes Rathaus': { name: 'Rotes Rathaus', lat: 52.5195, lng: 13.4077, schematicX: 545, schematicY: 490, lines: ['U5'] },
    'Schillingstraße': { name: 'Schillingstraße', lat: 52.5197, lng: 13.4224, schematicX: 610, schematicY: 490, lines: ['U5'] },
    'Strausberger Platz': { name: 'Strausberger Platz', lat: 52.5218, lng: 13.4306, schematicX: 635, schematicY: 490, lines: ['U5'] },
    'Weberwiese': { name: 'Weberwiese', lat: 52.5227, lng: 13.4423, schematicX: 660, schematicY: 490, lines: ['U5'] },
    'Frankfurter Tor': { name: 'Frankfurter Tor', lat: 52.5162, lng: 13.4537, schematicX: 685, schematicY: 490, lines: ['U5'] },
    'Samariterstraße': { name: 'Samariterstraße', lat: 52.5122, lng: 13.4658, schematicX: 710, schematicY: 490, lines: ['U5'] },
    'Frankfurter Allee': { name: 'Frankfurter Allee', lat: 52.5133, lng: 13.4737, schematicX: 735, schematicY: 490, lines: ['U5'] },
    'Magdalenenstraße': { name: 'Magdalenenstraße', lat: 52.5124, lng: 13.4876, schematicX: 760, schematicY: 490, lines: ['U5'] },
    'Lichtenberg': { name: 'Lichtenberg', lat: 52.5128, lng: 13.4994, schematicX: 785, schematicY: 490, lines: ['U5'] },
    'Friedrichsfelde': { name: 'Friedrichsfelde', lat: 52.5092, lng: 13.5133, schematicX: 810, schematicY: 475, lines: ['U5'] },
    'Tierpark': { name: 'Tierpark', lat: 52.4971, lng: 13.5283, schematicX: 835, schematicY: 455, lines: ['U5'] },
    'Biesdorf-Süd': { name: 'Biesdorf-Süd', lat: 52.5024, lng: 13.5481, schematicX: 860, schematicY: 455, lines: ['U5'] },
    'Elsterwerdaer Platz': { name: 'Elsterwerdaer Platz', lat: 52.5090, lng: 13.5643, schematicX: 885, schematicY: 455, lines: ['U5'] },
    'Wuhletal': { name: 'Wuhletal', lat: 52.5113, lng: 13.5774, schematicX: 910, schematicY: 455, lines: ['U5'] },
    'Kaulsdorf-Nord': { name: 'Kaulsdorf-Nord', lat: 52.5214, lng: 13.5838, schematicX: 930, schematicY: 475, lines: ['U5'] },
    'Kienberg (Gärten der Welt)': { name: 'Kienberg (Gärten der Welt)', lat: 52.5310, lng: 13.5795, schematicX: 930, schematicY: 495, lines: ['U5'] },
    'Cottbusser Platz': { name: 'Cottbusser Platz', lat: 52.5374, lng: 13.5736, schematicX: 930, schematicY: 515, lines: ['U5'] },
    'Hellersdorf': { name: 'Hellersdorf', lat: 52.5423, lng: 13.5652, schematicX: 930, schematicY: 535, lines: ['U5'] },
    'Louis-Lewin-Straße': { name: 'Louis-Lewin-Straße', lat: 52.5470, lng: 13.5535, schematicX: 955, schematicY: 535, lines: ['U5'] },
    'Hönow': { name: 'Hönow', lat: 52.5436, lng: 13.6273, schematicX: 990, schematicY: 535, lines: ['U5'] },

    // U6 LINE (Purple) - Alt-Tegel to Alt-Mariendorf
    'Alt-Tegel': { name: 'Alt-Tegel', lat: 52.5893, lng: 13.2838, schematicX: 460, schematicY: 780, lines: ['U6'] },
    'Borsigwerke': { name: 'Borsigwerke', lat: 52.5801, lng: 13.2875, schematicX: 460, schematicY: 760, lines: ['U6'] },
    'Holzhauser Straße': { name: 'Holzhauser Straße', lat: 52.5740, lng: 13.3012, schematicX: 460, schematicY: 740, lines: ['U6'] },
    'Otisstraße': { name: 'Otisstraße', lat: 52.5677, lng: 13.3086, schematicX: 460, schematicY: 720, lines: ['U6'] },
    'Scharnweberstraße': { name: 'Scharnweberstraße', lat: 52.5608, lng: 13.3229, schematicX: 460, schematicY: 700, lines: ['U6'] },
    'Kurt-Schumacher-Platz': { name: 'Kurt-Schumacher-Platz', lat: 52.5634, lng: 13.3307, schematicX: 460, schematicY: 680, lines: ['U6'] },
    'Afrikanische Straße': { name: 'Afrikanische Straße', lat: 52.5627, lng: 13.3390, schematicX: 460, schematicY: 660, lines: ['U6'] },
    'Rehberge': { name: 'Rehberge', lat: 52.5568, lng: 13.3454, schematicX: 460, schematicY: 640, lines: ['U6'] },
    'Seestraße': { name: 'Seestraße', lat: 52.5507, lng: 13.3464, schematicX: 460, schematicY: 620, lines: ['U6'] },
    'Leopoldplatz': { name: 'Leopoldplatz', lat: 52.5466, lng: 13.3587, schematicX: 460, schematicY: 600, lines: ['U6', 'U9'] },
    'Wedding': { name: 'Wedding', lat: 52.5424, lng: 13.3665, schematicX: 460, schematicY: 580, lines: ['U6'] },
    'Reinickendorfer Straße': { name: 'Reinickendorfer Straße', lat: 52.5356, lng: 13.3706, schematicX: 460, schematicY: 560, lines: ['U6'] },
    'Schwartzkopffstraße': { name: 'Schwartzkopffstraße', lat: 52.5323, lng: 13.3822, schematicX: 460, schematicY: 540, lines: ['U6'] },
    'Naturkundemuseum': { name: 'Naturkundemuseum', lat: 52.5310, lng: 13.3817, schematicX: 460, schematicY: 520, lines: ['U6'] },
    'Oranienburger Tor': { name: 'Oranienburger Tor', lat: 52.5254, lng: 13.3869, schematicX: 460, schematicY: 505, lines: ['U6'] },
    'Friedrichstraße': { name: 'Friedrichstraße', lat: 52.5199, lng: 13.3873, schematicX: 460, schematicY: 485, lines: ['U6'] },
    'Französische Straße': { name: 'Französische Straße', lat: 52.5149, lng: 13.3890, schematicX: 460, schematicY: 465, lines: ['U6'] },
    'Kochstraße': { name: 'Kochstraße', lat: 52.5047, lng: 13.3906, schematicX: 460, schematicY: 420, lines: ['U6'] },
    'Mehringdamm': { name: 'Mehringdamm', lat: 52.4936, lng: 13.3882, schematicX: 460, schematicY: 340, lines: ['U6', 'U7'] },
    'Platz der Luftbrücke': { name: 'Platz der Luftbrücke', lat: 52.4875, lng: 13.3853, schematicX: 460, schematicY: 300, lines: ['U6'] },
    'Paradestraße': { name: 'Paradestraße', lat: 52.4817, lng: 13.3821, schematicX: 460, schematicY: 275, lines: ['U6'] },
    'Tempelhof': { name: 'Tempelhof', lat: 52.4697, lng: 13.3834, schematicX: 460, schematicY: 235, lines: ['U6'] },
    'Alt-Tempelhof': { name: 'Alt-Tempelhof', lat: 52.4596, lng: 13.3841, schematicX: 460, schematicY: 195, lines: ['U6'] },
    'Kaiserin-Augusta-Straße': { name: 'Kaiserin-Augusta-Straße', lat: 52.4498, lng: 13.3800, schematicX: 460, schematicY: 165, lines: ['U6'] },
    'Ullsteinstraße': { name: 'Ullsteinstraße', lat: 52.4350, lng: 13.3766, schematicX: 460, schematicY: 140, lines: ['U6'] },
    'Westphalweg': { name: 'Westphalweg', lat: 52.4267, lng: 13.3717, schematicX: 460, schematicY: 115, lines: ['U6'] },
    'Alt-Mariendorf': { name: 'Alt-Mariendorf', lat: 52.4386, lng: 13.3851, schematicX: 460, schematicY: 80, lines: ['U6'] },

    // U7 LINE (Blue) - Rathaus Spandau to Rudow
    'Rathaus Spandau': { name: 'Rathaus Spandau', lat: 52.5364, lng: 13.2009, schematicX: 20, schematicY: 440, lines: ['U7'] },
    'Altstadt Spandau': { name: 'Altstadt Spandau', lat: 52.5359, lng: 13.2082, schematicX: 45, schematicY: 440, lines: ['U7'] },
    'Zitadelle': { name: 'Zitadelle', lat: 52.5399, lng: 13.2171, schematicX: 70, schematicY: 455, lines: ['U7'] },
    'Haselhorst': { name: 'Haselhorst', lat: 52.5405, lng: 13.2350, schematicX: 95, schematicY: 455, lines: ['U7'] },
    'Paulsternstraße': { name: 'Paulsternstraße', lat: 52.5396, lng: 13.2460, schematicX: 120, schematicY: 455, lines: ['U7'] },
    'Rohrdamm': { name: 'Rohrdamm', lat: 52.5410, lng: 13.2618, schematicX: 145, schematicY: 455, lines: ['U7'] },
    'Siemensdamm': { name: 'Siemensdamm', lat: 52.5398, lng: 13.2715, schematicX: 170, schematicY: 455, lines: ['U7'] },
    'Halemweg': { name: 'Halemweg', lat: 52.5379, lng: 13.2898, schematicX: 195, schematicY: 455, lines: ['U7'] },
    'Jakob-Kaiser-Platz': { name: 'Jakob-Kaiser-Platz', lat: 52.5363, lng: 13.2969, schematicX: 220, schematicY: 460, lines: ['U7'] },
    'Jungfernheide': { name: 'Jungfernheide', lat: 52.5309, lng: 13.2983, schematicX: 245, schematicY: 470, lines: ['U7'] },
    'Mierendorffplatz': { name: 'Mierendorffplatz', lat: 52.5262, lng: 13.3060, schematicX: 265, schematicY: 475, lines: ['U7'] },
    'Richard-Wagner-Platz': { name: 'Richard-Wagner-Platz', lat: 52.5217, lng: 13.3142, schematicX: 265, schematicY: 490, lines: ['U7'] },
    'Wilmersdorfer Straße': { name: 'Wilmersdorfer Straße', lat: 52.5082, lng: 13.3062, schematicX: 280, schematicY: 455, lines: ['U7'] },
    'Adenauerplatz': { name: 'Adenauerplatz', lat: 52.4997, lng: 13.3073, schematicX: 290, schematicY: 440, lines: ['U7'] },
    'Konstanzer Straße': { name: 'Konstanzer Straße', lat: 52.4938, lng: 13.3070, schematicX: 300, schematicY: 400, lines: ['U7'] },
    'Blissestraße': { name: 'Blissestraße', lat: 52.4834, lng: 13.3140, schematicX: 310, schematicY: 360, lines: ['U7'] },
    'Berliner Straße': { name: 'Berliner Straße', lat: 52.4817, lng: 13.3313, schematicX: 335, schematicY: 335, lines: ['U7', 'U9'] },
    'Eisenacher Straße': { name: 'Eisenacher Straße', lat: 52.4896, lng: 13.3486, schematicX: 380, schematicY: 335, lines: ['U7'] },
    'Kleistpark': { name: 'Kleistpark', lat: 52.4893, lng: 13.3589, schematicX: 410, schematicY: 335, lines: ['U7'] },
    'Yorckstraße': { name: 'Yorckstraße', lat: 52.4918, lng: 13.3745, schematicX: 440, schematicY: 340, lines: ['U7'] },
    'Gneisenaustraße': { name: 'Gneisenaustraße', lat: 52.4896, lng: 13.4010, schematicX: 500, schematicY: 340, lines: ['U7'] },
    'Südstern': { name: 'Südstern', lat: 52.4892, lng: 13.4125, schematicX: 525, schematicY: 340, lines: ['U7'] },
    'Hermannplatz': { name: 'Hermannplatz', lat: 52.4867, lng: 13.4249, schematicX: 550, schematicY: 320, lines: ['U7', 'U8'] },
    'Rathaus Neukölln': { name: 'Rathaus Neukölln', lat: 52.4816, lng: 13.4350, schematicX: 575, schematicY: 295, lines: ['U7'] },
    'Karl-Marx-Straße': { name: 'Karl-Marx-Straße', lat: 52.4756, lng: 13.4399, schematicX: 600, schematicY: 270, lines: ['U7'] },
    'Neukölln': { name: 'Neukölln', lat: 52.4689, lng: 13.4447, schematicX: 625, schematicY: 245, lines: ['U7'] },
    'Grenzallee': { name: 'Grenzallee', lat: 52.4623, lng: 13.4518, schematicX: 650, schematicY: 220, lines: ['U7'] },
    'Blaschkoallee': { name: 'Blaschkoallee', lat: 52.4540, lng: 13.4573, schematicX: 675, schematicY: 195, lines: ['U7'] },
    'Parchimer Allee': { name: 'Parchimer Allee', lat: 52.4469, lng: 13.4610, schematicX: 700, schematicY: 170, lines: ['U7'] },
    'Britz-Süd': { name: 'Britz-Süd', lat: 52.4384, lng: 13.4540, schematicX: 725, schematicY: 145, lines: ['U7'] },
    'Johannisthaler Chaussee': { name: 'Johannisthaler Chaussee', lat: 52.4302, lng: 13.4506, schematicX: 750, schematicY: 120, lines: ['U7'] },
    'Lipschitzallee': { name: 'Lipschitzallee', lat: 52.4237, lng: 13.4584, schematicX: 775, schematicY: 95, lines: ['U7'] },
    'Wutzkyallee': { name: 'Wutzkyallee', lat: 52.4218, lng: 13.4689, schematicX: 800, schematicY: 70, lines: ['U7'] },
    'Zwickauer Damm': { name: 'Zwickauer Damm', lat: 52.4186, lng: 13.4792, schematicX: 825, schematicY: 45, lines: ['U7'] },
    'Rudow': { name: 'Rudow', lat: 52.4134, lng: 13.4896, schematicX: 855, schematicY: 20, lines: ['U7'] },

    // U8 LINE (Dark Blue) - Wittenau to Hermannstraße
    'Wittenau': { name: 'Wittenau', lat: 52.5970, lng: 13.3261, schematicX: 520, schematicY: 740, lines: ['U8'] },
    'Rathaus Reinickendorf': { name: 'Rathaus Reinickendorf', lat: 52.5854, lng: 13.3348, schematicX: 520, schematicY: 720, lines: ['U8'] },
    'Karl-Bonhoeffer-Nervenklinik': { name: 'Karl-Bonhoeffer-Nervenklinik', lat: 52.5789, lng: 13.3439, schematicX: 520, schematicY: 700, lines: ['U8'] },
    'Lindauer Allee': { name: 'Lindauer Allee', lat: 52.5700, lng: 13.3532, schematicX: 520, schematicY: 680, lines: ['U8'] },
    'Paracelsus-Bad': { name: 'Paracelsus-Bad', lat: 52.5636, lng: 13.3616, schematicX: 520, schematicY: 660, lines: ['U8'] },
    'Residenzstraße': { name: 'Residenzstraße', lat: 52.5565, lng: 13.3692, schematicX: 520, schematicY: 640, lines: ['U8'] },
    'Franz-Neumann-Platz': { name: 'Franz-Neumann-Platz', lat: 52.5553, lng: 13.3823, schematicX: 520, schematicY: 620, lines: ['U8'] },
    'Osloer Straße': { name: 'Osloer Straße', lat: 52.5571, lng: 13.3735, schematicX: 505, schematicY: 605, lines: ['U8', 'U9'] },
    'Pankstraße': { name: 'Pankstraße', lat: 52.5516, lng: 13.3797, schematicX: 520, schematicY: 590, lines: ['U8'] },
    'Gesundbrunnen': { name: 'Gesundbrunnen', lat: 52.5488, lng: 13.3879, schematicX: 520, schematicY: 570, lines: ['U8'] },
    'Voltastraße': { name: 'Voltastraße', lat: 52.5408, lng: 13.3929, schematicX: 525, schematicY: 550, lines: ['U8'] },
    'Bernauer Straße': { name: 'Bernauer Straße', lat: 52.5352, lng: 13.3969, schematicX: 535, schematicY: 530, lines: ['U8'] },
    'Rosenthaler Platz': { name: 'Rosenthaler Platz', lat: 52.5299, lng: 13.4013, schematicX: 545, schematicY: 515, lines: ['U8'] },
    'Weinmeisterstraße': { name: 'Weinmeisterstraße', lat: 52.5254, lng: 13.4047, schematicX: 560, schematicY: 500, lines: ['U8'] },
    'Jannowitzbrücke': { name: 'Jannowitzbrücke', lat: 52.5150, lng: 13.4189, schematicX: 580, schematicY: 470, lines: ['U8'] },
    'Heinrich-Heine-Straße': { name: 'Heinrich-Heine-Straße', lat: 52.5098, lng: 13.4176, schematicX: 570, schematicY: 440, lines: ['U8'] },
    'Moritzplatz': { name: 'Moritzplatz', lat: 52.5036, lng: 13.4129, schematicX: 545, schematicY: 400, lines: ['U8'] },
    'Schönleinstraße': { name: 'Schönleinstraße', lat: 52.4941, lng: 13.4228, schematicX: 545, schematicY: 360, lines: ['U8'] },
    'Boddinstraße': { name: 'Boddinstraße', lat: 52.4808, lng: 13.4281, schematicX: 545, schematicY: 305, lines: ['U8'] },
    'Leinestraße': { name: 'Leinestraße', lat: 52.4721, lng: 13.4333, schematicX: 545, schematicY: 280, lines: ['U8'] },
    'Hermannstraße': { name: 'Hermannstraße', lat: 52.4671, lng: 13.4316, schematicX: 545, schematicY: 245, lines: ['U8'] },

    // U9 LINE (Orange) - Osloer Str to Rathaus Steglitz
    'Nauener Platz': { name: 'Nauener Platz', lat: 52.5545, lng: 13.3654, schematicX: 450, schematicY: 605, lines: ['U9'] },
    'Amrumer Straße': { name: 'Amrumer Straße', lat: 52.5423, lng: 13.3492, schematicX: 435, schematicY: 585, lines: ['U9'] },
    'Westhafen': { name: 'Westhafen', lat: 52.5359, lng: 13.3433, schematicX: 420, schematicY: 565, lines: ['U9'] },
    'Birkenstraße': { name: 'Birkenstraße', lat: 52.5334, lng: 13.3352, schematicX: 400, schematicY: 545, lines: ['U9'] },
    'Turmstraße': { name: 'Turmstraße', lat: 52.5267, lng: 13.3401, schematicX: 380, schematicY: 525, lines: ['U9'] },
    'Hansaplatz': { name: 'Hansaplatz', lat: 52.5188, lng: 13.3441, schematicX: 360, schematicY: 500, lines: ['U9'] },
    'Güntzelstraße': { name: 'Güntzelstraße', lat: 52.4900, lng: 13.3248, schematicX: 320, schematicY: 380, lines: ['U9'] },
    'Bundesplatz': { name: 'Bundesplatz', lat: 52.4766, lng: 13.3253, schematicX: 340, schematicY: 310, lines: ['U9'] },
    'Friedrich-Wilhelm-Platz': { name: 'Friedrich-Wilhelm-Platz', lat: 52.4707, lng: 13.3227, schematicX: 340, schematicY: 285, lines: ['U9'] },
    'Walther-Schreiber-Platz': { name: 'Walther-Schreiber-Platz', lat: 52.4665, lng: 13.3358, schematicX: 340, schematicY: 260, lines: ['U9'] },
    'Schloßstraße': { name: 'Schloßstraße', lat: 52.4616, lng: 13.3204, schematicX: 340, schematicY: 220, lines: ['U9'] },
    'Rathaus Steglitz': { name: 'Rathaus Steglitz', lat: 52.4560, lng: 13.3228, schematicX: 340, schematicY: 185, lines: ['U9'] },
};

// U-Bahn line routes (ordered station names)
export const ubahnLines: Record<string, string[]> = {
    'U1': ['Uhlandstraße', 'Kurfürstendamm', 'Wittenbergplatz', 'Nollendorfplatz', 'Kurfürstenstraße', 'Gleisdreieck', 'Möckernbrücke', 'Hallesches Tor', 'Prinzenstraße', 'Kottbusser Tor', 'Görlitzer Bahnhof', 'Schlesisches Tor', 'Warschauer Straße'],
    'U2': ['Pankow', 'Vinetastraße', 'Schönhauser Allee', 'Eberswalder Straße', 'Senefelderplatz', 'Rosa-Luxemburg-Platz', 'Alexanderplatz', 'Klosterstraße', 'Märkisches Museum', 'Spittelmarkt', 'Hausvogteiplatz', 'Stadtmitte', 'Mohrenstraße', 'Potsdamer Platz', 'Mendelssohn-Bartholdy-Park', 'Gleisdreieck', 'Bülowstraße', 'Nollendorfplatz', 'Wittenbergplatz', 'Zoologischer Garten', 'Ernst-Reuter-Platz', 'Deutsche Oper', 'Bismarckstraße', 'Sophie-Charlotte-Platz', 'Kaiserdamm', 'Theodor-Heuss-Platz', 'Neu-Westend', 'Olympia-Stadion', 'Ruhleben'],
    'U3': ['Krumme Lanke', 'Onkel Toms Hütte', 'Oskar-Helene-Heim', 'Freie Universität (Thielplatz)', 'Dahlem-Dorf', 'Podbielskiallee', 'Breitenbachplatz', 'Rüdesheimer Platz', 'Heidelberger Platz', 'Fehrbelliner Platz', 'Hohenzollernplatz', 'Spichernstraße', 'Augsburger Straße', 'Wittenbergplatz', 'Nollendorfplatz', 'Kurfürstenstraße', 'Gleisdreieck', 'Möckernbrücke', 'Hallesches Tor', 'Prinzenstraße', 'Kottbusser Tor', 'Görlitzer Bahnhof', 'Schlesisches Tor', 'Warschauer Straße'],
    'U4': ['Nollendorfplatz', 'Viktoria-Luise-Platz', 'Bayerischer Platz', 'Rathaus Schöneberg', 'Innsbrucker Platz'],
    'U5': ['Hauptbahnhof', 'Bundestag', 'Brandenburger Tor', 'Unter den Linden', 'Museumsinsel', 'Rotes Rathaus', 'Alexanderplatz', 'Schillingstraße', 'Strausberger Platz', 'Weberwiese', 'Frankfurter Tor', 'Samariterstraße', 'Frankfurter Allee', 'Magdalenenstraße', 'Lichtenberg', 'Friedrichsfelde', 'Tierpark', 'Biesdorf-Süd', 'Elsterwerdaer Platz', 'Wuhletal', 'Kaulsdorf-Nord', 'Kienberg (Gärten der Welt)', 'Cottbusser Platz', 'Hellersdorf', 'Louis-Lewin-Straße', 'Hönow'],
    'U6': ['Alt-Tegel', 'Borsigwerke', 'Holzhauser Straße', 'Otisstraße', 'Scharnweberstraße', 'Kurt-Schumacher-Platz', 'Afrikanische Straße', 'Rehberge', 'Seestraße', 'Leopoldplatz', 'Wedding', 'Reinickendorfer Straße', 'Schwartzkopffstraße', 'Naturkundemuseum', 'Oranienburger Tor', 'Friedrichstraße', 'Unter den Linden', 'Französische Straße', 'Stadtmitte', 'Kochstraße', 'Hallesches Tor', 'Mehringdamm', 'Platz der Luftbrücke', 'Paradestraße', 'Tempelhof', 'Alt-Tempelhof', 'Kaiserin-Augusta-Straße', 'Ullsteinstraße', 'Westphalweg', 'Alt-Mariendorf'],
    'U7': ['Rathaus Spandau', 'Altstadt Spandau', 'Zitadelle', 'Haselhorst', 'Paulsternstraße', 'Rohrdamm', 'Siemensdamm', 'Halemweg', 'Jakob-Kaiser-Platz', 'Jungfernheide', 'Mierendorffplatz', 'Richard-Wagner-Platz', 'Bismarckstraße', 'Wilmersdorfer Straße', 'Adenauerplatz', 'Konstanzer Straße', 'Fehrbelliner Platz', 'Blissestraße', 'Berliner Straße', 'Bayerischer Platz', 'Eisenacher Straße', 'Kleistpark', 'Yorckstraße', 'Möckernbrücke', 'Mehringdamm', 'Gneisenaustraße', 'Südstern', 'Hermannplatz', 'Rathaus Neukölln', 'Karl-Marx-Straße', 'Neukölln', 'Grenzallee', 'Blaschkoallee', 'Parchimer Allee', 'Britz-Süd', 'Johannisthaler Chaussee', 'Lipschitzallee', 'Wutzkyallee', 'Zwickauer Damm', 'Rudow'],
    'U8': ['Wittenau', 'Rathaus Reinickendorf', 'Karl-Bonhoeffer-Nervenklinik', 'Lindauer Allee', 'Paracelsus-Bad', 'Residenzstraße', 'Franz-Neumann-Platz', 'Osloer Straße', 'Pankstraße', 'Gesundbrunnen', 'Voltastraße', 'Bernauer Straße', 'Rosenthaler Platz', 'Weinmeisterstraße', 'Alexanderplatz', 'Jannowitzbrücke', 'Heinrich-Heine-Straße', 'Moritzplatz', 'Kottbusser Tor', 'Schönleinstraße', 'Hermannplatz', 'Boddinstraße', 'Leinestraße', 'Hermannstraße'],
    'U9': ['Osloer Straße', 'Nauener Platz', 'Leopoldplatz', 'Amrumer Straße', 'Westhafen', 'Birkenstraße', 'Turmstraße', 'Hansaplatz', 'Zoologischer Garten', 'Kurfürstendamm', 'Spichernstraße', 'Güntzelstraße', 'Berliner Straße', 'Bundesplatz', 'Friedrich-Wilhelm-Platz', 'Walther-Schreiber-Platz', 'Schloßstraße', 'Rathaus Steglitz'],
};

export function getAllStations(): Station[] {
    return Object.values(ubahnStations);
}
