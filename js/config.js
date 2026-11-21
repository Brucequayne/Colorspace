// Anarchy Frankfurt – zentrale Einstellungen
export const CFG = {
  VERSION: '0.1-editor',
  THETA_DEG: 48,          // Kameraneigung
  PPM: 12,                // Pixel pro Meter (nativ)
  WORLD_HALF: 12500,      // 25 x 25 km Karte -> +-12,5 km um den Mittelpunkt
  CENTER: { lat: 50.1210, lon: 8.6360 }, // Mitte von Frankfurt (Stadtgebiet passt komplett rein)
  ROT_STEPS: 24,          // 15°-Schritte
  TILE_PX: 256,           // Render-Kacheln (nativ)
  TILE_CACHE: 280,
  OSM_TILE_M: 1000,       // OSM-Ladekacheln 1 x 1 km
  SUN: [-0.35, 0.55, 0.75],
  ZOOMS: [1 / 32, 1 / 16, 1 / 8, 1 / 4, 1 / 2, 1, 2, 3, 4, 6],
  START_ZOOM: 2,
  OVERPASS: [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
  ],
  PLACES: [
    ['Römer', 50.1106, 8.6821],
    ['Hauptwache', 50.1141, 8.6789],
    ['Konstablerwache', 50.1148, 8.6866],
    ['Hauptbahnhof', 50.1070, 8.6633],
    ['Alt-Sachsenhausen', 50.1037, 8.6903],
    ['Bornheim (Berger Str.)', 50.1262, 8.7090],
    ['Nordend', 50.1250, 8.6900],
    ['Westend', 50.1190, 8.6620],
    ['Messe', 50.1118, 8.6455],
    ['Zoo', 50.1163, 8.6990],
    ['Osthafen', 50.1105, 8.7230],
    ['Höchst', 50.1000, 8.5430],
    ['Stadtwald', 50.0750, 8.6400],
    ['Flughafen', 50.0379, 8.5622]
  ]
};
