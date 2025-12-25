export interface City {
    name: string;
    lat: number;
    lng: number;
}

export const majorCities: City[] = [
    { name: 'Berlin', lat: 52.5200, lng: 13.4050 },
    { name: 'Hamburg', lat: 53.5511, lng: 9.9937 },
    { name: 'Munich', lat: 48.1351, lng: 11.5820 },
    { name: 'Cologne', lat: 50.9375, lng: 6.9603 },
    { name: 'Frankfurt', lat: 50.1109, lng: 8.6821 },
    { name: 'Stuttgart', lat: 48.7758, lng: 9.1829 },
    { name: 'Düsseldorf', lat: 51.2277, lng: 6.7735 },
    { name: 'Dortmund', lat: 51.5136, lng: 7.4653 },
    { name: 'Essen', lat: 51.4556, lng: 7.0116 },
    { name: 'Leipzig', lat: 51.3397, lng: 12.3731 },
    { name: 'Bremen', lat: 53.0793, lng: 8.8017 },
    { name: 'Dresden', lat: 51.0504, lng: 13.7373 },
    { name: 'Hanover', lat: 52.3759, lng: 9.7320 },
    { name: 'Nuremberg', lat: 49.4521, lng: 11.0767 }
];
