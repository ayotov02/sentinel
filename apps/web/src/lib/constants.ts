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
