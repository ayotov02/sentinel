export { ENTITY_COLORS, ENTITY_ICONS, SEVERITY_COLORS, CLASSIFICATION_COLORS, H3_RESOLUTION, OSINT_SOURCES, WS_EVENTS, NOVA_MODELS } from '@sentinel/shared';

export const NAV_ITEMS = [
  { id: 'globe', label: 'Globe', icon: 'Globe', path: '/' },
  { id: 'graph', label: 'Graph', icon: 'GitFork', path: '/graph' },
  { id: 'timeline', label: 'Timeline', icon: 'Clock', path: '/timeline' },
  { id: 'cases', label: 'Cases', icon: 'Briefcase', path: '/cases' },
  { id: 'alerts', label: 'Alerts', icon: 'Bell', path: '/alerts' },
  { id: 'search', label: 'Search', icon: 'Search', path: '/search' },
  { id: 'ingestion', label: 'Ingestion', icon: 'Upload', path: '/ingestion' },
  { id: 'admin', label: 'Admin', icon: 'Settings', path: '/admin' },
] as const;

export const DEFAULT_MAP_CENTER = { lat: 35, lon: 35 };

export const ANIMATION_SPEEDS = [1, 2, 5, 10, 50];

export const GPS_JAMMING_COLORS: Record<string, string> = {
  low: '#fbbf24',
  medium: '#f97316',
  high: '#ef4444',
  severe: '#dc2626',
};

export const SOURCE_STATUS_COLORS: Record<string, string> = {
  healthy: '#22c55e',
  degraded: '#f59e0b',
  circuit_open: '#ef4444',
  idle: '#6b7280',
};
