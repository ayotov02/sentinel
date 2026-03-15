# SENTINEL: One-Shot Integration Plan
## From Mocked Data to Live Intelligence Platform
### March 15, 2026

---

## Executive Summary

This plan replaces ALL mock/simulated data in SENTINEL with real-time API feeds from free public sources, implements proper Amazon Nova AI integration using the official Bedrock APIs, and fills every gap identified in the codebase review. The result is a production-grade Palantir Gotham alternative that runs on live data.

**Key Principles:**
1. **Zero mocks** -- every data source calls a real API with automatic failover
2. **Every Nova model has a clear, distinct purpose** -- no duplication
3. **Differentiate from competitors** (WorldMonitor, SIGINT, GeoSentinel) through graph intelligence, multi-source correlation, and real-time voice AI
4. **Works out of the box** -- no API key required for core functionality (GDELT, USGS, CartoDB tiles, Airplanes.live all work without auth)

---

## Competitive Differentiation Matrix

| Capability | WorldMonitor | SIGINT | GeoSentinel | **SENTINEL** |
|------------|-------------|--------|-------------|-------------|
| Graph database | No (static lookup) | No | No | **Memgraph (PageRank, communities, shortest path)** |
| Vessel tracking | No | No | AISStream | **AISStream + GFW analytics + dark vessel detection** |
| Entity resolution | No | No | No | **Fuzzy matching + multi-source dedup** |
| Voice AI | No | No | gTTS (text-to-speech only) | **Nova 2 Sonic bidirectional streaming** |
| Satellite imagery analysis | No | No | YOLO basic | **Nova Pro multimodal (text + image + video)** |
| Multi-source correlation | Jaccard clustering | No | No | **Nova Premier deep reasoning + graph traversal** |
| Real-time protocol | Polling | Polling | WebSocket (AIS only) | **Socket.IO + Protobuf binary frames + H3 viewport** |
| Sanctions screening | No | OFAC/UN/EU (basic) | OpenSanctions (basic) | **OpenSanctions fuzzy match + OFAC/UN/EU bulk + graph links** |
| Predictive analysis | No (LLM text only) | No | No | **Nova Premier pattern-of-life baseline + anomaly scoring** |
| OSINT automation | No | No | BeautifulSoup scraping | **Nova Act browser agents** |
| GPS jamming detection | Mentioned, not implemented | NACp display only | No | **Airplanes.live NACp/NACv grid analysis** |
| Collaborative editing | No | No | No | **Yjs + Y-Sweet + BlockNote** |

---

## Part 1: Live Data Source Integration

### 1.1 Aviation Tracking (Replace `opensky.source.ts` + `adsb-exchange.source.ts`)

**Primary: Airplanes.live** (No auth required)
```
Base URL: https://api.airplanes.live/v2
Rate limit: 1 request/second
Coverage: Global including military, LADD, PIA aircraft
Data: 40+ fields per aircraft including NACp/NACv for GPS jamming
```

**Failover: adsb.lol** (Same v2 format, drop-in replacement)
```
Base URL: https://api.adsb.lol/v2
Rate limit: Dynamic based on server load
Coverage: Global, ODbL 1.0 licensed
```

**Enrichment: OpenSky Network** (OAuth2, 4,000 credits/day)
```
Base URL: https://opensky-network.org/api
Auth: OAuth2 (basic auth deprecated March 18, 2026)
Coverage: Global, 5-second resolution authenticated
```

**Endpoints to use:**
| Endpoint | Use Case | Polling Interval |
|----------|----------|------------------|
| `/v2/all` | Full global state (bulk) | 15s |
| `/v2/mil` | Military aircraft only | 10s |
| `/v2/point/{lat}/{lon}/{radius}` | Viewport-specific | 5s |
| `/v2/hex/{icao}` | Track specific aircraft | 3s |
| `/v2/squawk/{code}` | Emergency monitoring (7500/7600/7700) | 10s |

**GPS Jamming Detection Algorithm:**
```typescript
// NACp-based GPS interference detection
// NACp 0 = GPS DENIED (position accuracy unknown)
// NACp 1-4 = Severely degraded, likely active interference
// NACp 5-7 = Below FAA minimum, possible interference
// NACp >= 8 = Normal GPS operation

interface JammingZone {
  h3Cell: string;        // H3 resolution 5 hexagon
  degradedCount: number; // Aircraft with NACp < 8
  totalCount: number;    // Total aircraft in cell
  degradedRatio: number; // degradedCount / totalCount
  severity: 'NONE' | 'POSSIBLE' | 'PROBABLE' | 'CONFIRMED';
  timestamp: Date;
}

// Threshold: >2% of aircraft in an H3 cell with NACp < 8 = flagged
// Per GPSJam.org methodology (Stanford GPS Lab validated: 99.64% true positive rate)
```

**Implementation: `apps/api/src/modules/osint/sources/aviation.source.ts`**
- Single source file replaces both `opensky.source.ts` and `adsb-exchange.source.ts`
- Multi-source failover chain: Airplanes.live -> adsb.lol -> OpenSky
- GPS jamming zone calculation on every poll
- Military aircraft classification from callsign patterns + aircraft type codes
- Binary protobuf emission via Redis pub/sub

