# SENTINEL — OSINT Intelligence Platform

> Real-time geospatial intelligence platform built on AWS. Combines 8 live OSINT data sources with Amazon Nova AI for entity extraction, link analysis, and threat correlation.

**Built for the AWS + Amazon Nova Hackathon — March 2026**

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                      React SPA (Vite)                            │
│  CesiumJS + deck.gl │ React Flow + Dagre │ BlockNote │ shadcn/ui │
├──────────────────────────────────────────────────────────────────┤
│               NestJS Modular Monolith API (16 modules)           │
│  REST + Socket.IO + SSE Streaming + Protobuf Binary Frames       │
├──────────┬──────────┬──────────┬──────────┬──────────────────────┤
│TimescaleDB│ Memgraph │  Redis   │ Y-Sweet  │ AWS Bedrock          │
│ + PostGIS │  (Graph) │ (PubSub) │  (CRDT)  │ (8 Nova Models)     │
│ + pgvector│          │          │          │ + OpenSanctions      │
└──────────┴──────────┴──────────┴──────────┴──────────────────────┘
```

## 8 Amazon Nova AI Models

| Model | ID | Use Case |
|-------|----|----------|
| Nova 2 Lite | `amazon.nova-2-lite-v1:0` | Entity extraction from GDELT articles (forced tool call, structured outputs) |
| Nova 2 Sonic | `amazon.nova-2-sonic-v1:0` | Voice AI interface — bidirectional HTTP/2 streaming for hands-free analysis |
| Nova Pro | `amazon.nova-pro-v1:0` | Multimodal analysis (images, video, 300K context), real-time chat assistant |
| Nova Premier | `amazon.nova-premier-v1:0` | Deep reasoning orchestrator (1M context), intelligence briefing generation |
| Nova Canvas | `amazon.nova-canvas-v1:0` | Image generation/editing for satellite imagery annotation |
| Nova Reel | `amazon.nova-reel-v1:1` | Video generation (async, S3 output) for incident reconstruction |
| Nova Act | `nova-act` | OSINT web automation — Equasis vessel lookup, OpenCorporates company search |
| Nova Embeddings | `amazon.nova-2-multimodal-embeddings-v1:0` | Cross-modal semantic search via pgvector |

## 8 Live OSINT Data Sources

| Source | Data | API | Key Required |
|--------|------|-----|-------------|
| Airplanes.live | Aircraft ADS-B positions | REST (15s poll) | No |
| AISStream.io | Vessel AIS positions | WebSocket (real-time) | Yes |
| GDELT Project | Global news events | REST (15 min poll) | No |
| ACLED | Conflict events | REST (daily) | Yes (free) |
| USGS/NOAA | Earthquakes, weather | REST | No |
| IODA | Internet outages | REST (5 min) | No |
| Space-Track / CelesTrak | Satellite TLEs | REST (hourly) | Yes (free) |
| FAA NOTAMs | Airspace notices | REST (15 min) | Yes (free) |
| NASA FIRMS | Fire hotspots | REST (30 min) | Yes (free) |

## Intelligence Features

- **GPS Jamming Detection** — NACp degradation analysis from ADS-B data, correlated with NOTAMs for military exercise identification
- **Dark Vessel Detection** — AIS gap analysis (>6h), Ship-to-Ship (STS) transfer proximity detection, flag risk scoring
- **Cross-Source Correlation** — GPS jamming + NOTAM = military; Internet outage + conflict = escalation; Dark vessel + fire = sanctions evasion
- **GDELT Entity Extraction Pipeline** — 15-min cron: fetch articles → Nova 2 Lite extraction → PostgreSQL/Memgraph → sanctions screening → pgvector indexing
- **Sanctions Screening** — OpenSanctions + OFAC/UN lists integration
- **Semantic Search** — pgvector embeddings via Nova Multimodal Embeddings

## Quick Start

### Prerequisites
- Node.js 20+ / pnpm 9+
- Docker & Docker Compose
- AWS credentials with Bedrock access (for AI features)

### API Keys (register for free)

| Service | Environment Variable | Registration |
|---------|---------------------|--------------|
| AISStream.io | `AISSTREAM_API_KEY` | https://aisstream.io |
| ACLED | `ACLED_EMAIL` / `ACLED_KEY` | https://acleddata.com/register |
| Space-Track | `SPACETRACK_USERNAME` / `SPACETRACK_PASSWORD` | https://www.space-track.org/auth/createAccount |
| FAA NOTAMs | `FAA_API_KEY` | https://api.faa.gov |
| NASA FIRMS | `FIRMS_MAP_KEY` | https://firms.modaps.eosdis.nasa.gov/api |

### Setup

```bash
# Clone
git clone https://github.com/ayotov02/sentinel.git
cd sentinel

# Copy environment variables
cp .env.example .env
# Edit .env with your API keys (optional — app works with Airplanes.live + GDELT without keys)

# Start infrastructure (TimescaleDB, Redis, Memgraph, Y-Sweet)
docker compose up -d

# Install dependencies
pnpm install

# Run database migrations
pnpm --filter api run db:migrate

# Seed default users and alert rules
pnpm --filter api run db:seed

# Start API server (port 3000) — OSINT polling begins automatically
pnpm --filter api run start:dev

