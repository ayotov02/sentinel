# SENTINEL — OSINT Intelligence Platform

A full-scope open-source intelligence (OSINT) platform for real-time geospatial tracking, link analysis, and AI-powered intelligence workflows. Built on AWS with Amazon Nova AI models, CesiumJS 3D globe, and a modern React + NestJS stack.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     React SPA (Vite)                        │
│  CesiumJS + deck.gl │ React Flow │ BlockNote │ shadcn/ui    │
├─────────────────────────────────────────────────────────────┤
│              NestJS Modular Monolith API                    │
│  REST + Socket.IO + SSE Streaming + Protobuf Binary Frames  │
├──────────┬──────────┬──────────┬──────────┬─────────────────┤
│TimescaleDB│ Memgraph │  Redis   │ Y-Sweet  │ AWS Bedrock     │
│ + PostGIS │  (Graph) │ (PubSub) │  (CRDT)  │ (8 Nova Models) │
└──────────┴──────────┴──────────┴──────────┴─────────────────┘
```

## Features

### 11 UI Modules
1. **Command Center** — 3D globe (CesiumJS + deck.gl) with live entity tracking
2. **Link Analysis Canvas** — Graph visualization (React Flow) with PageRank, community detection
3. **Timeline View** — Horizontal event timeline with minute-to-year zoom
4. **Investigation Workspace** — Case management with Yjs collaborative editing
5. **Alert & Watchlist Engine** — Rule builder (geofence, attribute, correlation, pattern, proximity)
6. **Entity Profile** — Detailed entity view with properties, timeline, relationships
7. **Unstructured Data Ingestion** — Drag-drop upload with AI entity extraction review
8. **Global Search** — Faceted search with autocomplete across all entity types
9. **Pattern of Life Analyzer** — Movement heatmaps, anomaly detection, route comparison
10. **AI Intelligence Assistant** — Chat with Nova Pro, briefing generation with Nova Premier
11. **Admin & Settings** — Data source health, user management, audit log

### 8 Amazon Nova AI Models
| Model | Use Case |
|-------|----------|
| Nova 2 Lite | Entity extraction (structured outputs, extended thinking) |
| Nova 2 Sonic | Voice AI interface (bidirectional HTTP/2 streaming) |
| Nova Pro | Multimodal analysis (images, video, 300K context) |
| Nova Premier | Deep reasoning orchestrator (1M context, briefings) |
| Nova Canvas | Image generation/editing (satellite annotation) |
| Nova Reel | Video generation (async, S3 output) |
| Nova Act | OSINT web automation agents |
| Nova Multimodal Embeddings | Cross-modal semantic search |

### 8 OSINT Data Sources
| Source | Data Type | Polling Interval |
|--------|-----------|------------------|
| OpenSky Network | Aircraft ADS-B | 10s |
| ADS-B Exchange | Aircraft (extended) | 5s |
| AISHub | Vessel AIS | 60s |
| ACLED | Conflict events | Daily |
| IODA | Internet outages | 5min |
| Space-Track | Satellite TLE | Hourly |
| FAA NOTAM | Airspace notices | 15min |
| NASA FIRMS | Fire hotspots | 30min |

## Tech Stack

- **Frontend:** React 18.3, Vite 6, TypeScript, TailwindCSS, shadcn/ui, Zustand, TanStack Query
- **3D Globe:** CesiumJS + deck.gl with camera sync
- **Graph:** React Flow 12 with 7 custom entity node types
- **Collaboration:** Yjs + Y-Sweet CRDT sync, BlockNote editor
- **Backend:** NestJS 10 modular monolith (12 modules)
- **Database:** TimescaleDB (hypertables, continuous aggregates) + PostGIS
- **Graph DB:** Memgraph 3.8+ with MAGE algorithms (PageRank, community detection)
- **Cache/PubSub:** Redis 7.4 with sharded pub/sub, H3 geo-partitioned channels
- **Real-time:** Socket.IO + Redis adapter, Protobuf binary frames
- **AI:** AWS Bedrock with 8 Nova models, SSE streaming
- **Auth:** JWT with bcrypt password hashing

## Quick Start

### Prerequisites
- Node.js 20+
- pnpm 9+
- Docker & Docker Compose

### Setup

```bash
# Clone
git clone https://github.com/ayotov02/sentinel.git
cd sentinel

# Copy environment variables
cp .env.example .env

# Start infrastructure
docker compose up -d

# Install dependencies
pnpm install

# Run database migrations
pnpm --filter api run db:migrate

# Seed sample data
pnpm --filter api run db:seed

# Start API server (port 3000)
pnpm --filter api run start:dev

# Start web app (port 5173)
pnpm --filter web run dev
```

### Default Users (from seed data)
| Email | Password | Role |
|-------|----------|------|
| admin@sentinel.dev | admin123 | admin |
| analyst1@sentinel.dev | analyst123 | analyst |
| analyst2@sentinel.dev | analyst123 | analyst |

## Monorepo Structure

```
sentinel/
├── apps/
│   ├── web/          # React SPA (Vite + TypeScript)
│   │   └── src/
│   │       ├── components/   # 73 components across 12 domains
│   │       ├── views/        # 10 page views
│   │       ├── stores/       # Zustand state (entity, UI, filter)
│   │       ├── hooks/        # Custom hooks (WebSocket, Cesium, entities, chat)
│   │       └── lib/          # API client, utilities, constants
│   └── api/          # NestJS modular monolith
│       └── src/
│           └── modules/      # 12 feature modules
│               ├── auth/         # JWT authentication
│               ├── entities/     # Entity CRUD + search
│               ├── timeseries/   # TimescaleDB + PostGIS queries
│               ├── graph/        # Memgraph Bolt driver
│               ├── osint/        # 8 OSINT source adapters
│               ├── ai/           # Bedrock + 8 Nova models
│               ├── gateway/      # Socket.IO WebSocket gateway
│               ├── cases/        # Investigation management
│               ├── alerts/       # Rule engine + watchlists
│               ├── search/       # Cross-table full-text search
│               ├── ingestion/    # File upload + entity extraction
│               └── collaboration/ # Y-Sweet token management
├── packages/
│   └── shared/       # Shared types, constants, protobuf schema
├── scripts/
│   ├── seed-data.ts          # Generate 500+ mock entities
│   └── init-memgraph.cypher  # Graph DB indices
└── docker-compose.yml        # TimescaleDB, Redis, Memgraph, Y-Sweet
```

## Infrastructure

### Docker Services
| Service | Port | Image |
|---------|------|-------|
| PostgreSQL + TimescaleDB | 5432 | timescale/timescaledb-ha:pg17-latest |
| Redis | 6379 | redis:7.4-alpine |
| Memgraph | 7687 | memgraph/memgraph-mage:latest |
| Memgraph Lab | 3001 | memgraph/lab:latest |
| Y-Sweet | 8080 | jamsocket/y-sweet:latest |

### Database Schema Highlights
- **entity_positions**: TimescaleDB hypertable with 1-hour chunks, automatic compression (7d), retention (90d)
- **entity_hourly_summary**: Continuous aggregate for pattern-of-life analysis
- **PostGIS indexes**: GIST indexes on `ST_Point(lon, lat)` for spatial queries
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

## Environment Variables

See [.env.example](.env.example) for the full list. The app works without external API keys — all OSINT sources and AI models include realistic mock fallbacks.

## License

MIT