---

### 1.2 Maritime Vessel Tracking (Replace `aishub.source.ts`)

**Primary: AISStream.io** (Free WebSocket, real-time)
```
WebSocket URL: wss://stream.aisstream.io/v0/stream
Auth: Free API key (GitHub login at aisstream.io)
Coverage: Global
Data: Position reports, static data, 19+ AIS message types
Constraint: Must send subscription within 3 seconds of connect
```

**Analytics: Global Fishing Watch** (Free, non-commercial)
```
Base URL: https://gateway.api.globalfishingwatch.org/v3
Auth: Bearer token (register at globalfishingwatch.org)
Coverage: Global oceans
Data: Vessel identity, ownership chains, encounters, loitering, port visits, AIS gaps, IUU cross-reference
```

**Implementation: `apps/api/src/modules/osint/sources/maritime.source.ts`**
- Persistent WebSocket connection to AISStream.io (not polling)
- Automatic reconnection with exponential backoff
- GFW vessel identity enrichment (ownership chains, flag history)
- Dark vessel detection: AIS gap analysis (>6 hour gaps flagged)
- Ship-to-ship transfer detection: proximity analysis (<900m, >2 hours, <3 knots)
- Sanctions evasion pattern detection:
  - Flag hopping (frequent flag state changes)
  - MMSI/flag mismatch (MID prefix doesn't match reported flag)
  - Name changes (IMO stays same but name changes)
  - Deceptive shipping practices (false destination, draft changes without port call)

---

### 1.3 Conflict & Events (Replace `acled.source.ts`)

**Primary: GDELT 2.0** (No auth required, best free OSINT API)
```
DOC API: https://api.gdeltproject.org/api/v2/doc/doc
GEO API: https://api.gdeltproject.org/api/v2/geo/geo
Freshness: Every 15 minutes
Format: JSON, GeoJSON, CSV
Capabilities: Boolean queries, tone analysis, theme filtering, 250 results/request
```

**Supplemental: ACLED** (API key required)
```
Base URL: https://api.acleddata.com/acled/read
Auth: API key + email as query params
Freshness: Weekly updates
Coverage: Political violence globally, 1997-present
```

**Supplemental: UCDP** (API key, free registration)
```
Base URL: https://ucdpapi.pcr.uu.se/api/gedevents/24.0.10
Auth: API key
Coverage: State-based, non-state, one-sided violence, 1989-present
```

**Implementation: `apps/api/src/modules/osint/sources/conflict.source.ts`**
- GDELT GEO API every 5 minutes (GeoJSON output, map directly to entities)
- GDELT DOC API for entity extraction pipeline (feed to Nova 2 Lite)
- ACLED monthly batch import for historical conflict data
- UCDP for structured conflict data (actor names, fatality counts)
- Automatic theme-based classification using GDELT's 300+ theme taxonomy

---

### 1.4 Internet Outages (Replace `ioda.source.ts`)

**IODA (Internet Outage Detection and Analysis)**
```
Base URL: https://api.ioda.inetintel.cc.gatech.edu/v2
Auth: None
Freshness: Near real-time (5-minute resolution)
Coverage: Global, country and region level
Data: BGP, Active Probing, Network Telescope signals
```

**Implementation: `apps/api/src/modules/osint/sources/internet.source.ts`**
- Poll every 5 minutes for country-level alerts
- Correlate outages with conflict events (GDELT) and airspace closures (NOTAM)
- Severity scoring based on IODA's combined multi-source confidence

---

### 1.5 Satellite Tracking (Replace `spacetrack.source.ts`)

**Primary: Space-Track.org** (Strict rate limits)
```
Base URL: https://www.space-track.org
Auth: Username + password (cookie session)
Rate limits: 30 req/min, 300 req/hour (STRICT)
Data: TLE/OMM orbital elements
```

**Failover: CelesTrak** (No auth)
```
URL: https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=json
Auth: None
Data: GP (General Perturbations) elements
```

**Implementation: `apps/api/src/modules/osint/sources/satellites.source.ts`**
- Fetch TLEs every 2 hours from Space-Track (cache aggressively)
- Use `satellite.js` (sgp4) in Web Worker for position propagation
- Client-side SGP4 propagation at 60fps (no server round-trip for position updates)
- Categorize: Military reconnaissance, communications, weather, scientific, commercial

---

### 1.6 NOTAMs (Replace `notam.source.ts`)

**FAA NOTAM API**
```
Base URL: https://external-api.faa.gov/notamapi/v1/notams
Auth: client_id + client_secret headers
Registration: https://api.faa.gov/
```

**Implementation: `apps/api/src/modules/osint/sources/notams.source.ts`**
- Poll every 15 minutes for active NOTAMs in regions of interest
- Parse NOTAM text for military exercise areas, TFRs, missile tests
- Correlate with GPS jamming zones (NOTAMs often precede jamming events)

---

### 1.7 Fire Detection (Replace `firms.source.ts`)

**NASA FIRMS**
```
Base URL: https://firms.modaps.eosdis.nasa.gov/api/area/csv/{MAP_KEY}/{SOURCE}/{AREA}/{DAYS}
Auth: Free MAP_KEY registration
Sources: VIIRS_SNPP_NRT, VIIRS_NOAA20_NRT, MODIS_NRT, LANDSAT_NRT
Freshness: 60 minutes (standard), 60 seconds (Ultra RT for US/Canada)
Rate limit: 5,000 transactions per 10 minutes
```

**Implementation: `apps/api/src/modules/osint/sources/fires.source.ts`**
- Poll every 30 minutes for global fire detections
- Confidence-based filtering (only `nominal` and `high` confidence)
- Correlate with conflict zones (fires near conflict = potential military activity)

---

### 1.8 Natural Disasters (NEW -- not in original implementation)

**USGS Earthquakes** (No auth)
```
Real-time feed: https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson
Auth: None
Freshness: Seconds after detection
```

**NOAA Weather Alerts** (No auth)
```
Base URL: https://api.weather.gov/alerts/active
Auth: None (User-Agent header required)
Freshness: Real-time
```

**Implementation: `apps/api/src/modules/osint/sources/disasters.source.ts`**
- USGS real-time feed every 60 seconds (all_hour.geojson for latest)
- NOAA severe weather alerts every 5 minutes
- Event creation with severity mapping (magnitude -> SENTINEL severity)

---

### 1.9 Sanctions & Watchlists (NEW -- not in original implementation)

**Primary: OpenSanctions** (Free for non-commercial)
```
Base URL: https://api.opensanctions.org
Matching: POST /match/default (fuzzy entity matching)
Search: GET /search/default?q={query}
Auth: API key
Coverage: 80+ source datasets (OFAC, EU, UN, UK, plus PEPs)
Freshness: Daily
```

**Bulk Downloads (parse locally, index in PostgreSQL):**
- OFAC SDN: `https://www.treasury.gov/ofac/downloads/sdn.xml`
- UN Consolidated: `https://scsanctions.un.org/resources/xml/en/consolidated.xml`
- EU Sanctions: `https://webgate.ec.europa.eu/fsd/fsf/public/files/xmlFullSanctionsList_1_1/content`

**Implementation: `apps/api/src/modules/sanctions/sanctions.module.ts` (NEW MODULE)**
- Daily bulk download and index of OFAC/UN/EU lists into PostgreSQL
- OpenSanctions API for real-time fuzzy matching against all entities
- Automatic screening of new entities from OSINT ingestion
- Graph integration: link sanctioned entities to vessels, organizations
- Alert generation when a tracked entity matches a sanctions list

---

### 1.10 Entity Enrichment (NEW)

**Wikidata** (No auth)
```
Entity search: https://www.wikidata.org/w/api.php?action=wbsearchentities
SPARQL: https://query.wikidata.org/sparql
```

**CIA World Factbook** (Static JSON)
```
URL: https://raw.githubusercontent.com/factbook/factbook.json/master/{region}/{country_code}.json
```

**OpenCorporates** (200 req/month free)
```
Base URL: https://api.opencorporates.com
Auth: API token as query param
Coverage: 200M+ companies from 140+ jurisdictions
```

---

## Part 2: Amazon Nova AI Integration (Clear Purpose Per Model)

### 2.1 AI Architecture: One Model, One Job

Every Nova model has a single, clear purpose. No overlapping responsibilities.

| Nova Model | SENTINEL Purpose | Input | Output | Latency Target |
|------------|-----------------|-------|--------|----------------|
| **Nova 2 Lite** | Entity extraction from OSINT text | GDELT articles, RSS feeds, uploaded documents | Structured JSON entities | <200ms |
| **Nova 2 Sonic** | Voice intelligence assistant | Analyst voice queries via browser audio | Streaming voice responses + tool calls | <500ms first word |
| **Nova Pro** | Multimodal anomaly analysis | Image + text + AIS data + satellite photos | Anomaly assessment narrative | <2s |
| **Nova Premier** | Deep multi-source correlation & briefings | Graph context + timeseries + events (1M context) | Intelligence briefings, causal inference | 3-10s |
| **Nova Canvas** | Satellite imagery annotation | Satellite photos + annotation prompts | Annotated images with highlights | <3s |
| **Nova Reel** | Timelapse/visualization generation | Text description of scenario | MP4 video (6s-2min) | Async (90s-17min) |
| **Nova Act** | Automated OSINT web collection | Natural language instructions | Structured data from web UIs | Variable |
| **Nova Embeddings** | Semantic search across all intelligence | Text, images, documents | 1024-dim vectors in pgvector | <100ms |

### 2.2 Nova 2 Lite: Entity Extraction Pipeline

**Purpose:** High-volume, low-cost extraction of entities from OSINT text feeds.

```typescript
// Constrained decoding via forced tool call -- 95%+ reliability
const toolConfig: ToolConfiguration = {
  tools: [{
    toolSpec: {
      name: 'ExtractOSINTEntities',
      description: 'Extract intelligence entities from OSINT text',
      inputSchema: {
        json: {
          type: 'object',
          properties: {
            persons: { type: 'array', items: { /* name, aliases, nationality, role, sanctioned */ } },
            organizations: { type: 'array', items: { /* name, type, country */ } },
            locations: { type: 'array', items: { /* name, type, coordinates */ } },
            vessels: { type: 'array', items: { /* name, imo, mmsi, flag */ } },
            aircraft: { type: 'array', items: { /* callsign, icao, type, operator */ } },
            relationships: { type: 'array', items: { /* source, target, type */ } },
            riskIndicators: { type: 'array', items: { type: 'string' } },
          },
          required: ['persons', 'organizations', 'locations', 'vessels', 'aircraft', 'relationships', 'riskIndicators'],
        },
      },
    },
  }],
  toolChoice: { tool: { name: 'ExtractOSINTEntities' } }, // Force structured output
};

// System prompt with cachePoint (saves ~45% on repeated calls)
system: [
  { text: ENTITY_EXTRACTION_SYSTEM_PROMPT }, // 1,024+ tokens
  { cachePoint: { type: 'default' } },       // 5-min TTL, 90% discount on cache hits
],
inferenceConfig: { maxTokens: 4096, temperature: 0.1 }, // Low temp for factual extraction
```

**Data flow:**
```
GDELT articles (every 15 min) -> Nova 2 Lite (structured JSON) ->
Confidence threshold (>0.7) -> PostgreSQL entity upsert ->
Memgraph node creation -> OpenSanctions screening -> Alert if match
```

### 2.3 Nova 2 Sonic: Voice Intelligence Assistant

**Purpose:** Real-time conversational intelligence queries with tool calling.

**Architecture:** Browser (WebAudio API) <-> Socket.IO <-> NestJS Voice Gateway <-> HTTP/2 Bedrock

```typescript
// Critical: Must use HTTP/2 handler for bidirectional streaming
const http2Handler = new NodeHttp2Handler({
  requestTimeout: 300_000,    // 5 minutes
  sessionTimeout: 300_000,
  disableConcurrentStreams: false,
  maxConcurrentStreams: 20,
});

// Tool definitions for voice queries
const voiceTools = [
  { name: 'search_entities', description: 'Search the OSINT knowledge graph' },
  { name: 'get_trajectory', description: 'Get movement history of a tracked entity' },
  { name: 'check_sanctions', description: 'Screen entity against global sanctions lists' },
  { name: 'get_proximity', description: 'Find entities near a location' },
  { name: 'get_briefing', description: 'Generate intelligence briefing for a case' },
];

// Nova 2 Sonic supports async tool calling -- continues talking while tools execute
// Turn detection: endpointingSensitivity: 'MEDIUM' (adjustable per analyst preference)
// Barge-in: enabled (analyst can interrupt mid-response)
// Session limit: 8 minutes (auto-renew pattern required)
```

**Voice gateway: `apps/api/src/modules/voice/voice.gateway.ts` (NEW MODULE)**
- Socket.IO namespace `/voice`
- Browser captures 16kHz mono PCM via Web Audio API
- NestJS bridges to Bedrock `InvokeModelWithBidirectionalStream`
- Audio output streamed back as base64 PCM chunks
- Tool calls execute against SENTINEL's API modules (graph, timeseries, sanctions)

### 2.4 Nova Pro: Multimodal Anomaly Analysis

**Purpose:** Analyze situations that require understanding images, video, AND text together.

**Use cases:**
1. Satellite image + AIS data: "Is this vessel at the port shown in this satellite image?"
2. Conflict video + ACLED events: "Does this footage match reported incidents in the area?"
3. Port photo + vessel registry: "Identify vessels visible and cross-reference with GFW data"

```typescript
// Multimodal input: image from S3 + text context from graph
const response = await client.send(new ConverseStreamCommand({
  modelId: 'us.amazon.nova-pro-v1:0',
  system: [
    { text: GEOINT_ANALYST_PROMPT },
    { cachePoint: { type: 'default' } },
  ],
  messages: [{
    role: 'user',
    content: [
      { image: { format: 'jpeg', source: { s3Location: { uri: s3ImageUri } } } },
      { text: `Context: ${graphContext}\n\nAnalyze this satellite image...` },
    ],
  }],
  inferenceConfig: { maxTokens: 4096, temperature: 0.3 },
}));
```

### 2.5 Nova Premier: Deep Correlation & Briefings

**Purpose:** The "thinking" model. Multi-step reasoning across the full 1M context window.

**Use cases:**
1. Multi-source correlation: "Vessel dark period + GPS jamming in region + airspace closure + internet outage = what's happening?"
2. Intelligence briefing generation: Generate IC-standard briefings with executive summary, key findings, threat assessment
3. Multi-agent orchestration: Decompose complex queries into subtasks dispatched to Lite/Pro

```typescript
// Extended thinking for complex reasoning
additionalModelRequestFields: {
  reasoningConfig: {
    type: 'enabled',
    maxReasoningEffort: 'high', // Deep reasoning, may use 128K output tokens
    // CRITICAL: Cannot set temperature, topP, or topK when effort is 'high'
  },
},
// Remove temperature, topP from inferenceConfig when using high reasoning
```

**Briefing pipeline:**
```
Analyst selects entities + time range + classification level ->
Premier decomposes into subtasks (maritime analysis, conflict analysis, signals analysis) ->
Subtasks dispatched to Nova 2 Lite (text) or Nova Pro (multimodal) ->
Results collected, Premier synthesizes into structured briefing (1M context window) ->
BlockNote editor for collaborative editing -> PDF/DOCX export
```

### 2.6 Nova Canvas: Imagery Annotation

**Purpose:** Annotate satellite imagery and geospatial photos with intelligence markings.

```typescript
// Inpainting: highlight areas of interest on satellite photos
const payload = {
  taskType: 'INPAINTING',
  inPaintingParams: {
    image: imageBase64,
    maskPrompt: 'the port facility in the center',
    text: 'red annotation circle highlighting the facility with label markers',
  },
  imageGenerationConfig: { numberOfImages: 1, quality: 'premium' },
};
await client.send(new InvokeModelCommand({ modelId: 'amazon.nova-canvas-v1:0', body: JSON.stringify(payload) }));
```

### 2.7 Nova Reel: Scenario Visualization

**Purpose:** Generate timelapse visualizations of intelligence scenarios (async).

```typescript
// Async video generation -- submit and poll
const response = await client.send(new StartAsyncInvokeCommand({
  modelId: 'amazon.nova-reel-v1:1',
  modelInput: {
    taskType: 'TEXT_VIDEO',
    textToVideoParams: { text: 'Aerial surveillance view of maritime traffic in the Strait of Hormuz at dusk' },
    videoGenerationConfig: { durationSeconds: 6, fps: 24, dimension: '1280x720' },
  },
  outputDataConfig: { s3OutputDataConfig: { s3Uri: 's3://sentinel-videos/' } },
}));
// Poll: GetAsyncInvokeCommand until status === 'Completed' (~90s for 6s clip)
```

### 2.8 Nova Act: OSINT Web Automation

**Purpose:** Automate web-based OSINT collection (Python SDK, called from TypeScript via subprocess).

**Use cases:**
1. Maritime registry lookup (Equasis.org) -- navigate, search, extract ownership data
2. Company registry search (OpenCorporates) -- extract corporate structures
3. News article archival -- capture full page content before articles are paywalled

```python
# scripts/nova-act/maritime_registry.py
from nova_act import NovaAct

def scrape_equasis(vessel_name: str, imo: str):
    with NovaAct(starting_page='https://www.equasis.org', headless=True) as nova:
        nova.act(f"Search for vessel with IMO number {imo}")
        result = nova.act(
            "Extract vessel details including owner, operator, flag history, and inspection records",
            schema={
                "type": "object",
                "properties": {
                    "vessel_name": {"type": "string"},
                    "imo": {"type": "string"},
                    "flag": {"type": "string"},
                    "owner": {"type": "string"},
                    "operator": {"type": "string"},
                    "flag_history": {"type": "array", "items": {"type": "object"}},
                    "inspections": {"type": "array", "items": {"type": "object"}},
                }
            }
        )
        return result.parsed_response
```

### 2.9 Nova Multimodal Embeddings: Semantic Search

**Purpose:** Cross-modal semantic search across all intelligence data (text, images, documents).

```typescript
// Index: generate embeddings and store in pgvector
const embedding = await embedText(articleText, 1024, 'RETRIEVAL');
await pool.query(
  `INSERT INTO intelligence_embeddings (content, source_url, entity_type, embedding)
   VALUES ($1, $2, $3, $4::vector)`,
  [content, sourceUrl, entityType, `[${embedding.join(',')}]`]
);

// Search: cosine similarity via pgvector
const results = await pool.query(
  `SELECT content, source_url, 1 - (embedding <=> $1::vector) AS similarity
   FROM intelligence_embeddings
   ORDER BY embedding <=> $1::vector
   LIMIT 20`,
  [`[${queryEmbedding.join(',')}]`]
);
```

**Database migration addition:**
```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE intelligence_embeddings (
  id SERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  source_url TEXT,
  entity_type VARCHAR(50),
  entity_id UUID REFERENCES entities(id),
  metadata JSONB DEFAULT '{}',
  embedding vector(1024) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON intelligence_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

---

## Part 3: Frontend Integration Fixes

### 3.1 CesiumJS Without Ion (Free Dark Globe)

**Current problem:** Requires Cesium Ion token for base imagery.

**Fix:** Use CartoDB Dark Matter tiles (no API key, no cost).

```typescript
// vite.config.ts -- remove CESIUM_BASE_URL Ion reference
// GlobeView.tsx -- replace Ion imagery with CartoDB
import { Viewer, UrlTemplateImageryProvider, Color } from 'cesium';

const viewer = new Viewer(container, {
  baseLayer: false,     // Don't use default Ion imagery
  baseLayerPicker: false,
  geocoder: false,
  animation: false,
  timeline: false,
  requestRenderMode: true,  // Only render on changes (saves GPU)
  scene3DOnly: true,        // No 2D/Columbus view (saves memory)
});

// CartoDB Dark Matter -- free, no API key, dark aesthetic
viewer.imageryLayers.addImageryProvider(
  new UrlTemplateImageryProvider({
    url: 'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
    credit: 'CartoDB',
    maximumLevel: 18,
  })
);

// Style the globe itself dark
viewer.scene.globe.baseColor = Color.fromCssColorString('#0a0a1a');
viewer.scene.backgroundColor = Color.fromCssColorString('#000000');
viewer.scene.globe.showGroundAtmosphere = false;
viewer.scene.skyAtmosphere.show = false;
viewer.scene.sun.show = false;
viewer.scene.moon.show = false;
```

### 3.2 Entity Data: Typed Arrays, Not React State

**Current problem:** Entity positions in Zustand store trigger React re-renders at high frequency.

**Fix:** Entity buffer manager with typed arrays, React notified at max 10 Hz.

```typescript
// lib/entity-buffer.ts (NEW)
export class EntityBufferManager {
  private positions: Float64Array;    // [lon, lat, lon, lat, ...]
  private colors: Uint8Array;         // [r, g, b, a, r, g, b, a, ...]
  private radii: Float32Array;        // [radius, radius, ...]
  private entityIndex: Map<string, number>; // entityId -> buffer index
  private count = 0;
  private version = 0;               // Increment on change, deck.gl checks this
  private capacity: number;

  constructor(maxEntities = 100_000) {
    this.capacity = maxEntities;
    this.positions = new Float64Array(maxEntities * 2);
    this.colors = new Uint8Array(maxEntities * 4);
    this.radii = new Float32Array(maxEntities);
    this.entityIndex = new Map();
  }

  upsert(entityId: string, lon: number, lat: number, color: [number, number, number, number], radius: number) {
    let idx = this.entityIndex.get(entityId);
    if (idx === undefined) {
      idx = this.count++;
      this.entityIndex.set(entityId, idx);
    }
    this.positions[idx * 2] = lon;
    this.positions[idx * 2 + 1] = lat;
    this.colors[idx * 4] = color[0];
    this.colors[idx * 4 + 1] = color[1];
    this.colors[idx * 4 + 2] = color[2];
    this.colors[idx * 4 + 3] = color[3];
    this.radii[idx] = radius;
    this.version++;
  }

  // deck.gl ScatterplotLayer uses these directly -- zero-copy GPU upload
  getLayerData() {
    return {
      length: this.count,
      attributes: {
        getPosition: { value: this.positions.subarray(0, this.count * 2), size: 2 },
        getFillColor: { value: this.colors.subarray(0, this.count * 4), size: 4 },
        getRadius: { value: this.radii.subarray(0, this.count), size: 1 },
      },
    };
  }
}
```

### 3.3 BlockNote Collaborative Editor (Replace contentEditable placeholder)

**Current problem:** `BriefingEditor.tsx` uses `contentEditable` div instead of real BlockNote.

**Fix:**
```typescript
// BriefingEditor.tsx
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/shadcn';
import * as Y from 'yjs';
import { createYjsProvider } from '@y-sweet/client';

function BriefingEditor({ clientToken }: { clientToken: ClientToken }) {
  const doc = useMemo(() => new Y.Doc(), []);

  useEffect(() => {
    const provider = createYjsProvider(doc, clientToken);
    return () => provider.destroy();
  }, [doc, clientToken]);

  const editor = useCreateBlockNote({
    collaboration: {
      provider,
      fragment: doc.getXmlFragment('briefing'),
      user: { name: currentUser.displayName, color: currentUser.avatarColor },
      showCursorLabels: 'activity',
    },
  });

  return <BlockNoteView editor={editor} theme="dark" />;
}
```

**PDF Export:**
```typescript
import { PDFExporter, pdfDefaultSchemaMappings } from '@blocknote/xl-pdf-exporter';
import * as ReactPDF from '@react-pdf/renderer';

const exporter = new PDFExporter(editor.schema, pdfDefaultSchemaMappings);
const pdfDoc = await exporter.toReactPDFDocument(editor.document);
const blob = await ReactPDF.pdf(pdfDoc).toBlob();
```

### 3.4 Dagre Graph Layout

**Fix:** Add `@dagrejs/dagre` for hierarchical graph layout.

```typescript
import dagre from '@dagrejs/dagre';

function applyDagreLayout(nodes: Node[], edges: Edge[], direction = 'TB') {
  const g = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, nodesep: 50, ranksep: 80 });
  nodes.forEach(n => g.setNode(n.id, { width: 180, height: 80 }));
  edges.forEach(e => g.setEdge(e.source, e.target));
  dagre.layout(g);
  return nodes.map(n => {
    const pos = g.node(n.id);
    return { ...n, position: { x: pos.x - 90, y: pos.y - 40 } };
  });
}
```

---

## Part 4: Infrastructure Additions

### 4.1 Database Migration Additions

```sql
-- 002-extensions.sql
CREATE EXTENSION IF NOT EXISTS vector;  -- pgvector for Nova embeddings

