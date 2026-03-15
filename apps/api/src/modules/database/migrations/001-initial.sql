-- SENTINEL Database Schema
-- TimescaleDB + PostGIS + pg_trgm

CREATE EXTENSION IF NOT EXISTS timescaledb;
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ── Entity Registry ──────────────────────────────────────────

CREATE TABLE entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(20) NOT NULL,
  entity_id VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(255),
  properties JSONB DEFAULT '{}',
  source VARCHAR(50),
  confidence REAL DEFAULT 1.0,
  first_seen TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_entities_type ON entities(entity_type);
CREATE INDEX idx_entities_name ON entities USING gin(display_name gin_trgm_ops);

-- ── Telemetry Hypertable ─────────────────────────────────────

CREATE TABLE entity_positions (
  time TIMESTAMPTZ NOT NULL,
  entity_id VARCHAR(100) NOT NULL,
  entity_type VARCHAR(20) NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lon DOUBLE PRECISION NOT NULL,
  altitude_m REAL,
  heading REAL,
  speed_kts REAL,
  source VARCHAR(50),
  confidence REAL DEFAULT 1.0,
  raw_data JSONB
);

SELECT create_hypertable('entity_positions', 'time', chunk_time_interval => INTERVAL '1 hour');

CREATE INDEX idx_positions_entity ON entity_positions(entity_id, time DESC);
CREATE INDEX idx_positions_geom ON entity_positions USING GIST(ST_Point(lon, lat));

-- ── Continuous Aggregate: Hourly Summaries ───────────────────

CREATE MATERIALIZED VIEW entity_hourly_summary
WITH (timescaledb.continuous) AS
SELECT
  entity_id,
  entity_type,
  time_bucket('1 hour', time) AS bucket,
  AVG(lat) AS avg_lat,
  AVG(lon) AS avg_lon,
  AVG(speed_kts) AS avg_speed,
  MAX(speed_kts) AS max_speed,
  COUNT(*) AS observation_count,
  AVG(heading) AS avg_heading
FROM entity_positions
GROUP BY entity_id, entity_type, bucket
WITH NO DATA;

SELECT add_continuous_aggregate_policy('entity_hourly_summary',
  start_offset => INTERVAL '3 hours',
  end_offset   => INTERVAL '1 hour',
  schedule_interval => INTERVAL '1 hour');

-- ── Compression + Retention ──────────────────────────────────

ALTER TABLE entity_positions SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'entity_id',
  timescaledb.compress_orderby = 'time DESC'
);

SELECT add_compression_policy('entity_positions', INTERVAL '7 days');
SELECT add_retention_policy('entity_positions', INTERVAL '90 days');

-- ── Events ───────────────────────────────────────────────────

CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(50) NOT NULL,
  sub_type VARCHAR(50),
  description TEXT,
  lat DOUBLE PRECISION,
  lon DOUBLE PRECISION,
  timestamp TIMESTAMPTZ NOT NULL,
  severity VARCHAR(20) DEFAULT 'LOW',
  confidence REAL DEFAULT 1.0,
  source VARCHAR(50),
  actor1 VARCHAR(255),
  actor2 VARCHAR(255),
  fatalities INTEGER DEFAULT 0,
  properties JSONB DEFAULT '{}'
);

CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_time ON events(timestamp DESC);
CREATE INDEX idx_events_geom ON events USING GIST(ST_Point(lon, lat));

-- ── Alerts ───────────────────────────────────────────────────

CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  entity_id VARCHAR(100),
  lat DOUBLE PRECISION,
  lon DOUBLE PRECISION,
  status VARCHAR(20) DEFAULT 'NEW',
  acknowledged_by VARCHAR(100),
  acknowledged_at TIMESTAMPTZ,
  dismiss_note TEXT,
  properties JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Alert Rules ──────────────────────────────────────────────

CREATE TABLE alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  rule_type VARCHAR(50) NOT NULL,
  entity_filter JSONB DEFAULT '{}',
  trigger_condition JSONB NOT NULL,
  severity VARCHAR(20) DEFAULT 'MEDIUM',
  notification_channels TEXT[] DEFAULT '{"inbox"}',
  enabled BOOLEAN DEFAULT TRUE,
  last_fired TIMESTAMPTZ,
  fire_count INTEGER DEFAULT 0,
  created_by VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Cases ────────────────────────────────────────────────────

CREATE TABLE cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'OPEN',
  classification VARCHAR(20) DEFAULT 'UNCLASSIFIED',
  owner VARCHAR(100),
  team_members TEXT[] DEFAULT '{}',
  entity_ids TEXT[] DEFAULT '{}',
  properties JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Case Activities ──────────────────────────────────────────

CREATE TABLE case_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  actor VARCHAR(100) NOT NULL,
  description TEXT,
  properties JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Relationships ────────────────────────────────────────────

CREATE TABLE relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_entity_id VARCHAR(100) NOT NULL,
  target_entity_id VARCHAR(100) NOT NULL,
  relationship_type VARCHAR(50) NOT NULL,
  confidence REAL DEFAULT 1.0,
  properties JSONB DEFAULT '{}',
  source VARCHAR(50),
  first_seen TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rel_source ON relationships(source_entity_id);
CREATE INDEX idx_rel_target ON relationships(target_entity_id);

-- ── Ingestion Jobs ───────────────────────────────────────────

CREATE TABLE ingestion_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename VARCHAR(255),
  file_type VARCHAR(50),
  status VARCHAR(20) DEFAULT 'PENDING',
  entity_count INTEGER DEFAULT 0,
  raw_text TEXT,
  extracted_entities JSONB,
  confirmed_entities JSONB,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ── Audit Log ────────────────────────────────────────────────

CREATE TABLE audit_log (
  id BIGSERIAL PRIMARY KEY,
  actor VARCHAR(100) NOT NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id VARCHAR(100),
  details JSONB DEFAULT '{}',
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_actor ON audit_log(actor, created_at DESC);

-- ── Users ────────────────────────────────────────────────────

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(100),
  role VARCHAR(20) DEFAULT 'analyst',
  avatar_color VARCHAR(7) DEFAULT '#3b82f6',
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
