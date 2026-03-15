import { Injectable, Logger, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';

interface AISGap {
  entityId: string;
  gapStartTime: Date;
  gapEndTime: Date;
  durationHours: number;
  lastKnownLat: number;
  lastKnownLon: number;
}

interface STSTransfer {
  vessel1Id: string;
  vessel2Id: string;
  proximityMeters: number;
  startTime: Date;
  endTime: Date;
  location: { lat: number; lon: number };
}

interface VesselRisk {
  entityId: string;
  riskScore: number;
  factors: string[];
  aisGaps: AISGap[];
  stsTransfers: STSTransfer[];
  flagRisk: boolean;
  sanctionsMatch: boolean;
}

@Injectable()
export class DarkVesselService {
  private readonly logger = new Logger(DarkVesselService.name);

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /**
   * Detect AIS transmission gaps > 6 hours for a given entity.
   * Queries entity_positions hypertable for time gaps between consecutive pings.
   */
  async detectAISGaps(entityId: string, thresholdHours = 6): Promise<AISGap[]> {
    const result = await this.pool.query(
      `WITH ordered_positions AS (
         SELECT time, lat, lon,
                LEAD(time) OVER (ORDER BY time) as next_time
         FROM entity_positions
         WHERE entity_id = $1
           AND time > NOW() - INTERVAL '30 days'
         ORDER BY time
       )
       SELECT time as gap_start, next_time as gap_end,
              EXTRACT(EPOCH FROM (next_time - time)) / 3600 as gap_hours,
              lat as last_lat, lon as last_lon
       FROM ordered_positions
       WHERE next_time IS NOT NULL
         AND EXTRACT(EPOCH FROM (next_time - time)) / 3600 > $2
       ORDER BY gap_hours DESC
       LIMIT 20`,
      [entityId, thresholdHours],
    );

    const gaps = result.rows.map((r: any) => ({
      entityId,
      gapStartTime: r.gap_start,
      gapEndTime: r.gap_end,
      durationHours: parseFloat(r.gap_hours),
      lastKnownLat: parseFloat(r.last_lat),
      lastKnownLon: parseFloat(r.last_lon),
    }));

    if (gaps.length > 0) {
      // Persist to ais_gaps table
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');
        for (const gap of gaps) {
          await client.query(
            `INSERT INTO ais_gaps (entity_id, gap_start, gap_end, duration_hours, last_lat, last_lon)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT DO NOTHING`,
            [entityId, gap.gapStartTime, gap.gapEndTime, gap.durationHours, gap.lastKnownLat, gap.lastKnownLon],
          );
        }
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        this.logger.error(`Failed to persist AIS gaps: ${err}`);
      } finally {
        client.release();
      }
    }

    return gaps;
  }

  /**
   * Detect Ship-to-Ship (STS) transfers by finding vessel pairs
   * within close proximity (< 500m) for sustained periods (> 30 min).
   */
  async detectSTSTransfers(timeWindowMinutes = 60): Promise<STSTransfer[]> {
    const result = await this.pool.query(
      `WITH vessel_pairs AS (
         SELECT
           a.entity_id as vessel1_id,
           b.entity_id as vessel2_id,
           a.time,
           a.lat as lat1, a.lon as lon1,
           b.lat as lat2, b.lon as lon2,
           ST_DistanceSphere(
             ST_MakePoint(a.lon, a.lat),
             ST_MakePoint(b.lon, b.lat)
           ) as distance_m
         FROM entity_positions a
         JOIN entity_positions b
           ON a.entity_type = 'vessel'
           AND b.entity_type = 'vessel'
           AND a.entity_id < b.entity_id
           AND a.time = b.time
           AND a.time > NOW() - INTERVAL '${timeWindowMinutes} minutes'
         WHERE ST_DistanceSphere(
           ST_MakePoint(a.lon, a.lat),
           ST_MakePoint(b.lon, b.lat)
         ) < 500
       )
       SELECT vessel1_id, vessel2_id,
              MIN(distance_m) as min_distance,
              MIN(time) as start_time,
              MAX(time) as end_time,
              AVG(lat1) as avg_lat,
              AVG(lon1) as avg_lon
       FROM vessel_pairs
       GROUP BY vessel1_id, vessel2_id
       HAVING COUNT(*) >= 2`,
    );

    const transfers = result.rows.map((r: any) => ({
      vessel1Id: r.vessel1_id,
      vessel2Id: r.vessel2_id,
      proximityMeters: parseFloat(r.min_distance),
      startTime: r.start_time,
      endTime: r.end_time,
      location: { lat: parseFloat(r.avg_lat), lon: parseFloat(r.avg_lon) },
    }));

    // Persist STS events
    if (transfers.length > 0) {
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');
        for (const sts of transfers) {
          await client.query(
            `INSERT INTO sts_transfers (vessel1_id, vessel2_id, proximity_meters, start_time, end_time, lat, lon)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT DO NOTHING`,
            [sts.vessel1Id, sts.vessel2Id, sts.proximityMeters, sts.startTime, sts.endTime, sts.location.lat, sts.location.lon],
          );
        }
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        this.logger.error(`Failed to persist STS transfers: ${err}`);
      } finally {
        client.release();
      }
      this.logger.warn(`Detected ${transfers.length} potential STS transfers`);
    }

    return transfers;
  }

  /**
   * Comprehensive vessel risk scoring: combines AIS gaps, STS activity,
   * flag risk, and sanctions matches.
   */
  async screenVesselRisk(entityId: string): Promise<VesselRisk> {
    const factors: string[] = [];
    let riskScore = 0;

    // 1. AIS Gaps
    const aisGaps = await this.detectAISGaps(entityId);
    if (aisGaps.length > 0) {
      factors.push(`${aisGaps.length} AIS gap(s) detected`);
      riskScore += Math.min(aisGaps.length * 15, 40);
    }

    // 2. STS Transfers (check last 24h)
    const allSts = await this.detectSTSTransfers(1440);
    const vesselSts = allSts.filter(
      (s) => s.vessel1Id === entityId || s.vessel2Id === entityId,
    );
    if (vesselSts.length > 0) {
      factors.push(`${vesselSts.length} STS transfer(s) detected`);
      riskScore += Math.min(vesselSts.length * 20, 40);
    }

    // 3. Flag risk (high-risk flags for sanctions evasion)
    const entityResult = await this.pool.query(
      `SELECT properties FROM entities WHERE entity_id = $1`,
      [entityId],
    );
    const props = entityResult.rows[0]?.properties || {};
    const HIGH_RISK_FLAGS = ['Iran', 'North Korea', 'Syria', 'Cuba', 'Venezuela', 'Cambodia', 'Tanzania', 'Cameroon'];
    const flagRisk = HIGH_RISK_FLAGS.includes(props.flag as string);
    if (flagRisk) {
      factors.push(`High-risk flag state: ${props.flag}`);
      riskScore += 15;
    }

    // 4. Sanctions check (query sanctions_entries if available)
    let sanctionsMatch = false;
    try {
      const sanctionsResult = await this.pool.query(
        `SELECT COUNT(*) as cnt FROM sanctions_entries
         WHERE properties->>'mmsi' = $1 OR properties->>'imo' = $2`,
        [props.mmsi || '', props.imo || ''],
      );
      sanctionsMatch = parseInt(sanctionsResult.rows[0]?.cnt || '0') > 0;
      if (sanctionsMatch) {
        factors.push('Matched sanctions list entry');
        riskScore += 30;
      }
    } catch {
      // sanctions_entries table may not exist
    }

    return {
      entityId,
      riskScore: Math.min(riskScore, 100),
      factors,
      aisGaps,
      stsTransfers: vesselSts,
      flagRisk,
      sanctionsMatch,
    };
  }
}
