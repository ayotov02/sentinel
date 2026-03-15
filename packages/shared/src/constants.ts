import type { EntityType, Severity, Classification, OsintSourceConfig } from './types.js';
import { WebSocketEvents, NovaModel } from './types.js';

// ── Entity Colors ────────────────────────────────────────────

export const ENTITY_COLORS: Record<EntityType, string> = {
  aircraft: '#3b82f6',
  vessel: '#10b981',
  satellite: '#8b5cf6',
  person: '#f59e0b',
  organization: '#ef4444',
  location: '#06b6d4',
  event: '#f97316',
  document: '#6b7280',
};

export const ENTITY_ICONS: Record<EntityType, string> = {
  aircraft: 'plane',
  vessel: 'ship',
  satellite: 'satellite',
  person: 'user',
  organization: 'building-2',
  location: 'map-pin',
  event: 'zap',
  document: 'file-text',
};

// ── Severity Colors ──────────────────────────────────────────

export const SEVERITY_COLORS: Record<Severity, string> = {
  LOW: '#22c55e',
  MEDIUM: '#f59e0b',
  HIGH: '#ef4444',
  CRITICAL: '#dc2626',
};

// ── Classification Colors ────────────────────────────────────

export const CLASSIFICATION_COLORS: Record<Classification, string> = {
  UNCLASSIFIED: '#22c55e',
  CUI: '#f59e0b',
  SECRET: '#ef4444',
  TOP_SECRET: '#dc2626',
};

// ── H3 ───────────────────────────────────────────────────────

export const H3_RESOLUTION = 4;

// ── OSINT Poll Intervals (ms) ────────────────────────────────

export const DEFAULT_POLL_INTERVALS: Record<string, number> = {
  opensky: 10_000,
  'adsb-exchange': 5_000,
  aishub: 60_000,
  acled: 86_400_000,
  ioda: 300_000,
  spacetrack: 3_600_000,
  notam: 900_000,
  firms: 1_800_000,
};

// ── OSINT Sources ────────────────────────────────────────────

export const OSINT_SOURCES: OsintSourceConfig[] = [
  {
    name: 'OpenSky Network',
    type: 'opensky',
    pollIntervalMs: 10_000,
    enabled: true,
    apiKeyEnvVar: 'OPENSKY_CLIENT_ID',
    baseUrl: 'https://opensky-network.org/api',
  },
  {
    name: 'ADS-B Exchange',
    type: 'adsb-exchange',
    pollIntervalMs: 5_000,
    enabled: true,
    apiKeyEnvVar: 'RAPIDAPI_KEY',
    baseUrl: 'https://adsbexchange-com1.p.rapidapi.com',
  },
  {
    name: 'AISHub',
    type: 'aishub',
    pollIntervalMs: 60_000,
    enabled: true,
    apiKeyEnvVar: 'AISHUB_USERNAME',
    baseUrl: 'https://data.aishub.net/ws.php',
  },
  {
    name: 'ACLED',
    type: 'acled',
    pollIntervalMs: 86_400_000,
    enabled: true,
    apiKeyEnvVar: 'ACLED_EMAIL',
    baseUrl: 'https://api.acleddata.com/acled/read',
  },
  {
    name: 'IODA',
    type: 'ioda',
    pollIntervalMs: 300_000,
    enabled: true,
    baseUrl: 'https://api.ioda.inetintel.cc.gatech.edu/v2',
  },
  {
    name: 'Space-Track',
    type: 'spacetrack',
    pollIntervalMs: 3_600_000,
    enabled: true,
    apiKeyEnvVar: 'SPACETRACK_USERNAME',
    baseUrl: 'https://www.space-track.org',
  },
  {
    name: 'FAA NOTAM',
    type: 'notam',
    pollIntervalMs: 900_000,
    enabled: true,
    apiKeyEnvVar: 'FAA_API_KEY',
    baseUrl: 'https://external-api.faa.gov/notamapi/v1',
  },
  {
    name: 'NASA FIRMS',
    type: 'firms',
    pollIntervalMs: 1_800_000,
    enabled: true,
    apiKeyEnvVar: 'FIRMS_MAP_KEY',
    baseUrl: 'https://firms.modaps.eosdis.nasa.gov/api',
  },
];

// ── Re-exports ───────────────────────────────────────────────

export { WebSocketEvents as WS_EVENTS } from './types.js';
export { NovaModel as NOVA_MODELS } from './types.js';