# Start web app (port 5173) — dark globe loads with CartoDB tiles (no Ion token)
pnpm --filter web run dev
```

### Default Users
| Email | Password | Role |
|-------|----------|------|
| admin@sentinel.io | sentinel123 | admin |
| analyst1@sentinel.io | sentinel123 | analyst |
| analyst2@sentinel.io | sentinel123 | analyst |

## Demo Walkthrough

1. **Globe View** — Dark CesiumJS globe loads with CartoDB tiles. Aircraft appear within 15s from Airplanes.live (no API key needed). GDELT events populate within 15 minutes.

2. **Entity Tracking** — Click any entity on the globe to see its profile card. Entity positions stream via WebSocket into typed-array buffers (50K+ entity capacity at 60fps).

3. **Link Analysis** — Switch to Graph view. Click "Dagre Layout" for automatic hierarchical layout. "Detect Communities" highlights entity clusters. "Shortest Path" finds connections.

4. **AI Assistant** — Open the Nova chat panel (Ctrl+/). Ask questions about tracked entities. Nova Pro streams responses with tool calls for entity lookup and sanctions screening.

5. **Voice Interface** — Click the microphone button. Audio captures at 16kHz mono PCM and streams to Nova Sonic for real-time voice interaction.

6. **Briefing Editor** — BlockNote collaborative editor with Y-Sweet CRDT sync. Multiple analysts can edit simultaneously. Export to PDF.

7. **Intelligence Alerts** — GPS jamming zones auto-detect from NACp degradation. Dark vessel alerts fire for AIS gaps >6h. Cross-source correlations generate CRITICAL alerts.

8. **Sanctions Screening** — Search any entity name against OpenSanctions. Global search has a "Sanctions Check" button for one-click screening.

## Monorepo Structure

```
sentinel/
├── apps/
│   ├── web/               # React SPA (Vite + TypeScript)
│   │   └── src/
│   │       ├── components/    # 79 components across 14 domains
│   │       ├── views/         # 10 page views
│   │       ├── stores/        # Zustand state (entity, UI, filter)
│   │       ├── hooks/         # Custom hooks (WebSocket, Cesium, entities, chat)
│   │       └── lib/           # API client, entity buffer, utilities, constants
│   └── api/               # NestJS modular monolith
│       └── src/
│           └── modules/       # 16 feature modules
│               ├── auth/          # JWT authentication
│               ├── entities/      # Entity CRUD + search
│               ├── timeseries/    # TimescaleDB + PostGIS queries
│               ├── graph/         # Memgraph Bolt driver
│               ├── osint/         # 8 OSINT sources + GPS jamming + dark vessel + correlation + GDELT pipeline
│               ├── ai/            # Bedrock + 8 Nova models
│               ├── gateway/       # Socket.IO WebSocket gateway
│               ├── cases/         # Investigation management
│               ├── alerts/        # Rule engine + watchlists
│               ├── search/        # Cross-table full-text search
│               ├── ingestion/     # File upload + entity extraction
│               ├── collaboration/ # Y-Sweet token management
│               ├── sanctions/     # OpenSanctions + OFAC/UN screening
│               ├── voice/         # Nova Sonic voice gateway
│               ├── embeddings/    # pgvector + Nova Embeddings
│               └── database/      # PostgreSQL pool + migrations
├── packages/
│   └── shared/            # Shared types, constants, protobuf schema
├── scripts/
│   ├── seed-data.ts           # Default users, alert rules, sample case
│   ├── init-memgraph.cypher   # Graph DB indices
│   └── nova-act/              # Nova Act web automation scripts
│       ├── maritime_registry.py   # Equasis vessel lookup
│       └── company_lookup.py      # OpenCorporates company search
└── docker-compose.yml         # TimescaleDB, Redis, Memgraph, Y-Sweet
```

## Infrastructure

### Docker Services
| Service | Port | Image |
|---------|------|-------|
| PostgreSQL + TimescaleDB + pgvector | 5432 | timescale/timescaledb-ha:pg17-latest |
| Redis | 6379 | redis:7.4-alpine |
| Memgraph | 7687 | memgraph/memgraph-mage:latest |
| Memgraph Lab | 3001 | memgraph/lab:latest |
| Y-Sweet | 8080 | jamsocket/y-sweet:latest |

### Database Schema Highlights
- **entity_positions**: TimescaleDB hypertable with 1-hour chunks, compression (7d), retention (90d)
- **gps_jamming_zones**: TimescaleDB hypertable tracking GPS interference zones
- **ais_gaps / sts_transfers**: Dark vessel detection tables
- **sanctions_entries**: OpenSanctions + OFAC/UN SDN list with fuzzy matching
- **entity_embeddings**: pgvector for semantic search (1024-dim Nova embeddings)
- **PostGIS**: GIST indexes on `ST_Point(lon, lat)` for proximity queries
- **pg_trgm**: Trigram indexes for fuzzy entity name search

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` / `Cmd+K` | Open search |
| `Ctrl+/` | Toggle AI chat panel |
| `Ctrl+1-8` | Switch between views |
| `Escape` | Close panels / deselect |
| `Ctrl+Shift+D` | Toggle dark mode |
| `Ctrl+Shift+L` | Toggle layer panel |

## License

MIT
