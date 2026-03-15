/**
 * SENTINEL Seed Data Generator
 * Generates realistic mock entities for development
 *
 * Usage: ts-node scripts/seed-data.ts
 */

import { Client } from 'pg';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';

const client = new Client({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'sentinel',
  user: process.env.POSTGRES_USER || 'sentinel',
  password: process.env.POSTGRES_PASSWORD || 'sentinel_dev',
});

function uuid() {
  return crypto.randomUUID();
}

function randomLat(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function randomLon(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function hoursAgo(h: number): Date {
  return new Date(Date.now() - h * 3600 * 1000);
}

// ── Aircraft ──────────────────────────────────────────────────

const AIRLINES = ['THY', 'DLH', 'BAW', 'AFR', 'UAE', 'QTR', 'ELY', 'MEA', 'RYR', 'SAS', 'AZA', 'IBE', 'KLM', 'SWR', 'TAP', 'LOT', 'AUA', 'FIN', 'EZY', 'WZZ', 'PGT', 'SXS', 'AEE', 'OHY', 'TRA', 'VLG', 'NOZ', 'RAM', 'TUN', 'MSR', 'SVA', 'ETH', 'KQA', 'SAA', 'DAL', 'AAL', 'UAL', 'SWA', 'JBU', 'ACA'];
const COUNTRIES = ['Turkey', 'Germany', 'United Kingdom', 'France', 'UAE', 'Qatar', 'Israel', 'Lebanon', 'Italy', 'Spain', 'Netherlands', 'Switzerland', 'Portugal', 'Poland', 'Austria', 'Finland', 'Norway', 'Morocco', 'Tunisia', 'Egypt'];
const MILITARY_CALLSIGNS = ['FORTE', 'DUKE', 'RCH', 'JAKE', 'NCHO', 'LAGR', 'DOOM', 'IRON', 'HAWK', 'VIPER'];

function generateAircraft(count: number) {
  const aircraft = [];
  for (let i = 0; i < count; i++) {
    const isMilitary = i < 20;
    const callsign = isMilitary
      ? `${randomItem(MILITARY_CALLSIGNS)}${10 + Math.floor(Math.random() * 90)}`
      : `${randomItem(AIRLINES)}${100 + Math.floor(Math.random() * 900)}`;
    const icao = (0xa00000 + i * 0x111).toString(16);
    aircraft.push({
      entityType: 'aircraft',
      entityId: `ICAO-${icao}`,
      displayName: callsign,
      lat: randomLat(15, 55),
      lon: randomLon(-10, 60),
      altitude: isMilitary ? 15000 + Math.random() * 10000 : 8000 + Math.random() * 4000,
      heading: Math.random() * 360,
      speed: isMilitary ? 200 + Math.random() * 300 : 350 + Math.random() * 150,
      confidence: 0.95,
      source: 'opensky',
      properties: {
        icao24: icao,
        callsign,
        originCountry: randomItem(COUNTRIES),
        onGround: false,
        squawk: isMilitary ? '7700' : (1000 + i * 100).toString().substring(0, 4),
        category: isMilitary ? 'military' : 'commercial',
      },
    });
  }
  return aircraft;
}

// ── Vessels ───────────────────────────────────────────────────

const VESSEL_NAMES = ['EVER GIVEN', 'EVER ACE', 'MSC OSCAR', 'MSC GÜLSÜN', 'HMM ALGECIRAS', 'CMA CGM JACQUES SAADE', 'MADRID MAERSK', 'COSCO SHIPPING UNIVERSE', 'OOCL HONG KONG', 'MOL TRIUMPH', 'EVER GOLDEN', 'MSC ISABELLA', 'SAPPHIRE PRINCESS', 'HARMONY OF THE SEAS', 'WONDER OF THE SEAS', 'QUEEN MARY 2', 'SABITI', 'ADRIAN DARYA', 'GRACE 1', 'STENA IMPERO', 'FRONT ALTAIR', 'KOKUKA COURAGEOUS', 'MERCER STREET', 'PACIFIC ZIRCON', 'RICHMOND VOYAGER', 'MARLIN LUANDA', 'TRUE CONFIDENCE', 'GALAXY LEADER', 'CENTRAL PARK', 'UNITY EXPLORER'];
const VESSEL_TYPES = ['Container Ship', 'Bulk Carrier', 'Tanker', 'Cargo', 'Passenger', 'Fishing', 'Military', 'Research'];
const FLAGS = ['Panama', 'Liberia', 'Marshall Islands', 'Hong Kong', 'Singapore', 'Malta', 'Bahamas', 'Greece', 'China', 'Japan', 'Iran', 'Turkey', 'UAE', 'Saudi Arabia', 'India'];

function generateVessels(count: number) {
  const vessels = [];
  for (let i = 0; i < count; i++) {
    const mmsi = 200000000 + i * 100000 + Math.floor(Math.random() * 99999);
    const name = i < VESSEL_NAMES.length ? VESSEL_NAMES[i] : `VESSEL ${String.fromCharCode(65 + (i % 26))}${i}`;
    // Shipping lanes: Mediterranean, Red Sea, Persian Gulf, Indian Ocean
    const region = i % 4;
    let lat: number, lon: number;
    if (region === 0) { lat = randomLat(30, 40); lon = randomLon(5, 35); } // Mediterranean
    else if (region === 1) { lat = randomLat(12, 30); lon = randomLon(32, 44); } // Red Sea
    else if (region === 2) { lat = randomLat(24, 30); lon = randomLon(48, 56); } // Persian Gulf
    else { lat = randomLat(0, 20); lon = randomLon(55, 75); } // Indian Ocean

    vessels.push({
      entityType: 'vessel',
      entityId: `MMSI-${mmsi}`,
      displayName: name,
      lat, lon,
      altitude: 0,
      heading: Math.random() * 360,
      speed: 5 + Math.random() * 20,
      confidence: 0.9,
      source: 'aishub',
      properties: {
        mmsi: mmsi.toString(),
        imo: (9000000 + i * 1000).toString(),
        shipType: randomItem(VESSEL_TYPES),
        flag: randomItem(FLAGS),
        destination: randomItem(['JEBEL ALI', 'SINGAPORE', 'ROTTERDAM', 'SHANGHAI', 'PIRAEUS', 'SUEZ', 'BANDAR ABBAS', 'JEDDAH']),
        draught: (5 + Math.random() * 15).toFixed(1),
        navStatus: randomItem(['Under way using engine', 'At anchor', 'Moored', 'Under way sailing']),
      },
    });
  }
  return vessels;
}

// ── Satellites ────────────────────────────────────────────────

const SAT_NAMES = ['ISS (ZARYA)', 'STARLINK-1234', 'STARLINK-5678', 'COSMOS 2542', 'USA 326', 'NROL-82', 'GOES-17', 'SENTINEL-2A', 'LANDSAT 9', 'WORLDVIEW-3', 'GAOFEN-11', 'YAOGAN-30D', 'OFEK 16', 'EROS C', 'TERRA', 'AQUA', 'SUOMI NPP', 'NOAA 20', 'METOP-C', 'ELEKTRO-L 3', 'INTELSAT 40e', 'SES-17', 'NAVSTAR GPS', 'GALILEO-24', 'BEIDOU-3 M23', 'GLONASS-M 759', 'ASTRA 2G', 'TURKSAT 5B', 'ARABSAT 6A', 'AMOS-17'];

function generateSatellites(count: number) {
  const sats = [];
  for (let i = 0; i < count; i++) {
    const noradId = 25544 + i * 100;
    const name = i < SAT_NAMES.length ? SAT_NAMES[i] : `SAT-${noradId}`;
    // Simple orbit position
    const t = (Date.now() / 1000 + i * 1000) % 5400;
    const lat = 51.6 * Math.sin(2 * Math.PI * t / 5400 + i);
    const lon = ((t / 5400) * 360 - 180 + i * 30) % 360 - 180;

    sats.push({
      entityType: 'satellite',
      entityId: `NORAD-${noradId}`,
      displayName: name,
      lat, lon,
      altitude: i === 0 ? 408000 : 200000 + Math.random() * 35000000,
      heading: 0,
      speed: 0,
      confidence: 0.99,
      source: 'spacetrack',
      properties: {
        noradId: noradId.toString(),
        objectName: name,
        objectType: randomItem(['PAYLOAD', 'DEBRIS', 'ROCKET BODY']),
        periodMin: (90 + Math.random() * 1350).toFixed(1),
        inclination: (i === 0 ? 51.6 : Math.random() * 98).toFixed(1),
        apogeeKm: (400 + Math.random() * 35000).toFixed(0),
        perigeeKm: (300 + Math.random() * 1000).toFixed(0),
        rcsSize: randomItem(['SMALL', 'MEDIUM', 'LARGE']),
      },
    });
  }
  return sats;
}

// ── Events ───────────────────────────────────────────────────

const EVENT_TYPES = ['Battles', 'Explosions/Remote violence', 'Violence against civilians', 'Protests', 'Riots', 'Strategic developments'];
const EVENT_COUNTRIES = ['Syria', 'Iraq', 'Yemen', 'Libya', 'Sudan', 'Somalia', 'Nigeria', 'Mali', 'Burkina Faso', 'Niger', 'DRC', 'Mozambique', 'Myanmar', 'Afghanistan', 'Ethiopia'];
const ACTORS = ['State Forces', 'Rebel Groups', 'Political Militias', 'Identity Militias', 'External/Other Forces', 'Protesters', 'Rioters', 'Civilians'];

function generateEvents(count: number) {
  const events = [];
  for (let i = 0; i < count; i++) {
    const country = randomItem(EVENT_COUNTRIES);
    let lat: number, lon: number;
    // Approximate coords per country
    if (['Syria', 'Iraq'].includes(country)) { lat = randomLat(32, 37); lon = randomLon(36, 46); }
    else if (country === 'Yemen') { lat = randomLat(13, 16); lon = randomLon(43, 50); }
    else if (country === 'Libya') { lat = randomLat(25, 33); lon = randomLon(12, 25); }
    else if (['Sudan', 'Ethiopia'].includes(country)) { lat = randomLat(8, 20); lon = randomLon(28, 40); }
    else if (['Nigeria', 'Niger', 'Mali', 'Burkina Faso'].includes(country)) { lat = randomLat(6, 18); lon = randomLon(-5, 12); }
    else { lat = randomLat(-5, 35); lon = randomLon(25, 70); }

    events.push({
      eventType: randomItem(EVENT_TYPES),
      subType: randomItem(['Armed clash', 'Shelling/artillery', 'Air/drone strike', 'IED', 'Abduction', 'Attack', 'Peaceful protest', 'Mob violence']),
      description: `${randomItem(EVENT_TYPES)} event reported in ${country}`,
      lat, lon,
      timestamp: hoursAgo(Math.random() * 720),
      severity: randomItem(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const),
      confidence: 0.6 + Math.random() * 0.4,
      source: 'acled',
      actor1: randomItem(ACTORS),
      actor2: randomItem(ACTORS),
      fatalities: Math.floor(Math.random() * 20),
      properties: { country, region: `${country} Region`, geoPrecision: randomItem([1, 2, 3]) },
    });
  }
  return events;
}

// ── Main Seed Function ───────────────────────────────────────

async function seed() {
  await client.connect();
  console.log('Connected to PostgreSQL');

  // Clear existing data
  await client.query('DELETE FROM case_activities');
  await client.query('DELETE FROM cases');
  await client.query('DELETE FROM alerts');
  await client.query('DELETE FROM alert_rules');
  await client.query('DELETE FROM relationships');
  await client.query('DELETE FROM entity_positions');
  await client.query('DELETE FROM events');
  await client.query('DELETE FROM ingestion_jobs');
  await client.query('DELETE FROM audit_log');
  await client.query('DELETE FROM entities');
  await client.query('DELETE FROM users');
  console.log('Cleared existing data');

  // ── Users ──
  const passwordHash = await bcrypt.hash('sentinel123', 10);
  const users = [
    { email: 'admin@sentinel.io', displayName: 'Admin User', role: 'admin', avatarColor: '#ef4444' },
    { email: 'analyst1@sentinel.io', displayName: 'Jane Smith', role: 'analyst', avatarColor: '#3b82f6' },
    { email: 'analyst2@sentinel.io', displayName: 'John Doe', role: 'analyst', avatarColor: '#10b981' },
    { email: 'analyst3@sentinel.io', displayName: 'Sarah Chen', role: 'analyst', avatarColor: '#8b5cf6' },
    { email: 'viewer@sentinel.io', displayName: 'Observer One', role: 'viewer', avatarColor: '#f59e0b' },
  ];

  for (const u of users) {
    await client.query(
      'INSERT INTO users (email, password_hash, display_name, role, avatar_color) VALUES ($1, $2, $3, $4, $5)',
      [u.email, passwordHash, u.displayName, u.role, u.avatarColor],
    );
  }
  console.log(`Seeded ${users.length} users`);

  // ── Aircraft ──
  const aircraft = generateAircraft(500);
  for (const a of aircraft) {
    await client.query(
      'INSERT INTO entities (entity_type, entity_id, display_name, properties, source, confidence) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (entity_id) DO NOTHING',
      [a.entityType, a.entityId, a.displayName, JSON.stringify(a.properties), a.source, a.confidence],
    );
    await client.query(
      'INSERT INTO entity_positions (time, entity_id, entity_type, lat, lon, altitude_m, heading, speed_kts, source, confidence) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
      [new Date(), a.entityId, a.entityType, a.lat, a.lon, a.altitude, a.heading, a.speed, a.source, a.confidence],
    );
  }
  console.log(`Seeded ${aircraft.length} aircraft`);

  // ── Vessels ──
  const vessels = generateVessels(300);
  for (const v of vessels) {
    await client.query(
      'INSERT INTO entities (entity_type, entity_id, display_name, properties, source, confidence) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (entity_id) DO NOTHING',
      [v.entityType, v.entityId, v.displayName, JSON.stringify(v.properties), v.source, v.confidence],
    );
    await client.query(
      'INSERT INTO entity_positions (time, entity_id, entity_type, lat, lon, altitude_m, heading, speed_kts, source, confidence) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
      [new Date(), v.entityId, v.entityType, v.lat, v.lon, v.altitude, v.heading, v.speed, v.source, v.confidence],
    );
  }
  console.log(`Seeded ${vessels.length} vessels`);

  // ── Satellites ──
  const sats = generateSatellites(50);
  for (const s of sats) {
    await client.query(
      'INSERT INTO entities (entity_type, entity_id, display_name, properties, source, confidence) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (entity_id) DO NOTHING',
      [s.entityType, s.entityId, s.displayName, JSON.stringify(s.properties), s.source, s.confidence],
    );
    await client.query(
      'INSERT INTO entity_positions (time, entity_id, entity_type, lat, lon, altitude_m, heading, speed_kts, source, confidence) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
      [new Date(), s.entityId, s.entityType, s.lat, s.lon, s.altitude, s.heading, s.speed, s.source, s.confidence],
    );
  }
  console.log(`Seeded ${sats.length} satellites`);

  // ── Events ──
  const events = generateEvents(80);
  for (const e of events) {
    await client.query(
      'INSERT INTO events (event_type, sub_type, description, lat, lon, timestamp, severity, confidence, source, actor1, actor2, fatalities, properties) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)',
      [e.eventType, e.subType, e.description, e.lat, e.lon, e.timestamp, e.severity, e.confidence, e.source, e.actor1, e.actor2, e.fatalities, JSON.stringify(e.properties)],
    );
  }
  console.log(`Seeded ${events.length} events`);

  // ── Alerts ──
  const alertData = [
    { alertType: 'geofence', severity: 'HIGH', title: 'Vessel entered restricted zone', description: 'MMSI-200100000 entered Strait of Hormuz exclusion zone', entityId: 'MMSI-200100000', status: 'NEW' },
    { alertType: 'attribute', severity: 'CRITICAL', title: 'AIS transponder disabled', description: 'Vessel EVER SHADOW AIS signal lost for 2+ hours', entityId: 'MMSI-200200000', status: 'NEW' },
    { alertType: 'proximity', severity: 'MEDIUM', title: 'Vessels in close proximity', description: 'Two flagged vessels within 200m — potential STS transfer', entityId: 'MMSI-200300000', status: 'ACKNOWLEDGED' },
    { alertType: 'pattern', severity: 'HIGH', title: 'Route deviation detected', description: 'Aircraft FORTE12 deviated 45nm from standard ISR orbit', entityId: 'ICAO-a00000', status: 'ESCALATED' },
    { alertType: 'correlation', severity: 'MEDIUM', title: 'Correlated events detected', description: 'Internet outage in Iran coincides with military vessel movements', status: 'DISMISSED' },
  ];

  // Generate 30 alerts
  for (let i = 0; i < 30; i++) {
    const template = alertData[i % alertData.length];
    await client.query(
      'INSERT INTO alerts (alert_type, severity, title, description, entity_id, status) VALUES ($1, $2, $3, $4, $5, $6)',
      [template.alertType, template.severity, `${template.title} #${i + 1}`, template.description, template.entityId || null, template.status],
    );
  }
  console.log('Seeded 30 alerts');

  // ── Alert Rules ──
  const rules = [
    { name: 'Strait of Hormuz Geofence', ruleType: 'geofence', severity: 'HIGH', triggerCondition: { center: { lat: 26.5, lon: 56.2 }, radiusKm: 50 } },
    { name: 'AIS Dark Period > 2hrs', ruleType: 'attribute', severity: 'CRITICAL', triggerCondition: { attribute: 'aisGapMinutes', operator: '>', value: 120 } },
    { name: 'STS Transfer Proximity', ruleType: 'proximity', severity: 'MEDIUM', triggerCondition: { radiusMeters: 500, entityTypes: ['vessel'] } },
    { name: 'ISR Orbit Deviation', ruleType: 'pattern', severity: 'HIGH', triggerCondition: { deviationNm: 20, entityFilter: { category: 'military' } } },
    { name: 'Conflict-Internet Correlation', ruleType: 'correlation', severity: 'MEDIUM', triggerCondition: { eventTypes: ['internet_outage', 'military_movement'], timeWindowMinutes: 60 } },
  ];

  for (const r of rules) {
    await client.query(
      'INSERT INTO alert_rules (name, rule_type, severity, trigger_condition, created_by) VALUES ($1, $2, $3, $4, $5)',
      [r.name, r.ruleType, r.severity, JSON.stringify(r.triggerCondition), 'admin@sentinel.io'],
    );
  }
  console.log('Seeded 5 alert rules');

  // ── Cases ──
  const cases = [
    { name: 'Operation NEPTUNE WATCH', description: 'Monitoring suspicious vessel movements in the Strait of Hormuz', status: 'OPEN', owner: 'analyst1@sentinel.io', entityIds: ['MMSI-200100000', 'MMSI-200200000', 'MMSI-200300000'] },
    { name: 'DARK FLEET Investigation', description: 'Tracking vessels suspected of sanctions evasion via AIS manipulation', status: 'IN_PROGRESS', owner: 'analyst2@sentinel.io', entityIds: ['MMSI-200400000', 'MMSI-200500000'] },
    { name: 'GPS Jamming — Eastern Med', description: 'Investigating widespread GPS jamming affecting commercial aviation', status: 'OPEN', owner: 'analyst1@sentinel.io', entityIds: ['ICAO-a00000', 'ICAO-a00111'] },
    { name: 'ACLED Event Cluster — Sahel', description: 'Analysis of escalating conflict events in the Sahel region', status: 'CLOSED', owner: 'analyst3@sentinel.io', entityIds: [] },
    { name: 'Iranian Naval Expansion', description: 'Tracking IRGCN fleet movements and port construction', status: 'OPEN', owner: 'analyst2@sentinel.io', entityIds: ['MMSI-200600000'] },
    { name: 'Red Sea Shipping Disruption', description: 'Monitoring Houthi attacks on commercial shipping in the Red Sea', status: 'IN_PROGRESS', owner: 'analyst1@sentinel.io', entityIds: [] },
    { name: 'East Africa Piracy Resurgence', description: 'Assessing renewed piracy threats off the Horn of Africa', status: 'OPEN', owner: 'analyst3@sentinel.io', entityIds: [] },
    { name: 'Black Sea ISR Coverage', description: 'Monitoring NATO ISR flights over the Black Sea', status: 'IN_PROGRESS', owner: 'analyst2@sentinel.io', entityIds: ['ICAO-a00222'] },
    { name: 'Sanctions Evasion Network', description: 'Mapping the network of entities involved in oil sanctions evasion', status: 'OPEN', owner: 'analyst1@sentinel.io', entityIds: [] },
    { name: 'Space Object Conjunction Risk', description: 'Tracking potential satellite conjunctions and debris threats', status: 'OPEN', owner: 'analyst3@sentinel.io', entityIds: ['NORAD-25544'] },
  ];

  for (const c of cases) {
    const res = await client.query(
      'INSERT INTO cases (name, description, status, owner, entity_ids) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [c.name, c.description, c.status, c.owner, c.entityIds],
    );
    // Add activity
    await client.query(
      'INSERT INTO case_activities (case_id, action, actor, description) VALUES ($1, $2, $3, $4)',
      [res.rows[0].id, 'case_created', c.owner, `Created case "${c.name}"`],
    );
  }
  console.log('Seeded 10 cases');

  // ── Relationships ──
  const relationships = [
    { source: 'MMSI-200100000', target: 'MMSI-200200000', type: 'OBSERVED_NEAR', confidence: 0.85 },
    { source: 'MMSI-200200000', target: 'MMSI-200300000', type: 'STS_TRANSFER', confidence: 0.7 },
    { source: 'ICAO-a00000', target: 'ICAO-a00111', type: 'SAME_FLIGHT_PATH', confidence: 0.9 },
    { source: 'MMSI-200100000', target: 'ICAO-a00000', type: 'CO_LOCATED', confidence: 0.6 },
    { source: 'MMSI-200400000', target: 'MMSI-200500000', type: 'SAME_OWNER', confidence: 0.95 },
  ];

  for (const r of relationships) {
    await client.query(
      'INSERT INTO relationships (source_entity_id, target_entity_id, relationship_type, confidence, source) VALUES ($1, $2, $3, $4, $5)',
      [r.source, r.target, r.type, r.confidence, 'analyst'],
    );
  }
  console.log('Seeded relationships');

  // ── Done ──
  console.log('\nSeed complete!');
  console.log('  500 aircraft');
  console.log('  300 vessels');
  console.log('  50 satellites');
  console.log('  80 events');
  console.log('  30 alerts');
  console.log('  5 alert rules');
  console.log('  10 cases');
  console.log('  5 users');
  console.log('  5 relationships');

  await client.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
