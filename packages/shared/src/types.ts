// ── Entity Types ──────────────────────────────────────────────

export type EntityType =
  | 'aircraft'
  | 'vessel'
  | 'satellite'
  | 'person'
  | 'organization'
  | 'location'
  | 'event'
  | 'document';

export const EntityTypes: EntityType[] = [
  'aircraft',
  'vessel',
  'satellite',
  'person',
  'organization',
  'location',
  'event',
  'document',
];

export interface Entity {
  id: string;
  entityType: EntityType;
  entityId: string;
  displayName: string;
  properties: Record<string, unknown>;
  source: string;
  confidence: number;
  firstSeen: string;
  lastSeen: string;
  lat?: number;
  lon?: number;
  altitude?: number;
  heading?: number;
  speed?: number;
  metadata?: Record<string, unknown>;
}

// ── Telemetry ────────────────────────────────────────────────

export interface EntityPosition {
  time: string;
  entityId: string;
  entityType: EntityType;
  lat: number;
  lon: number;
  altitudeM?: number;
  heading?: number;
  speedKts?: number;
  source?: string;
  confidence?: number;
  rawData?: Record<string, unknown>;
}

// ── Events ───────────────────────────────────────────────────

export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Event {
  id: string;
  eventType: string;
  subType?: string;
  description: string;
  lat?: number;
  lon?: number;
  timestamp: string;
  severity: Severity;
  confidence: number;
  source: string;
  actor1?: string;
  actor2?: string;
  fatalities?: number;
  properties: Record<string, unknown>;
}

// ── Alerts ───────────────────────────────────────────────────

export type AlertStatus = 'NEW' | 'ACKNOWLEDGED' | 'ESCALATED' | 'DISMISSED';

export interface Alert {
  id: string;
  alertType: string;
  severity: Severity;
  title: string;
  description?: string;
  entityId?: string;
  lat?: number;
  lon?: number;
  status: AlertStatus;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  dismissNote?: string;
  properties: Record<string, unknown>;
  createdAt: string;
}

export type AlertRuleType =
  | 'geofence'
  | 'attribute'
  | 'correlation'
  | 'pattern'
  | 'proximity';

export interface AlertRule {
  id: string;
  name: string;
  ruleType: AlertRuleType;
  entityFilter: Record<string, unknown>;
  triggerCondition: Record<string, unknown>;
  severity: Severity;
  notificationChannels: string[];
  enabled: boolean;
  lastFired?: string;
  fireCount: number;
  createdBy?: string;
  createdAt: string;
}

// ── Cases ────────────────────────────────────────────────────

export type CaseStatus = 'OPEN' | 'IN_PROGRESS' | 'CLOSED' | 'ARCHIVED';
export type Classification = 'UNCLASSIFIED' | 'CUI' | 'SECRET' | 'TOP_SECRET';

export interface Case {
  id: string;
  name: string;
  description?: string;
  status: CaseStatus;
  classification: Classification;
  owner?: string;
  teamMembers: string[];
  entityIds: string[];
  properties: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CaseActivity {
  id: string;
  caseId: string;
  action: string;
  actor: string;
  description?: string;
  properties: Record<string, unknown>;
  createdAt: string;
}

// ── Relationships ────────────────────────────────────────────

export interface Relationship {
  id: string;
  sourceEntityId: string;
  targetEntityId: string;
  relationshipType: string;
  confidence: number;
  properties: Record<string, unknown>;
  source?: string;
  firstSeen: string;
  lastSeen: string;
}

// ── Ingestion ────────────────────────────────────────────────

export type IngestionStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'REVIEW'
  | 'CONFIRMED'
  | 'FAILED';

export interface IngestionJob {
  id: string;
  filename?: string;
  fileType?: string;
  status: IngestionStatus;
  entityCount: number;
  rawText?: string;
  extractedEntities?: Record<string, unknown>[];
  confirmedEntities?: Record<string, unknown>[];
  error?: string;
  createdAt: string;
  completedAt?: string;
}

// ── Users ────────────────────────────────────────────────────

export type UserRole = 'admin' | 'analyst' | 'viewer';

export interface User {
  id: string;
  email: string;
  displayName?: string;
  role: UserRole;
  avatarColor: string;
  preferences: Record<string, unknown>;
  createdAt: string;
}

// ── Audit ────────────────────────────────────────────────────

export interface AuditEntry {
  id: string;
  actor: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  details: Record<string, unknown>;
  ipAddress?: string;
  createdAt: string;
}

// ── AI ───────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations?: string[];
  timestamp: string;
  model?: string;
}

export interface BriefingSection {
  title: string;
  content: string;
  entities?: string[];
  confidence?: number;
}

// ── Geospatial ───────────────────────────────────────────────

export interface ViewportBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface H3Cell {
  index: string;
  resolution: number;
}

// ── WebSocket ────────────────────────────────────────────────

export const WebSocketEvents = {
  VIEWPORT_UPDATE: 'viewport:update',
  ENTITY_UPDATE: 'entity:update',
  ENTITY_BATCH: 'entity:batch',
  ALERT_NEW: 'alert:new',
  PRESENCE_UPDATE: 'presence:update',
  COLLABORATION_CURSOR: 'collaboration:cursor',
} as const;

// ── OSINT ────────────────────────────────────────────────────

export interface OsintSourceConfig {
  name: string;
  type: string;
  pollIntervalMs: number;
  enabled: boolean;
  apiKeyEnvVar?: string;
  baseUrl: string;
}

// ── Nova Models ──────────────────────────────────────────────

export const NovaModel = {
  LITE: 'amazon.nova-2-lite-v1:0',
  SONIC: 'amazon.nova-2-sonic-v1:0',
  PRO: 'amazon.nova-pro-v1:0',
  PREMIER: 'amazon.nova-premier-v1:0',
  CANVAS: 'amazon.nova-canvas-v1:0',
  REEL: 'amazon.nova-reel-v1:1',
  ACT: 'nova-act',
  EMBEDDINGS: 'amazon.nova-2-multimodal-embeddings-v1:0',
} as const;
