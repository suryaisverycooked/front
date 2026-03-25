export type ZoneColor = 'blue' | 'green' | 'red' | 'yellow' | 'purple';

export interface BangaloreLocation {
  name: string;
  zone: string;
  zoneColor: ZoneColor;
  lat: number;
  lng: number;
}

export const BANGALORE_LOCATIONS: BangaloreLocation[] = [
  // ── 🔵 Central Bangalore ──────────────────────────────────────────────────
  { name: 'MG Road',          zone: 'Central Bangalore', zoneColor: 'blue', lat: 12.9757, lng: 77.6011 },
  { name: 'Brigade Road',     zone: 'Central Bangalore', zoneColor: 'blue', lat: 12.9719, lng: 77.6075 },
  { name: 'Indiranagar',      zone: 'Central Bangalore', zoneColor: 'blue', lat: 12.9784, lng: 77.6408 },
  { name: 'Ulsoor (Halasuru)',zone: 'Central Bangalore', zoneColor: 'blue', lat: 12.9799, lng: 77.6174 },
  { name: 'Shivajinagar',     zone: 'Central Bangalore', zoneColor: 'blue', lat: 12.9848, lng: 77.5967 },
  { name: 'Richmond Town',    zone: 'Central Bangalore', zoneColor: 'blue', lat: 12.9609, lng: 77.5997 },
  { name: 'Residency Road',   zone: 'Central Bangalore', zoneColor: 'blue', lat: 12.9685, lng: 77.6049 },
  { name: 'Cubbon Park area', zone: 'Central Bangalore', zoneColor: 'blue', lat: 12.9763, lng: 77.5929 },
  { name: 'Frazer Town',      zone: 'Central Bangalore', zoneColor: 'blue', lat: 12.9901, lng: 77.6115 },
  { name: 'Cox Town',         zone: 'Central Bangalore', zoneColor: 'blue', lat: 12.9923, lng: 77.6179 },
  { name: 'Gandhi Nagar',     zone: 'Central Bangalore', zoneColor: 'blue', lat: 12.9784, lng: 77.5723 },
  { name: 'Chickpet',         zone: 'Central Bangalore', zoneColor: 'blue', lat: 12.9699, lng: 77.5771 },

  // ── 🟢 South Bangalore ───────────────────────────────────────────────────
  { name: 'Jayanagar',            zone: 'South Bangalore', zoneColor: 'green', lat: 12.9304, lng: 77.5827 },
  { name: 'JP Nagar',             zone: 'South Bangalore', zoneColor: 'green', lat: 12.9063, lng: 77.5857 },
  { name: 'Banashankari',         zone: 'South Bangalore', zoneColor: 'green', lat: 12.9255, lng: 77.5468 },
  { name: 'Basavanagudi',         zone: 'South Bangalore', zoneColor: 'green', lat: 12.9413, lng: 77.5739 },
  { name: 'BTM Layout',           zone: 'South Bangalore', zoneColor: 'green', lat: 12.9166, lng: 77.6101 },
  { name: 'Bannerghatta Road',    zone: 'South Bangalore', zoneColor: 'green', lat: 12.8933, lng: 77.5969 },
  { name: 'Kumaraswamy Layout',   zone: 'South Bangalore', zoneColor: 'green', lat: 12.9089, lng: 77.5596 },
  { name: 'Electronic City',      zone: 'South Bangalore', zoneColor: 'green', lat: 12.8459, lng: 77.6603 },
  { name: 'Bommanahalli',         zone: 'South Bangalore', zoneColor: 'green', lat: 12.8977, lng: 77.6412 },
  { name: 'Hulimavu',             zone: 'South Bangalore', zoneColor: 'green', lat: 12.8858, lng: 77.6105 },
  { name: 'Arekere',              zone: 'South Bangalore', zoneColor: 'green', lat: 12.8784, lng: 77.6024 },

  // ── 🔴 East Bangalore (IT Hub) ───────────────────────────────────────────
  { name: 'Whitefield',       zone: 'East Bangalore (IT Hub)', zoneColor: 'red', lat: 12.9698, lng: 77.7500 },
  { name: 'Marathahalli',     zone: 'East Bangalore (IT Hub)', zoneColor: 'red', lat: 12.9591, lng: 77.6974 },
  { name: 'Bellandur',        zone: 'East Bangalore (IT Hub)', zoneColor: 'red', lat: 12.9257, lng: 77.6762 },
  { name: 'Brookefield',      zone: 'East Bangalore (IT Hub)', zoneColor: 'red', lat: 12.9758, lng: 77.7305 },
  { name: 'KR Puram',         zone: 'East Bangalore (IT Hub)', zoneColor: 'red', lat: 13.0070, lng: 77.6934 },
  { name: 'Mahadevapura',     zone: 'East Bangalore (IT Hub)', zoneColor: 'red', lat: 12.9944, lng: 77.7029 },
  { name: 'Varthur',          zone: 'East Bangalore (IT Hub)', zoneColor: 'red', lat: 12.9396, lng: 77.7352 },
  { name: 'Sarjapur Road',    zone: 'East Bangalore (IT Hub)', zoneColor: 'red', lat: 12.9102, lng: 77.6840 },
  { name: 'CV Raman Nagar',   zone: 'East Bangalore (IT Hub)', zoneColor: 'red', lat: 12.9853, lng: 77.6605 },
  { name: 'Hoodi',            zone: 'East Bangalore (IT Hub)', zoneColor: 'red', lat: 12.9924, lng: 77.7148 },

  // ── 🟡 North Bangalore ───────────────────────────────────────────────────
  { name: 'Hebbal',        zone: 'North Bangalore', zoneColor: 'yellow', lat: 13.0354, lng: 77.5970 },
  { name: 'Yelahanka',     zone: 'North Bangalore', zoneColor: 'yellow', lat: 13.1005, lng: 77.5963 },
  { name: 'Devanahalli',   zone: 'North Bangalore', zoneColor: 'yellow', lat: 13.2478, lng: 77.7160 },
  { name: 'Jakkur',        zone: 'North Bangalore', zoneColor: 'yellow', lat: 13.0693, lng: 77.5942 },
  { name: 'Hennur',        zone: 'North Bangalore', zoneColor: 'yellow', lat: 13.0358, lng: 77.6393 },
  { name: 'Thanisandra',   zone: 'North Bangalore', zoneColor: 'yellow', lat: 13.0525, lng: 77.6285 },
  { name: 'RT Nagar',      zone: 'North Bangalore', zoneColor: 'yellow', lat: 13.0208, lng: 77.5933 },
  { name: 'Airport Road',  zone: 'North Bangalore', zoneColor: 'yellow', lat: 13.1986, lng: 77.7066 },
  { name: 'Nagavara',      zone: 'North Bangalore', zoneColor: 'yellow', lat: 13.0459, lng: 77.6174 },

  // ── 🟣 West Bangalore ────────────────────────────────────────────────────
  { name: 'Rajajinagar',        zone: 'West Bangalore', zoneColor: 'purple', lat: 12.9918, lng: 77.5530 },
  { name: 'Vijayanagar',        zone: 'West Bangalore', zoneColor: 'purple', lat: 12.9725, lng: 77.5345 },
  { name: 'Malleshwaram',       zone: 'West Bangalore', zoneColor: 'purple', lat: 13.0031, lng: 77.5705 },
  { name: 'Basaveshwar Nagar',  zone: 'West Bangalore', zoneColor: 'purple', lat: 12.9894, lng: 77.5448 },
  { name: 'Yeshwanthpur',       zone: 'West Bangalore', zoneColor: 'purple', lat: 13.0258, lng: 77.5399 },
  { name: 'Magadi Road',        zone: 'West Bangalore', zoneColor: 'purple', lat: 12.9773, lng: 77.5197 },
  { name: 'Nagarbhavi',         zone: 'West Bangalore', zoneColor: 'purple', lat: 12.9588, lng: 77.5128 },
  { name: 'Kengeri',            zone: 'West Bangalore', zoneColor: 'purple', lat: 12.9146, lng: 77.4849 },
];

// Ordered list of zones for rendering grouped <optgroup> sections
export const ZONE_ORDER: { zone: string; emoji: string; zoneColor: ZoneColor }[] = [
  { zone: 'Central Bangalore',      emoji: '🔵', zoneColor: 'blue'   },
  { zone: 'South Bangalore',        emoji: '🟢', zoneColor: 'green'  },
  { zone: 'East Bangalore (IT Hub)',emoji: '🔴', zoneColor: 'red'    },
  { zone: 'North Bangalore',        emoji: '🟡', zoneColor: 'yellow' },
  { zone: 'West Bangalore',         emoji: '🟣', zoneColor: 'purple' },
];

/** Look up a location by name — returns undefined if not found */
export function findLocation(name: string): BangaloreLocation | undefined {
  return BANGALORE_LOCATIONS.find((l) => l.name === name);
}
