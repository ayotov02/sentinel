-- SENTINEL Database Migration 002
-- pgvector + Sanctions + GPS Jamming + GDELT + Embeddings

-- Vector extension for Nova Multimodal Embeddings semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- ── Sanctions Entries ──────────────────────────────────────
CREATE TABLE sanctions_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  source_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  name TEXT NOT NULL,
  aliases TEXT[] DEFAULT '{}',
  nationality TEXT,
  properties JSONB DEFAULT '{}',
  list_type TEXT,
  listed_date DATE,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source, source_id)
);

CREATE INDEX idx_sanctions_name_trgm ON sanctions_entries USING gin (name gin_trgm_ops);
CREATE INDEX idx_sanctions_source ON sanctions_entries (source);
CREATE INDEX idx_sanctions_type ON sanctions_entries (entity_type);

-- ── Intelligence Embeddings (pgvector) ─────────────────────
CREATE TABLE intelligence_embeddings (
  id SERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  source_url TEXT,
  entity_type VARCHAR(50),
  entity_id UUID,
  metadata JSONB DEFAULT '{}',
  embedding vector(1024) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_embeddings_cosine ON intelligence_embeddings
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_embeddings_entity ON intelligence_embeddings (entity_type);

-- ── GPS Jamming Zones ──────────────────────────────────────
CREATE TABLE gps_jamming_zones (
  detected_at TIMESTAMPTZ NOT NULL,
  h3_cell TEXT NOT NULL,
  h3_resolution INT DEFAULT 5,
  degraded_count INT NOT NULL,
  total_count INT NOT NULL,
  degraded_ratio FLOAT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('NONE', 'POSSIBLE', 'PROBABLE', 'CONFIRMED')),
  sample_aircraft JSONB DEFAULT '[]',
  UNIQUE(h3_cell, detected_at)
);

SELECT create_hypertable('gps_jamming_zones', 'detected_at',
  chunk_time_interval => INTERVAL '1 day');

CREATE INDEX idx_jamming_cell ON gps_jamming_zones (h3_cell, detected_at DESC);
CREATE INDEX idx_jamming_severity ON gps_jamming_zones (severity) WHERE severity != 'NONE';

-- ── GDELT Events ───────────────────────────────────────────
CREATE TABLE gdelt_events (
  id SERIAL PRIMARY KEY,
  gdelt_url TEXT UNIQUE,
  title TEXT NOT NULL,
  source_name TEXT,
  source_country TEXT,
  language TEXT,
  tone FLOAT,
  positive_score FLOAT,
  negative_score FLOAT,
  themes TEXT[] DEFAULT '{}',
  locations JSONB DEFAULT '[]',
  persons TEXT[] DEFAULT '{}',
  organizations TEXT[] DEFAULT '{}',
  image_url TEXT,
  published_at TIMESTAMPTZ,
  ingested_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gdelt_time ON gdelt_events (published_at DESC);
CREATE INDEX idx_gdelt_themes ON gdelt_events USING gin (themes);
CREATE INDEX idx_gdelt_persons ON gdelt_events USING gin (persons);
CREATE INDEX idx_gdelt_orgs ON gdelt_events USING gin (organizations);

-- ── AIS Gap Detection (Dark Vessels) ───────────────────────
CREATE TABLE ais_gaps (
  id SERIAL PRIMARY KEY,
  entity_id VARCHAR(100) NOT NULL,
  gap_start TIMESTAMPTZ NOT NULL,
  gap_end TIMESTAMPTZ,
  duration_hours FLOAT,
  last_known_lat DOUBLE PRECISION,
  last_known_lon DOUBLE PRECISION,
  last_known_speed REAL,
  reappear_lat DOUBLE PRECISION,
  reappear_lon DOUBLE PRECISION,
  implied_speed_kts REAL,
  suspicious BOOLEAN DEFAULT FALSE,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ais_gaps_entity ON ais_gaps (entity_id, gap_start DESC);
CREATE INDEX idx_ais_gaps_suspicious ON ais_gaps (suspicious) WHERE suspicious = TRUE;

-- ── STS Transfer Events ────────────────────────────────────
CREATE TABLE sts_transfers (
  id SERIAL PRIMARY KEY,
  vessel1_id VARCHAR(100) NOT NULL,
  vessel2_id VARCHAR(100) NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  lat DOUBLE PRECISION NOT NULL,
  lon DOUBLE PRECISION NOT NULL,
  min_distance_m REAL,
  duration_hours FLOAT,
  risk_score INT DEFAULT 0,
  risk_factors TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sts_vessels ON sts_transfers (vessel1_id, vessel2_id);
CREATE INDEX idx_sts_time ON sts_transfers (start_time DESC);
CREATE INDEX idx_sts_risk ON sts_transfers (risk_score DESC) WHERE risk_score > 50;

-- ── Update db:migrate script to run both migrations ────────
-- The API package.json db:migrate script should be updated to run both 001 and 002
