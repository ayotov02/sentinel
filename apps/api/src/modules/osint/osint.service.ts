import { Injectable, Logger, Inject, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import { AviationSource } from './sources/aviation.source';
import { MaritimeSource } from './sources/maritime.source';
import { ConflictSource } from './sources/conflict.source';
import { InternetSource } from './sources/internet.source';
import { SatellitesSource } from './sources/satellites.source';
import { NotamsSource } from './sources/notams.source';
import { FiresSource } from './sources/fires.source';
import { DisastersSource } from './sources/disasters.source';
import { GpsJammingService } from './gps-jamming.service';
import { DarkVesselService } from './dark-vessel.service';
import { CorrelationService } from './correlation.service';

interface CircuitBreaker {
  failures: number;
  lastFailure: number;
  isOpen: boolean;
}

@Injectable()
export class OsintService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OsintService.name);
  private readonly breakers = new Map<string, CircuitBreaker>();
  private readonly lastPoll = new Map<string, number>();

  private readonly aviation: AviationSource;
  private readonly maritime: MaritimeSource;
  private readonly conflict: ConflictSource;
  private readonly internet: InternetSource;
  private readonly satellites: SatellitesSource;
  private readonly notams: NotamsSource;
  private readonly fires: FiresSource;
  private readonly disasters: DisastersSource;

  private readonly sources: { name: string; intervalMs: number; fetch: () => Promise<any[]> }[];

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly config: ConfigService,
    private readonly gpsJamming: GpsJammingService,
    private readonly darkVessel: DarkVesselService,
    private readonly correlation: CorrelationService,
  ) {
    this.aviation = new AviationSource(config);
    this.maritime = new MaritimeSource(config);
    this.conflict = new ConflictSource(config);
    this.internet = new InternetSource(config);
    this.satellites = new SatellitesSource(config);
    this.notams = new NotamsSource(config);
    this.fires = new FiresSource(config);
    this.disasters = new DisastersSource(config);

    this.sources = [
      { name: 'aviation', intervalMs: 15_000, fetch: () => this.aviation.fetch() },
      { name: 'maritime', intervalMs: 5_000, fetch: () => this.maritime.fetch() },
      { name: 'conflict', intervalMs: 300_000, fetch: () => this.conflict.fetch() },
      { name: 'internet', intervalMs: 300_000, fetch: () => this.internet.fetch() },
      { name: 'satellites', intervalMs: 7_200_000, fetch: () => this.satellites.fetch() },
      { name: 'notams', intervalMs: 900_000, fetch: () => this.notams.fetch() },
      { name: 'fires', intervalMs: 1_800_000, fetch: () => this.fires.fetch() },
      { name: 'disasters', intervalMs: 60_000, fetch: () => this.disasters.fetch() },
    ];
  }

  async onModuleInit() {
    this.logger.log('OSINT Service starting — connecting to live data sources');
    // Start AISStream WebSocket connection
    try {
      await this.maritime.connect();
      this.maritime.on('batch', (batch: any[]) => {
        this.processUpdates(batch, 'aisstream').catch(err =>
          this.logger.error(`Failed to process maritime batch: ${err}`)
        );
      });
    } catch (err) {
      this.logger.warn(`Maritime WebSocket connection failed: ${err}`);
    }
  }

  async onModuleDestroy() {
    this.maritime.disconnect();
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
        this.logger.log(`Circuit breaker RESET for ${source.name}`);
      }

      this.lastPoll.set(source.name, now);

      try {
        const entities = await source.fetch();
        if (entities.length > 0) {
          await this.processUpdates(entities, source.name);
          this.logger.log(`${source.name}: ${entities.length} entities ingested`);
          // Post-processing: GPS jamming detection for aviation
          if (source.name === 'aviation') {
            this.gpsJamming.detectJammingZones(entities).catch(err =>
              this.logger.error(`GPS jamming detection failed: ${err}`)
            );
          }
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

  @Cron('*/5 * * * *') // Every 5 minutes
  async runCorrelations() {
    try {
      await this.correlation.runCorrelations();
    } catch (err) {
      this.logger.error(`Correlation engine failed: ${err}`);
    }
  }

  /**
   * Get current source health status
   */
  getSourceHealth(): Array<{ name: string; status: string; lastPoll: number; failures: number }> {
    return this.sources.map(s => {
      const breaker = this.breakers.get(s.name);
      const lastPollTime = this.lastPoll.get(s.name) || 0;
      let status = 'idle';
      if (breaker?.isOpen) status = 'circuit_open';
      else if (lastPollTime > 0 && (breaker?.failures || 0) === 0) status = 'healthy';
      else if ((breaker?.failures || 0) > 0) status = 'degraded';

      return {
        name: s.name,
        status,
        lastPoll: lastPollTime,
        failures: breaker?.failures || 0,
      };
    });
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
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