-- Sanctions tables
CREATE TABLE sanctions_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,                -- 'OFAC', 'UN', 'EU', 'OPENSANCTIONS'
  source_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,           -- 'person', 'organization', 'vessel'
  name TEXT NOT NULL,
  aliases TEXT[] DEFAULT '{}',
  nationality TEXT,
  properties JSONB DEFAULT '{}',
  list_type TEXT,                      -- 'SDN', 'SSI', 'CAPTA', etc.
  listed_date DATE,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source, source_id)
);

CREATE INDEX idx_sanctions_name_trgm ON sanctions_entries USING gin (name gin_trgm_ops);
CREATE INDEX idx_sanctions_source ON sanctions_entries (source);

-- Intelligence embeddings
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

CREATE INDEX ON intelligence_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- GPS jamming zones
CREATE TABLE gps_jamming_zones (
  id SERIAL PRIMARY KEY,
  h3_cell TEXT NOT NULL,
  h3_resolution INT DEFAULT 5,
  degraded_count INT NOT NULL,
  total_count INT NOT NULL,
  degraded_ratio FLOAT NOT NULL,
  severity TEXT NOT NULL,              -- 'NONE', 'POSSIBLE', 'PROBABLE', 'CONFIRMED'
  detected_at TIMESTAMPTZ NOT NULL,
  UNIQUE(h3_cell, detected_at)
);

