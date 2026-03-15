import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ENTITY_COLORS, SEVERITY_COLORS } from '@sentinel/shared';
import type { EntityType, Severity } from '@sentinel/shared';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTimestamp(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().replace('T', ' ').substring(0, 19) + 'Z';
}

export function formatCoordinate(lat: number, lon: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}°${latDir}, ${Math.abs(lon).toFixed(4)}°${lonDir}`;
}

export function formatSpeed(kts: number | undefined | null): string {
  if (kts == null) return '—';
  return `${Math.round(kts)} kts`;
}

export function formatAltitude(m: number | undefined | null): string {
  if (m == null) return '—';
  return `${Math.round(m * 3.281)} ft`;
}

export function entityColor(type: EntityType): string {
  return ENTITY_COLORS[type] || '#6b7280';
}

export function severityColor(severity: Severity): string {
  return SEVERITY_COLORS[severity] || '#6b7280';
}
