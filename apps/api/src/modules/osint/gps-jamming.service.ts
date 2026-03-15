import { Injectable, Logger, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';

interface JammingZone {
  id?: string;
  gridCell: string;
  centerLat: number;
  centerLon: number;
  radiusKm: number;
  severity: 'low' | 'medium' | 'high' | 'severe';
  affectedAircraft: number;
  avgNacpDegradation: number;
  firstDetected: Date;
  lastDetected: Date;
}

@Injectable()
export class GpsJammingService {
  private readonly logger = new Logger(GpsJammingService.name);

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /**
   * Detect GPS jamming zones by analyzing NACp degradation in ADS-B data.
   * Groups aircraft by grid cell, calculates NACp degradation ratios.
   */
  async detectJammingZones(aircraftStates: any[]): Promise<JammingZone[]> {
    if (!aircraftStates?.length) return [];

    // Grid cell size: ~0.5 degrees (~55km at equator)
    const GRID_SIZE = 0.5;
    const gridCells = new Map<string, any[]>();

    // Group aircraft by grid cell
    for (const ac of aircraftStates) {
      if (ac.lat == null || ac.lon == null) continue;
      const gridLat = Math.floor(ac.lat / GRID_SIZE) * GRID_SIZE;
      const gridLon = Math.floor(ac.lon / GRID_SIZE) * GRID_SIZE;
      const key = `${gridLat.toFixed(1)},${gridLon.toFixed(1)}`;

      if (!gridCells.has(key)) gridCells.set(key, []);
      gridCells.get(key)!.push(ac);
    }

    const zones: JammingZone[] = [];

    for (const [key, aircraft] of gridCells) {
      // Need minimum 3 aircraft in cell for meaningful detection
      if (aircraft.length < 3) continue;

      // Calculate NACp degradation ratio
      // NACp < 7 indicates degraded GPS accuracy
      const degraded = aircraft.filter(
        (ac: any) => ac.properties?.nacp != null && ac.properties.nacp < 7,
      );
      const degradationRatio = degraded.length / aircraft.length;

      // Skip if degradation ratio below threshold
      if (degradationRatio < 0.3) continue;

      const [lat, lon] = key.split(',').map(Number);
      const avgNacp =
        degraded.reduce((sum: number, ac: any) => sum + (ac.properties?.nacp || 0), 0) /
        (degraded.length || 1);

      let severity: JammingZone['severity'] = 'low';
      if (degradationRatio > 0.8) severity = 'severe';
      else if (degradationRatio > 0.6) severity = 'high';
      else if (degradationRatio > 0.4) severity = 'medium';

      const zone: JammingZone = {
        gridCell: key,
        centerLat: lat + GRID_SIZE / 2,
        centerLon: lon + GRID_SIZE / 2,
        radiusKm: GRID_SIZE * 55,
        severity,
        affectedAircraft: degraded.length,
        avgNacpDegradation: 11 - avgNacp, // NACp 11 is best, degradation = 11 - actual
        firstDetected: new Date(),
        lastDetected: new Date(),
      };

      zones.push(zone);
    }

    // Persist detected zones
    if (zones.length > 0) {
      await this.persistZones(zones);
      this.logger.log(`Detected ${zones.length} GPS jamming zones`);
    }

    return zones;
  }

  private async persistZones(zones: JammingZone[]) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      for (const z of zones) {
        await client.query(
          `INSERT INTO gps_jamming_zones (time, grid_cell, center_lat, center_lon, radius_km, severity, affected_aircraft, avg_nacp_degradation)
           VALUES (NOW(), $1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (grid_cell, time) DO UPDATE SET
             severity = EXCLUDED.severity,
             affected_aircraft = EXCLUDED.affected_aircraft,
             avg_nacp_degradation = EXCLUDED.avg_nacp_degradation`,
          [z.gridCell, z.centerLat, z.centerLon, z.radiusKm, z.severity, z.affectedAircraft, z.avgNacpDegradation],
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      this.logger.error(`Failed to persist jamming zones: ${err}`);
    } finally {
      client.release();
    }
  }

  /**
   * Get currently active jamming zones (detected in last 30 minutes)
   */
  async getActiveZones(): Promise<JammingZone[]> {
    const result = await this.pool.query(
      `SELECT DISTINCT ON (grid_cell)
         grid_cell, center_lat, center_lon, radius_km, severity,
         affected_aircraft, avg_nacp_degradation,
         MIN(time) as first_detected, MAX(time) as last_detected
       FROM gps_jamming_zones
       WHERE time > NOW() - INTERVAL '30 minutes'
       GROUP BY grid_cell, center_lat, center_lon, radius_km, severity, affected_aircraft, avg_nacp_degradation
       ORDER BY grid_cell, last_detected DESC`,
    );
    return result.rows.map((r: any) => ({
      gridCell: r.grid_cell,
      centerLat: parseFloat(r.center_lat),
      centerLon: parseFloat(r.center_lon),
      radiusKm: parseFloat(r.radius_km),
      severity: r.severity,
      affectedAircraft: r.affected_aircraft,
      avgNacpDegradation: parseFloat(r.avg_nacp_degradation),
      firstDetected: r.first_detected,
      lastDetected: r.last_detected,
    }));
  }
}