SELECT create_hypertable('gps_jamming_zones', 'detected_at', chunk_time_interval => INTERVAL '1 day');

-- GDELT events
CREATE TABLE gdelt_events (
  id SERIAL PRIMARY KEY,
  gdelt_id TEXT UNIQUE,
  title TEXT NOT NULL,
  url TEXT,
  source_country TEXT,
  tone FLOAT,
  themes TEXT[] DEFAULT '{}',
  locations JSONB DEFAULT '[]',
  persons TEXT[] DEFAULT '{}',
  organizations TEXT[] DEFAULT '{}',
  published_at TIMESTAMPTZ,
  ingested_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.2 New API Modules

| Module | Files | Purpose |
|--------|-------|---------|
| `sanctions/` | sanctions.module.ts, sanctions.service.ts, sanctions.controller.ts | Sanctions screening + bulk list management |
| `voice/` | voice.module.ts, voice.gateway.ts | Nova 2 Sonic WebSocket bridge |
| `embeddings/` | embeddings.module.ts, embeddings.service.ts | pgvector semantic search |
| `correlation/` | correlation.module.ts, correlation.service.ts | Multi-source event correlation |
| `gps-jamming/` | gps-jamming.module.ts, gps-jamming.service.ts | GPS interference zone detection |

### 4.3 Package Dependencies to Add

**API (apps/api/package.json):**
```json
{
  "@aws-sdk/client-bedrock-runtime": "^3.750.0",
  "@smithy/node-http-handler": "^3.0.0",
  "h3-js": "^4.2.0",
  "satellite.js": "^5.0.0",
  "pgvector": "^0.2.0",
  "xml2js": "^0.6.0"
}
```

**Web (apps/web/package.json):**
```json
{
  "@blocknote/core": "^0.20.0",
  "@blocknote/react": "^0.20.0",
  "@blocknote/shadcn": "^0.20.0",
  "@blocknote/xl-pdf-exporter": "^0.20.0",
  "@y-sweet/client": "^0.6.0",
  "@y-sweet/react": "^0.6.0",
  "@dagrejs/dagre": "^1.1.0",
  "yjs": "^13.6.0",
  "satellite.js": "^5.0.0"
}
```

---

## Part 5: Implementation Execution Order

### Phase 1: Infrastructure & Data Pipeline (Commits 17-20)
1. **Commit 17:** Add database migration 002 (pgvector, sanctions tables, jamming zones, GDELT events)
2. **Commit 18:** Replace all 8 OSINT sources with real API implementations (aviation, maritime, conflict, internet, satellites, notams, fires, disasters)
3. **Commit 19:** Add sanctions module (OpenSanctions API + OFAC/UN/EU bulk import)
4. **Commit 20:** Add GPS jamming detection module

### Phase 2: Nova AI Integration (Commits 21-26)
5. **Commit 21:** Rewrite ai.service.ts with proper Bedrock Converse API (Nova 2 Lite entity extraction with constrained decoding)
6. **Commit 22:** Add voice gateway module (Nova 2 Sonic bidirectional streaming)
7. **Commit 23:** Add multimodal analysis endpoints (Nova Pro image + video + text)
8. **Commit 24:** Add correlation engine (Nova Premier multi-source reasoning + briefing generation)
9. **Commit 25:** Add embeddings module (Nova Embeddings + pgvector semantic search)
10. **Commit 26:** Add Nova Canvas/Reel/Act integration endpoints

### Phase 3: Frontend Upgrades (Commits 27-31)
11. **Commit 27:** Replace CesiumJS Ion with CartoDB Dark Matter tiles
12. **Commit 28:** Implement entity buffer manager (typed arrays for 50K+ entities)
13. **Commit 29:** Replace BriefingEditor with real BlockNote + Yjs + PDF export
14. **Commit 30:** Add Dagre layout + React Flow Yjs collaborative sync
15. **Commit 31:** Implement Nova 2 Sonic voice interface (browser audio capture + WebSocket)

### Phase 4: Intelligence Features (Commits 32-35)
16. **Commit 32:** Add dark vessel detection, STS transfer detection, sanctions evasion patterns
17. **Commit 33:** Add GPS jamming zone visualization (H3 hexagons on globe)
18. **Commit 34:** Add GDELT integration with automatic entity extraction pipeline
19. **Commit 35:** Add multi-source correlation engine (correlate across all 10+ feeds)

### Phase 5: Polish & Documentation (Commits 36-38)
20. **Commit 36:** Update seed data to use real API bootstrapping instead of mock generation
21. **Commit 37:** Add comprehensive .env.example with registration links for all APIs
22. **Commit 38:** Update README with real quick-start, Nova model usage table, and demo instructions

---

## Part 6: Environment Variables (Complete)

```bash
# === AWS ===
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=

# === Databases ===
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=sentinel
POSTGRES_USER=sentinel
POSTGRES_PASSWORD=sentinel_dev
MEMGRAPH_HOST=localhost
MEMGRAPH_PORT=7687
REDIS_HOST=localhost
REDIS_PORT=6379

# === Collaboration ===
Y_SWEET_URL=http://localhost:8080

# === CesiumJS (optional -- works without) ===
CESIUM_ION_TOKEN=

# === Aviation (Primary: no auth needed) ===
# Airplanes.live: No key required
# adsb.lol: No key required
OPENSKY_USERNAME=          # Optional enrichment (register: opensky-network.org)
OPENSKY_PASSWORD=

# === Maritime ===
AISSTREAM_API_KEY=         # Free (register: aisstream.io with GitHub)
GFW_TOKEN=                 # Free (register: globalfishingwatch.org/our-apis/tokens)

# === Conflict & Events ===
# GDELT: No key required
ACLED_API_KEY=             # Free (register: developer.acleddata.com)
ACLED_EMAIL=
UCDP_API_KEY=              # Free (register: ucdp.uu.se)

# === Environmental ===
FIRMS_MAP_KEY=             # Free (register: firms.modaps.eosdis.nasa.gov)
# USGS: No key required
# NOAA NWS: No key required (User-Agent header used)

# === Satellites ===
SPACETRACK_USERNAME=       # Free (register: space-track.org)
SPACETRACK_PASSWORD=

# === NOTAMs ===
FAA_CLIENT_ID=             # Free (register: api.faa.gov)
FAA_CLIENT_SECRET=

# === Sanctions ===
OPENSANCTIONS_API_KEY=     # Free for non-commercial (register: opensanctions.org)

# === Entity Enrichment ===
OPENCORPORATES_TOKEN=      # Free tier: 200 req/month (register: opencorporates.com)

# === Nova AI (AWS Bedrock) ===
# Uses AWS credentials above -- no separate key needed
# Models used:
# - us.amazon.nova-2-lite-v1:0     (entity extraction)
# - amazon.nova-2-sonic-v1:0       (voice assistant)
# - us.amazon.nova-pro-v1:0        (multimodal analysis)
# - us.amazon.nova-premier-v1:0    (deep reasoning, briefings)
# - amazon.nova-canvas-v1:0        (image annotation)
# - amazon.nova-reel-v1:1          (video generation)
# - amazon.nova-2-multimodal-embeddings-v1:0 (semantic search)

# === Nova Act (Python SDK, optional) ===
NOVA_ACT_API_KEY=          # Separate from Bedrock credentials
```

---

## Verification Checklist

After implementation, verify:

- [ ] `docker compose up -d` starts all services
- [ ] `pnpm install` succeeds
- [ ] Database migrations apply cleanly
- [ ] Globe loads with CartoDB dark tiles (no Cesium Ion token)
- [ ] Aircraft appear from Airplanes.live within 15 seconds
- [ ] Vessels stream from AISStream.io WebSocket
- [ ] GDELT events populate every 15 minutes
- [ ] USGS earthquakes appear in real-time
- [ ] NASA FIRMS fire detections update
- [ ] OpenSanctions entity screening works
- [ ] Nova 2 Lite extracts entities from GDELT articles
- [ ] Nova 2 Sonic voice queries work in browser
- [ ] Nova Pro analyzes uploaded images
- [ ] Nova Premier generates intelligence briefings
- [ ] Semantic search returns relevant results via pgvector
- [ ] BlockNote editor syncs between two browser tabs (Yjs)
- [ ] GPS jamming zones render as H3 hexagons on globe
- [ ] Dark vessel alerts fire for AIS gaps > 6 hours
- [ ] Graph shows entity relationships with PageRank scores

---

*This plan transforms SENTINEL from a demo with mock data into a live intelligence platform powered by 15+ real-time data sources and the full Amazon Nova AI suite.*
