import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import { OpenSkySource } from './sources/opensky.source';
import { AdsbExchangeSource } from './sources/adsb-exchange.source';
import { AisHubSource } from './sources/aishub.source';
import { AcledSource } from './sources/acled.source';
import { IodaSource } from './sources/ioda.source';
import { SpaceTrackSource } from './sources/spacetrack.source';
import { NotamSource } from './sources/notam.source';
import { FirmsSource } from './sources/firms.source';

interface CircuitBreaker {
  failures: number;
  lastFailure: number;
  isOpen: boolean;
}

@Injectable()
export class OsintService {
  private readonly logger = new Logger(OsintService.name);
  private readonly breakers = new Map<string, CircuitBreaker>();
  private readonly lastPoll = new Map<string, number>();

  private readonly sources: { name: string; intervalMs: number; fetch: () => Promise<any[]> }[];

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly config: ConfigService,
  ) {
    const opensky = new OpenSkySource(config);
    const adsb = new AdsbExchangeSource(config);
    const ais = new AisHubSource(config);
    const acled = new AcledSource(config);
    const ioda = new IodaSource(config);
    const spacetrack = new SpaceTrackSource(config);
    const notam = new NotamSource(config);
    const firms = new FirmsSource(config);

    this.sources = [
      { name: 'opensky', intervalMs: 10_000, fetch: () => opensky.fetch() },
      { name: 'adsb-exchange', intervalMs: 5_000, fetch: () => adsb.fetch() },
      { name: 'aishub', intervalMs: 60_000, fetch: () => ais.fetch() },
      { name: 'acled', intervalMs: 86_400_000, fetch: () => acled.fetch() },
      { name: 'ioda', intervalMs: 300_000, fetch: () => ioda.fetch() },
      { name: 'spacetrack', intervalMs: 3_600_000, fetch: () => spacetrack.fetch() },
      { name: 'notam', intervalMs: 900_000, fetch: () => notam.fetch() },
      { name: 'firms', intervalMs: 1_800_000, fetch: () => firms.fetch() },
    ];
  }

  @Cron(CronExpression.EVERY_5_SECONDS)
  async pollSources() {
    const now = Date.now();
    for (const source of this.sources) {
      const last = this.lastPoll.get(source.name) || 0;
      if (now - last < source.intervalMs) continue;

      const breaker = this.breakers.get(source.name) || { failures: 0, lastFailure: 0, isOpen: false };
      if (breaker.isOpen && now - breaker.lastFailure < 60_000) continue;
      if (breaker.isOpen) {
        breaker.isOpen = false;
        breaker.failures = 0;
      }

      this.lastPoll.set(source.name, now);

      try {
        const entities = await source.fetch();
        if (entities.length > 0) {
          await this.processUpdates(entities, source.name);
        }
        breaker.failures = 0;
        this.breakers.set(source.name, breaker);
      } catch (err) {
        breaker.failures++;
        breaker.lastFailure = now;
        if (breaker.failures >= 5) {
          breaker.isOpen = true;
          this.logger.warn(`Circuit breaker OPEN for ${source.name} after ${breaker.failures} failures`);
        }
        this.breakers.set(source.name, breaker);
        this.logger.error(`Failed to poll ${source.name}: ${err}`);
      }
    }
  }

  private async processUpdates(entities: any[], sourceName: string) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      for (const e of entities) {
        // Upsert entity
        await client.query(
          `INSERT INTO entities (entity_type, entity_id, display_name, properties, source, confidence, last_seen)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())
           ON CONFLICT (entity_id) DO UPDATE SET
             display_name = COALESCE(EXCLUDED.display_name, entities.display_name),
             properties = entities.properties || EXCLUDED.properties,
             source = EXCLUDED.source,
             confidence = EXCLUDED.confidence,
             last_seen = NOW()`,
          [e.entityType, e.entityId, e.displayName, JSON.stringify(e.properties || {}), sourceName, e.confidence || 1.0]
        );
        // Insert position if lat/lon present
        if (e.lat != null && e.lon != null) {
          await client.query(
            `INSERT INTO entity_positions (time, entity_id, entity_type, lat, lon, altitude_m, heading, speed_kts, source, confidence, raw_data)
             VALUES (NOW(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [e.entityId, e.entityType, e.lat, e.lon, e.altitude || null, e.heading || null, e.speed || null, sourceName, e.confidence || 1.0, JSON.stringify(e.rawData || {})]
          );
        }
      }
      await client.query('COMMIT');
      this.logger.debug(`Processed ${entities.length} entities from ${sourceName}`);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
