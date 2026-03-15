/**
 * SENTINEL Seed Data
 * Creates default users, alert rules, and sample case.
 * Triggers one OSINT poll cycle to bootstrap live data.
 *
 * Usage: ts-node scripts/seed-data.ts
 */

import { Client } from 'pg';
import * as bcrypt from 'bcryptjs';

const client = new Client({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'sentinel',
  user: process.env.POSTGRES_USER || 'sentinel',
  password: process.env.POSTGRES_PASSWORD || 'sentinel_dev',
});

async function seed() {
  await client.connect();
  console.log('Connected to PostgreSQL');

  // ── Users ──────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('sentinel123', 10);
  const users = [
    { email: 'admin@sentinel.io', displayName: 'Admin User', role: 'admin', avatarColor: '#ef4444' },
    { email: 'analyst1@sentinel.io', displayName: 'Jane Smith', role: 'analyst', avatarColor: '#3b82f6' },
    { email: 'analyst2@sentinel.io', displayName: 'John Doe', role: 'analyst', avatarColor: '#10b981' },
  ];

  for (const u of users) {
    await client.query(
      `INSERT INTO users (email, password_hash, display_name, role, avatar_color)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO NOTHING`,
      [u.email, passwordHash, u.displayName, u.role, u.avatarColor],
    );
  }
  console.log(`Seeded ${users.length} users`);

  // ── Alert Rules ────────────────────────────────────────────
  const rules = [
    {
      name: 'Strait of Hormuz Geofence',
      ruleType: 'geofence',
      severity: 'HIGH',
      triggerCondition: {
        polygon: [
          [56.0, 26.0], [56.5, 26.0], [56.5, 27.0], [56.0, 27.0],
        ],
        entityTypes: ['vessel'],
      },
    },
    {
      name: 'AIS Gap > 6 Hours',
      ruleType: 'attribute',
      severity: 'CRITICAL',
      triggerCondition: {
        attribute: 'aisGapMinutes',
        operator: '>',
        value: 360,
        entityTypes: ['vessel'],
      },
    },
    {
      name: 'STS Transfer Proximity (<500m)',
      ruleType: 'proximity',
      severity: 'HIGH',
      triggerCondition: {
        radiusMeters: 500,
        durationMinutes: 30,
        entityTypes: ['vessel'],
      },
    },
    {
      name: 'GPS Jamming Zone Alert',
      ruleType: 'correlation',
      severity: 'HIGH',
      triggerCondition: {
        sources: ['gps_jamming', 'notam'],
        timeWindowMinutes: 60,
        minAffectedAircraft: 3,
      },
    },
    {
      name: 'ISR Orbit Deviation > 20nm',
      ruleType: 'pattern',
      severity: 'MEDIUM',
      triggerCondition: {
        deviationNm: 20,
        entityFilter: { category: 'military' },
      },
    },
    {
      name: 'Dark Fleet Vessel Detection',
      ruleType: 'correlation',
      severity: 'CRITICAL',
      triggerCondition: {
        combinedFactors: ['ais_gap', 'flag_risk', 'sts_transfer'],
        minRiskScore: 60,
      },
    },
    {
      name: 'Internet Outage + Conflict Correlation',
      ruleType: 'correlation',
      severity: 'HIGH',
      triggerCondition: {
        eventTypes: ['internet_outage', 'conflict'],
        timeWindowMinutes: 360,
        sameCountry: true,
      },
    },
  ];

  for (const r of rules) {
    await client.query(
      `INSERT INTO alert_rules (name, rule_type, severity, trigger_condition, created_by)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT DO NOTHING`,
      [r.name, r.ruleType, r.severity, JSON.stringify(r.triggerCondition), 'admin@sentinel.io'],
    );
  }
  console.log(`Seeded ${rules.length} alert rules`);

  // ── Sample Case ────────────────────────────────────────────
  const caseResult = await client.query(
    `INSERT INTO cases (name, description, status, owner, entity_ids)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT DO NOTHING
     RETURNING id`,
    [
      'Operation NEPTUNE WATCH',
      'Monitoring suspicious vessel movements in the Strait of Hormuz. Focus on AIS gap patterns, STS transfers, and sanctions evasion indicators.',
      'OPEN',
      'analyst1@sentinel.io',
      [],
    ],
  );

  if (caseResult.rows[0]?.id) {
    await client.query(
      `INSERT INTO case_activities (case_id, action, actor, description)
       VALUES ($1, $2, $3, $4)`,
      [caseResult.rows[0].id, 'case_created', 'admin@sentinel.io', 'Created case "Operation NEPTUNE WATCH"'],
    );
    console.log('Seeded sample case');
  }

  // ── Bootstrap: Trigger OSINT poll ──────────────────────────
  console.log('\nBootstrap: To populate live data, start the API server:');
  console.log('  pnpm --filter api run start:dev');
  console.log('\nAircraft will appear within 15s (Airplanes.live, no API key needed)');
  console.log('GDELT events will populate within 15 minutes');
  console.log('Maritime data requires AISSTREAM_API_KEY in .env');

  // ── Done ────────────────────────────────────────────────────
  console.log('\nSeed complete!');
  console.log('  3 users (password: sentinel123)');
  console.log('  7 alert rules');
  console.log('  1 sample case');

  await client.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
