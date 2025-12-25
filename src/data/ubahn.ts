// Berlin U-Bahn line colors (official BVG colors)
export const ubahnColors: Record<string, string> = {
    'U1': '#7DAD4C',  // Green
    'U2': '#DA421E',  // Red
    'U3': '#16683D',  // Teal/Dark Green
    'U4': '#F0D722',  // Yellow
    'U5': '#7E5330',  // Brown
    'U6': '#8C6DAB',  // Purple
    'U7': '#528DBA',  // Light Blue
    'U8': '#224F86',  // Dark Blue
    'U9': '#F3791D',  // Orange
};

// U-Bahn stations with their lines
export interface UbahnStation {
    id: string;
    name: string;
    lat: number;
    lng: number;
    lines: string[];
}

// Main stations for each U-Bahn line (simplified list of key stations)
// This provides approximate route paths
export const ubahnStations: UbahnStation[] = [
    // U1 - Warschauer Straße to Uhlandstraße
    { id: 'u1-1', name: 'Warschauer Straße', lat: 52.5052, lng: 13.4494, lines: ['U1', 'U3'] },
    { id: 'u1-2', name: 'Schlesisches Tor', lat: 52.5013, lng: 13.4414, lines: ['U1', 'U3'] },
    { id: 'u1-3', name: 'Görlitzer Bahnhof', lat: 52.4991, lng: 13.4271, lines: ['U1'] },
    { id: 'u1-4', name: 'Kottbusser Tor', lat: 52.4998, lng: 13.4178, lines: ['U1', 'U8'] },
    { id: 'u1-5', name: 'Prinzenstraße', lat: 52.4974, lng: 13.4053, lines: ['U1'] },
    { id: 'u1-6', name: 'Hallesches Tor', lat: 52.4977, lng: 13.3914, lines: ['U1', 'U6'] },
    { id: 'u1-7', name: 'Möckernbrücke', lat: 52.4989, lng: 13.3826, lines: ['U1', 'U7'] },
    { id: 'u1-8', name: 'Gleisdreieck', lat: 52.4992, lng: 13.3745, lines: ['U1', 'U2'] },
    { id: 'u1-9', name: 'Kurfürstenstraße', lat: 52.5022, lng: 13.3607, lines: ['U1'] },
    { id: 'u1-10', name: 'Nollendorfplatz', lat: 52.4996, lng: 13.3538, lines: ['U1', 'U2', 'U3', 'U4'] },
    { id: 'u1-11', name: 'Wittenbergplatz', lat: 52.5019, lng: 13.3428, lines: ['U1', 'U2', 'U3'] },
    { id: 'u1-12', name: 'Kurfürstendamm', lat: 52.5043, lng: 13.3313, lines: ['U1'] },
    { id: 'u1-13', name: 'Uhlandstraße', lat: 52.5039, lng: 13.3272, lines: ['U1'] },

    // U2 - Pankow to Ruhleben
    { id: 'u2-1', name: 'Pankow', lat: 52.5672, lng: 13.4115, lines: ['U2'] },
    { id: 'u2-2', name: 'Vinetastraße', lat: 52.5600, lng: 13.4133, lines: ['U2'] },
    { id: 'u2-3', name: 'Schönhauser Allee', lat: 52.5499, lng: 13.4137, lines: ['U2'] },
    { id: 'u2-4', name: 'Eberswalder Straße', lat: 52.5414, lng: 13.4202, lines: ['U2'] },
    { id: 'u2-5', name: 'Senefelderplatz', lat: 52.5320, lng: 13.4125, lines: ['U2'] },
    { id: 'u2-6', name: 'Rosa-Luxemburg-Platz', lat: 52.5263, lng: 13.4111, lines: ['U2'] },
    { id: 'u2-7', name: 'Alexanderplatz', lat: 52.5219, lng: 13.4133, lines: ['U2', 'U5', 'U8'] },
    { id: 'u2-8', name: 'Klosterstraße', lat: 52.5177, lng: 13.4119, lines: ['U2'] },
    { id: 'u2-9', name: 'Märkisches Museum', lat: 52.5138, lng: 13.4057, lines: ['U2'] },
    { id: 'u2-10', name: 'Spittelmarkt', lat: 52.5114, lng: 13.4014, lines: ['U2'] },
    { id: 'u2-11', name: 'Hausvogteiplatz', lat: 52.5129, lng: 13.3929, lines: ['U2'] },
    { id: 'u2-12', name: 'Stadtmitte', lat: 52.5095, lng: 13.3900, lines: ['U2', 'U6'] },
    { id: 'u2-13', name: 'Mohrenstraße', lat: 52.5106, lng: 13.3824, lines: ['U2'] },
    { id: 'u2-14', name: 'Potsdamer Platz', lat: 52.5093, lng: 13.3766, lines: ['U2'] },
    { id: 'u2-15', name: 'Mendelssohn-Bartholdy-Park', lat: 52.5061, lng: 13.3726, lines: ['U2'] },
    { id: 'u2-16', name: 'Zoologischer Garten', lat: 52.5066, lng: 13.3325, lines: ['U2', 'U9'] },
    { id: 'u2-17', name: 'Ernst-Reuter-Platz', lat: 52.5120, lng: 13.3225, lines: ['U2'] },
    { id: 'u2-18', name: 'Deutsche Oper', lat: 52.5167, lng: 13.3095, lines: ['U2'] },
    { id: 'u2-19', name: 'Bismarckstraße', lat: 52.5189, lng: 13.3032, lines: ['U2', 'U7'] },
    { id: 'u2-20', name: 'Sophie-Charlotte-Platz', lat: 52.5207, lng: 13.2896, lines: ['U2'] },
    { id: 'u2-21', name: 'Kaiserdamm', lat: 52.5163, lng: 13.2777, lines: ['U2'] },
    { id: 'u2-22', name: 'Theodor-Heuss-Platz', lat: 52.5098, lng: 13.2730, lines: ['U2'] },
    { id: 'u2-23', name: 'Olympia-Stadion', lat: 52.5111, lng: 13.2414, lines: ['U2'] },
    { id: 'u2-24', name: 'Ruhleben', lat: 52.5251, lng: 13.2412, lines: ['U2'] },

    // U3 - Warschauer Straße to Krumme Lanke
    { id: 'u3-1', name: 'Spichernstraße', lat: 52.4964, lng: 13.3296, lines: ['U3', 'U9'] },
    { id: 'u3-2', name: 'Hohenzollernplatz', lat: 52.4893, lng: 13.3283, lines: ['U3'] },
    { id: 'u3-3', name: 'Fehrbelliner Platz', lat: 52.4876, lng: 13.3152, lines: ['U3', 'U7'] },
    { id: 'u3-4', name: 'Heidelberger Platz', lat: 52.4887, lng: 13.3005, lines: ['U3'] },
    { id: 'u3-5', name: 'Rüdesheimer Platz', lat: 52.4875, lng: 13.2891, lines: ['U3'] },
    { id: 'u3-6', name: 'Breitenbachplatz', lat: 52.4765, lng: 13.2969, lines: ['U3'] },
    { id: 'u3-7', name: 'Podbielskiallee', lat: 52.4700, lng: 13.2912, lines: ['U3'] },
    { id: 'u3-8', name: 'Dahlem-Dorf', lat: 52.4658, lng: 13.2881, lines: ['U3'] },
    { id: 'u3-9', name: 'Thielplatz', lat: 52.4578, lng: 13.2934, lines: ['U3'] },
    { id: 'u3-10', name: 'Oskar-Helene-Heim', lat: 52.4495, lng: 13.2981, lines: ['U3'] },
    { id: 'u3-11', name: 'Onkel Toms Hütte', lat: 52.4436, lng: 13.2509, lines: ['U3'] },
    { id: 'u3-12', name: 'Krumme Lanke', lat: 52.4419, lng: 13.2389, lines: ['U3'] },

    // U4 - Nollendorfplatz to Innsbrucker Platz
    { id: 'u4-1', name: 'Viktoria-Luise-Platz', lat: 52.4964, lng: 13.3434, lines: ['U4'] },
    { id: 'u4-2', name: 'Bayerischer Platz', lat: 52.4887, lng: 13.3401, lines: ['U4', 'U7'] },
    { id: 'u4-3', name: 'Rathaus Schöneberg', lat: 52.4837, lng: 13.3432, lines: ['U4'] },
    { id: 'u4-4', name: 'Innsbrucker Platz', lat: 52.4780, lng: 13.3436, lines: ['U4'] },

    // U5 - Hauptbahnhof to Hönow
    { id: 'u5-1', name: 'Hauptbahnhof', lat: 52.5256, lng: 13.3691, lines: ['U5'] },
    { id: 'u5-2', name: 'Bundestag', lat: 52.5187, lng: 13.3737, lines: ['U5'] },
    { id: 'u5-3', name: 'Brandenburger Tor', lat: 52.5166, lng: 13.3811, lines: ['U5'] },
    { id: 'u5-4', name: 'Unter den Linden', lat: 52.5169, lng: 13.3887, lines: ['U5', 'U6'] },
    { id: 'u5-5', name: 'Museumsinsel', lat: 52.5210, lng: 13.3973, lines: ['U5'] },
    { id: 'u5-6', name: 'Rotes Rathaus', lat: 52.5188, lng: 13.4075, lines: ['U5'] },
    { id: 'u5-7', name: 'Schillingstraße', lat: 52.5196, lng: 13.4222, lines: ['U5'] },
    { id: 'u5-8', name: 'Strausberger Platz', lat: 52.5218, lng: 13.4294, lines: ['U5'] },
    { id: 'u5-9', name: 'Weberwiese', lat: 52.5222, lng: 13.4411, lines: ['U5'] },
    { id: 'u5-10', name: 'Frankfurter Tor', lat: 52.5160, lng: 13.4535, lines: ['U5'] },
    { id: 'u5-11', name: 'Samariterstraße', lat: 52.5134, lng: 13.4616, lines: ['U5'] },
    { id: 'u5-12', name: 'Frankfurter Allee', lat: 52.5141, lng: 13.4716, lines: ['U5'] },
    { id: 'u5-13', name: 'U Magdalenenstr.', lat: 52.5131, lng: 13.4829, lines: ['U5'] },
    { id: 'u5-14', name: 'Lichtenberg', lat: 52.5116, lng: 13.4979, lines: ['U5'] },
    { id: 'u5-15', name: 'Friedrichsfelde', lat: 52.5107, lng: 13.5165, lines: ['U5'] },
    { id: 'u5-16', name: 'Tierpark', lat: 52.4997, lng: 13.5278, lines: ['U5'] },
    { id: 'u5-17', name: 'Biesdorf-Süd', lat: 52.4907, lng: 13.5475, lines: ['U5'] },
    { id: 'u5-18', name: 'Elsterwerdaer Platz', lat: 52.4928, lng: 13.5622, lines: ['U5'] },
    { id: 'u5-19', name: 'Wuhletal', lat: 52.4981, lng: 13.5755, lines: ['U5'] },
    { id: 'u5-20', name: 'Kaulsdorf-Nord', lat: 52.5035, lng: 13.5877, lines: ['U5'] },
    { id: 'u5-21', name: 'Cottbusser Platz', lat: 52.5284, lng: 13.6100, lines: ['U5'] },
    { id: 'u5-22', name: 'Hellersdorf', lat: 52.5369, lng: 13.6053, lines: ['U5'] },
    { id: 'u5-23', name: 'Louis-Lewin-Straße', lat: 52.5442, lng: 13.6115, lines: ['U5'] },
    { id: 'u5-24', name: 'Hönow', lat: 52.5415, lng: 13.6288, lines: ['U5'] },

    // U6 - Alt-Tegel to Alt-Mariendorf
    { id: 'u6-1', name: 'Alt-Tegel', lat: 52.5898, lng: 13.2829, lines: ['U6'] },
    { id: 'u6-2', name: 'Borsigwerke', lat: 52.5831, lng: 13.2869, lines: ['U6'] },
    { id: 'u6-3', name: 'Holzhauser Straße', lat: 52.5757, lng: 13.2947, lines: ['U6'] },
    { id: 'u6-4', name: 'Otisstraße', lat: 52.5711, lng: 13.3008, lines: ['U6'] },
    { id: 'u6-5', name: 'Scharnweberstraße', lat: 52.5645, lng: 13.3151, lines: ['U6'] },
    { id: 'u6-6', name: 'Kurt-Schumacher-Platz', lat: 52.5638, lng: 13.3254, lines: ['U6'] },
    { id: 'u6-7', name: 'Afrikanische Straße', lat: 52.5619, lng: 13.3388, lines: ['U6'] },
    { id: 'u6-8', name: 'Rehberge', lat: 52.5550, lng: 13.3469, lines: ['U6'] },
    { id: 'u6-9', name: 'Seestraße', lat: 52.5499, lng: 13.3475, lines: ['U6'] },
    { id: 'u6-10', name: 'Leopoldplatz', lat: 52.5465, lng: 13.3593, lines: ['U6', 'U9'] },
    { id: 'u6-11', name: 'Wedding', lat: 52.5420, lng: 13.3651, lines: ['U6'] },
    { id: 'u6-12', name: 'Reinickendorfer Straße', lat: 52.5370, lng: 13.3679, lines: ['U6'] },
    { id: 'u6-13', name: 'Schwartzkopffstraße', lat: 52.5312, lng: 13.3741, lines: ['U6'] },
    { id: 'u6-14', name: 'Naturkundemuseum', lat: 52.5288, lng: 13.3814, lines: ['U6'] },
    { id: 'u6-15', name: 'Oranienburger Tor', lat: 52.5250, lng: 13.3868, lines: ['U6'] },
    { id: 'u6-16', name: 'Friedrichstraße', lat: 52.5204, lng: 13.3864, lines: ['U6'] },
    { id: 'u6-17', name: 'Französische Straße', lat: 52.5158, lng: 13.3886, lines: ['U6'] },
    { id: 'u6-18', name: 'Kochstraße', lat: 52.5059, lng: 13.3912, lines: ['U6'] },
    { id: 'u6-19', name: 'Mehringdamm', lat: 52.4938, lng: 13.3875, lines: ['U6', 'U7'] },
    { id: 'u6-20', name: 'Platz der Luftbrücke', lat: 52.4868, lng: 13.3879, lines: ['U6'] },
    { id: 'u6-21', name: 'Paradestraße', lat: 52.4808, lng: 13.3842, lines: ['U6'] },
    { id: 'u6-22', name: 'Tempelhof', lat: 52.4702, lng: 13.3847, lines: ['U6'] },
    { id: 'u6-23', name: 'Alt-Tempelhof', lat: 52.4613, lng: 13.3862, lines: ['U6'] },
    { id: 'u6-24', name: 'Kaiserin-Augusta-Straße', lat: 52.4544, lng: 13.3878, lines: ['U6'] },
    { id: 'u6-25', name: 'Ullsteinstraße', lat: 52.4493, lng: 13.3876, lines: ['U6'] },
    { id: 'u6-26', name: 'Westphalweg', lat: 52.4412, lng: 13.3861, lines: ['U6'] },
    { id: 'u6-27', name: 'Alt-Mariendorf', lat: 52.4391, lng: 13.3866, lines: ['U6'] },

    // U7 - Rathaus Spandau to Rudow
    { id: 'u7-1', name: 'Rathaus Spandau', lat: 52.5354, lng: 13.2002, lines: ['U7'] },
    { id: 'u7-2', name: 'Altstadt Spandau', lat: 52.5390, lng: 13.2066, lines: ['U7'] },
    { id: 'u7-3', name: 'Zitadelle', lat: 52.5396, lng: 13.2201, lines: ['U7'] },
    { id: 'u7-4', name: 'Haselhorst', lat: 52.5405, lng: 13.2359, lines: ['U7'] },
    { id: 'u7-5', name: 'Paulsternstraße', lat: 52.5381, lng: 13.2513, lines: ['U7'] },
    { id: 'u7-6', name: 'Rohrdamm', lat: 52.5363, lng: 13.2639, lines: ['U7'] },
    { id: 'u7-7', name: 'Siemensdamm', lat: 52.5346, lng: 13.2803, lines: ['U7'] },
    { id: 'u7-8', name: 'Halemweg', lat: 52.5361, lng: 13.2916, lines: ['U7'] },
    { id: 'u7-9', name: 'Jakob-Kaiser-Platz', lat: 52.5366, lng: 13.3025, lines: ['U7'] },
    { id: 'u7-10', name: 'Jungfernheide', lat: 52.5318, lng: 13.3108, lines: ['U7'] },
    { id: 'u7-11', name: 'Mierendorffplatz', lat: 52.5256, lng: 13.3193, lines: ['U7'] },
    { id: 'u7-12', name: 'Richard-Wagner-Platz', lat: 52.5193, lng: 13.3148, lines: ['U7'] },
    { id: 'u7-13', name: 'Wilmersdorfer Straße', lat: 52.5082, lng: 13.3055, lines: ['U7'] },
    { id: 'u7-14', name: 'Adenauerplatz', lat: 52.5001, lng: 13.3074, lines: ['U7'] },
    { id: 'u7-15', name: 'Konstanzer Straße', lat: 52.4925, lng: 13.3135, lines: ['U7'] },
    { id: 'u7-16', name: 'Blissestraße', lat: 52.4871, lng: 13.3283, lines: ['U7'] },
    { id: 'u7-17', name: 'Berliner Straße', lat: 52.4839, lng: 13.3370, lines: ['U7', 'U9'] },
    { id: 'u7-18', name: 'Eisenacher Straße', lat: 52.4871, lng: 13.3480, lines: ['U7'] },
    { id: 'u7-19', name: 'Kleistpark', lat: 52.4893, lng: 13.3593, lines: ['U7'] },
    { id: 'u7-20', name: 'Yorckstraße', lat: 52.4913, lng: 13.3710, lines: ['U7'] },
    { id: 'u7-21', name: 'Gneisenaustraße', lat: 52.4890, lng: 13.3819, lines: ['U7'] },
    { id: 'u7-22', name: 'Südstern', lat: 52.4858, lng: 13.3945, lines: ['U7'] },
    { id: 'u7-23', name: 'Hermannplatz', lat: 52.4867, lng: 13.4248, lines: ['U7', 'U8'] },
    { id: 'u7-24', name: 'Rathaus Neukölln', lat: 52.4814, lng: 13.4356, lines: ['U7'] },
    { id: 'u7-25', name: 'Karl-Marx-Straße', lat: 52.4768, lng: 13.4409, lines: ['U7'] },
    { id: 'u7-26', name: 'Neukölln', lat: 52.4732, lng: 13.4470, lines: ['U7'] },
    { id: 'u7-27', name: 'Grenzallee', lat: 52.4674, lng: 13.4548, lines: ['U7'] },
    { id: 'u7-28', name: 'Blaschkoallee', lat: 52.4602, lng: 13.4598, lines: ['U7'] },
    { id: 'u7-29', name: 'Parchimer Allee', lat: 52.4537, lng: 13.4579, lines: ['U7'] },
    { id: 'u7-30', name: 'Britz-Süd', lat: 52.4433, lng: 13.4454, lines: ['U7'] },
    { id: 'u7-31', name: 'Johannisthaler Chaussee', lat: 52.4329, lng: 13.4418, lines: ['U7'] },
    { id: 'u7-32', name: 'Lipschitzallee', lat: 52.4270, lng: 13.4480, lines: ['U7'] },
    { id: 'u7-33', name: 'Wutzkyallee', lat: 52.4200, lng: 13.4549, lines: ['U7'] },
    { id: 'u7-34', name: 'Zwickauer Damm', lat: 52.4114, lng: 13.4649, lines: ['U7'] },
    { id: 'u7-35', name: 'Rudow', lat: 52.3980, lng: 13.4855, lines: ['U7'] },

    // U8 - Wittenau to Hermannstraße
    { id: 'u8-1', name: 'Wittenau', lat: 52.5963, lng: 13.3269, lines: ['U8'] },
    { id: 'u8-2', name: 'Rathaus Reinickendorf', lat: 52.5892, lng: 13.3341, lines: ['U8'] },
    { id: 'u8-3', name: 'Karl-Bonhoeffer-Nervenklinik', lat: 52.5825, lng: 13.3431, lines: ['U8'] },
    { id: 'u8-4', name: 'Lindauer Allee', lat: 52.5751, lng: 13.3513, lines: ['U8'] },
    { id: 'u8-5', name: 'Paracelsus-Bad', lat: 52.5672, lng: 13.3536, lines: ['U8'] },
    { id: 'u8-6', name: 'Residenzstraße', lat: 52.5600, lng: 13.3606, lines: ['U8'] },
    { id: 'u8-7', name: 'Franz-Neumann-Platz', lat: 52.5536, lng: 13.3644, lines: ['U8'] },
    { id: 'u8-8', name: 'Osloer Straße', lat: 52.5539, lng: 13.3729, lines: ['U8', 'U9'] },
    { id: 'u8-9', name: 'Pankstraße', lat: 52.5471, lng: 13.3769, lines: ['U8'] },
    { id: 'u8-10', name: 'Gesundbrunnen', lat: 52.5484, lng: 13.3893, lines: ['U8'] },
    { id: 'u8-11', name: 'Voltastraße', lat: 52.5413, lng: 13.3931, lines: ['U8'] },
    { id: 'u8-12', name: 'Bernauer Straße', lat: 52.5373, lng: 13.3949, lines: ['U8'] },
    { id: 'u8-13', name: 'Rosenthaler Platz', lat: 52.5302, lng: 13.4013, lines: ['U8'] },
    { id: 'u8-14', name: 'Weinmeisterstraße', lat: 52.5251, lng: 13.4051, lines: ['U8'] },
    { id: 'u8-15', name: 'Jannowitzbrücke', lat: 52.5163, lng: 13.4173, lines: ['U8'] },
    { id: 'u8-16', name: 'Heinrich-Heine-Straße', lat: 52.5086, lng: 13.4250, lines: ['U8'] },
    { id: 'u8-17', name: 'Moritzplatz', lat: 52.5027, lng: 13.4101, lines: ['U8'] },
    { id: 'u8-18', name: 'Schönleinstraße', lat: 52.4943, lng: 13.4225, lines: ['U8'] },
    { id: 'u8-19', name: 'Boddinstraße', lat: 52.4854, lng: 13.4300, lines: ['U8'] },
    { id: 'u8-20', name: 'Leinestraße', lat: 52.4788, lng: 13.4340, lines: ['U8'] },
    { id: 'u8-21', name: 'Hermannstraße', lat: 52.4680, lng: 13.4310, lines: ['U8'] },

    // U9 - Osloer Straße to Rathaus Steglitz
    { id: 'u9-1', name: 'Nauener Platz', lat: 52.5515, lng: 13.3557, lines: ['U9'] },
    { id: 'u9-2', name: 'Amrumer Straße', lat: 52.5443, lng: 13.3494, lines: ['U9'] },
    { id: 'u9-3', name: 'Westhafen', lat: 52.5362, lng: 13.3426, lines: ['U9'] },
    { id: 'u9-4', name: 'Birkenstraße', lat: 52.5333, lng: 13.3476, lines: ['U9'] },
    { id: 'u9-5', name: 'Turmstraße', lat: 52.5261, lng: 13.3408, lines: ['U9'] },
    { id: 'u9-6', name: 'Hansaplatz', lat: 52.5185, lng: 13.3452, lines: ['U9'] },
    { id: 'u9-7', name: 'Kurfürstendamm', lat: 52.5026, lng: 13.3289, lines: ['U9'] },
    { id: 'u9-8', name: 'Güntzelstraße', lat: 52.4910, lng: 13.3248, lines: ['U9'] },
    { id: 'u9-9', name: 'Friedrich-Wilhelm-Platz', lat: 52.4792, lng: 13.3263, lines: ['U9'] },
    { id: 'u9-10', name: 'Walther-Schreiber-Platz', lat: 52.4720, lng: 13.3304, lines: ['U9'] },
    { id: 'u9-11', name: 'Schloßstraße', lat: 52.4657, lng: 13.3234, lines: ['U9'] },
    { id: 'u9-12', name: 'Rathaus Steglitz', lat: 52.4601, lng: 13.3213, lines: ['U9'] },
];

// Get stations for a specific line
export function getStationsForLine(lineName: string): UbahnStation[] {
    return ubahnStations.filter(s => s.lines.includes(lineName));
}

// Get route coordinates for a line (ordered)
export function getLineRoute(lineName: string): [number, number][] {
    const stations = getStationsForLine(lineName);
    // Order stations by their ID number for each line
    const linePrefix = lineName.toLowerCase();
    const ordered = stations
        .filter(s => s.id.startsWith(linePrefix))
        .sort((a, b) => {
            const numA = parseInt(a.id.split('-')[1]);
            const numB = parseInt(b.id.split('-')[1]);
            return numA - numB;
        });
    return ordered.map(s => [s.lat, s.lng]);
}
