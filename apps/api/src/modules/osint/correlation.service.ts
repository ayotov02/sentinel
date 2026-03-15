import { Injectable, Logger, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';

interface CorrelationAlert {
  correlationType: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  evidence: Array<{ source: string; detail: string; timestamp: Date }>;
  lat?: number;
  lon?: number;
}

@Injectable()
export class CorrelationService {
  private readonly logger = new Logger(CorrelationService.name);

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /**
   * Cross-source correlation engine. Checks for patterns across data sources:
   * - GPS jamming + NOTAM = likely military exercise
   * - Internet outage + conflict events = escalation indicator
   * - Vessel dark period + fire detection = sanctions evasion
   */
  async runCorrelations(): Promise<CorrelationAlert[]> {
    const alerts: CorrelationAlert[] = [];

    try {
      const [jammingAlerts, outageAlerts, darkVesselAlerts] = await Promise.allSettled([
        this.correlateJammingNotam(),
        this.correlateOutageConflict(),
        this.correlateDarkVesselFire(),
      ]);

      if (jammingAlerts.status === 'fulfilled') alerts.push(...jammingAlerts.value);
      if (outageAlerts.status === 'fulfilled') alerts.push(...outageAlerts.value);
      if (darkVesselAlerts.status === 'fulfilled') alerts.push(...darkVesselAlerts.value);

      // Persist correlation alerts
      if (alerts.length > 0) {
        await this.persistAlerts(alerts);
        this.logger.log(`Generated ${alerts.length} correlation alerts`);
      }
    } catch (err) {
      this.logger.error(`Correlation engine error: ${err}`);
    }

    return alerts;
  }

  /**
   * GPS jamming zones overlapping with active NOTAMs → likely military activity
   */
  private async correlateJammingNotam(): Promise<CorrelationAlert[]> {
    const result = await this.pool.query(
      `SELECT j.grid_cell, j.center_lat, j.center_lon, j.severity, j.affected_aircraft,
              e.display_name as notam_name, e.properties as notam_props
       FROM gps_jamming_zones j
       JOIN entities e ON e.entity_type = 'event' AND e.source = 'notam'
       WHERE j.time > NOW() - INTERVAL '1 hour'
         AND e.last_seen > NOW() - INTERVAL '24 hours'
         AND ST_DWithin(
           ST_MakePoint(j.center_lon, j.center_lat)::geography,
           ST_MakePoint(
             CAST(e.properties->>'lon' AS float),
             CAST(e.properties->>'lat' AS float)
           )::geography,
           100000
         )`,
    );

    return result.rows.map((r: any) => ({
      correlationType: 'jamming_notam',
      severity: r.severity === 'severe' ? 'CRITICAL' : 'HIGH',
      title: 'GPS Jamming Correlated with NOTAM',
      description: `GPS jamming zone at ${r.center_lat.toFixed(2)}, ${r.center_lon.toFixed(2)} (${r.affected_aircraft} aircraft affected) overlaps with active NOTAM: ${r.notam_name}. Likely military exercise or electronic warfare activity.`,
      evidence: [
        { source: 'gps_jamming', detail: `${r.severity} severity, ${r.affected_aircraft} aircraft`, timestamp: new Date() },
        { source: 'notam', detail: r.notam_name, timestamp: new Date() },
      ],
      lat: parseFloat(r.center_lat),
      lon: parseFloat(r.center_lon),
    }));
  }

  /**
   * Internet outage + conflict events in same region → escalation indicator
   */
  private async correlateOutageConflict(): Promise<CorrelationAlert[]> {
    const result = await this.pool.query(
      `SELECT
         o.entity_id as outage_entity, o.display_name as outage_name,
         o.properties as outage_props,
         e.event_type, e.description as event_desc,
         e.lat as event_lat, e.lon as event_lon, e.severity as event_severity
       FROM entities o
       JOIN events e ON e.timestamp > NOW() - INTERVAL '6 hours'
       WHERE o.entity_type = 'event' AND o.source = 'ioda'
         AND o.last_seen > NOW() - INTERVAL '6 hours'
         AND e.event_type IN ('Battles', 'Explosions/Remote violence')
         AND e.properties->>'country' = o.properties->>'country'
       LIMIT 10`,
    );

    return result.rows.map((r: any) => ({
      correlationType: 'outage_conflict',
      severity: 'HIGH' as const,
      title: 'Internet Outage + Conflict Escalation',
      description: `Internet outage detected for ${r.outage_name} coincides with ${r.event_type} events. This pattern is consistent with conflict escalation or deliberate communication disruption.`,
      evidence: [
        { source: 'ioda', detail: `Outage: ${r.outage_name}`, timestamp: new Date() },
        { source: 'acled', detail: `${r.event_type}: ${r.event_desc}`, timestamp: new Date() },
      ],
      lat: r.event_lat ? parseFloat(r.event_lat) : undefined,
      lon: r.event_lon ? parseFloat(r.event_lon) : undefined,
    }));
  }

  /**
   * Vessel AIS dark period + fire detection nearby → possible sanctions evasion (STS + destruction of evidence)
   */
  private async correlateDarkVesselFire(): Promise<CorrelationAlert[]> {
    const result = await this.pool.query(
      `SELECT g.entity_id, g.last_lat, g.last_lon, g.duration_hours,
              e.display_name as vessel_name,
              f.display_name as fire_name, f.properties as fire_props
       FROM ais_gaps g
       JOIN entities e ON e.entity_id = g.entity_id
       JOIN entities f ON f.entity_type = 'event' AND f.source = 'firms'
       WHERE g.gap_start > NOW() - INTERVAL '48 hours'
         AND g.duration_hours > 6
         AND f.last_seen > NOW() - INTERVAL '48 hours'
         AND ST_DWithin(
           ST_MakePoint(g.last_lon, g.last_lat)::geography,
           ST_MakePoint(
             CAST(f.properties->>'lon' AS float),
             CAST(f.properties->>'lat' AS float)
           )::geography,
           50000
         )
       LIMIT 5`,
    );

    return result.rows.map((r: any) => ({
      correlationType: 'dark_vessel_fire',
      severity: 'CRITICAL' as const,
      title: 'Dark Vessel + Fire Detection',
      description: `Vessel ${r.vessel_name} (${r.entity_id}) went dark for ${r.duration_hours.toFixed(1)}h near fire hotspot ${r.fire_name}. Pattern consistent with sanctions evasion via STS transfer with evidence destruction.`,
      evidence: [
        { source: 'ais_gap', detail: `${r.duration_hours.toFixed(1)}h dark at ${r.last_lat.toFixed(2)}, ${r.last_lon.toFixed(2)}`, timestamp: new Date() },
        { source: 'firms', detail: `Fire: ${r.fire_name}`, timestamp: new Date() },
      ],
      lat: parseFloat(r.last_lat),
      lon: parseFloat(r.last_lon),
    }));
  }

  private async persistAlerts(alerts: CorrelationAlert[]) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      for (const a of alerts) {
        await client.query(
          `INSERT INTO alerts (alert_type, severity, title, description, lat, lon, status, properties)
           VALUES ('correlation', $1, $2, $3, $4, $5, 'NEW', $6)`,
          [a.severity, a.title, a.description, a.lat || null, a.lon || null, JSON.stringify({ evidence: a.evidence, correlationType: a.correlationType })],
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      this.logger.error(`Failed to persist correlation alerts: ${err}`);
    } finally {
      client.release();
    }
  }
}
