import { Injectable, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';

export interface EntityPosition {
  entity_id: string;
  time: string | Date;
  lat: number;
  lon: number;
  altitude_m?: number;
  speed_kts?: number;
  heading?: number;
  source?: string;
}

@Injectable()
export class TimeseriesService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async insertPosition(pos: EntityPosition): Promise<any> {
    const result = await this.pool.query(
      `INSERT INTO entity_positions (entity_id, time, lat, lon, altitude_m, speed_kts, heading, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        pos.entity_id,
        pos.time,
        pos.lat,
        pos.lon,
        pos.altitude_m ?? null,
        pos.speed_kts ?? null,
        pos.heading ?? null,
        pos.source ?? null,
      ],
    );

    return result.rows[0];
  }

  async insertBatch(positions: EntityPosition[]): Promise<number> {
    if (positions.length === 0) return 0;

    const columns = [
      'entity_id',
      'time',
      'lat',
      'lon',
      'altitude_m',
      'speed_kts',
      'heading',
      'source',
    ];
    const valuesPerRow = columns.length;
    const params: any[] = [];
    const valuesClauses: string[] = [];

    for (let i = 0; i < positions.length; i++) {
      const offset = i * valuesPerRow;
      const placeholders = columns.map(
        (_, j) => `$${offset + j + 1}`,
      );
      valuesClauses.push(`(${placeholders.join(', ')})`);

      const pos = positions[i];
      params.push(
        pos.entity_id,
        pos.time,
        pos.lat,
        pos.lon,
        pos.altitude_m ?? null,
        pos.speed_kts ?? null,
        pos.heading ?? null,
        pos.source ?? null,
      );
    }

    const query = `
      INSERT INTO entity_positions (${columns.join(', ')})
      VALUES ${valuesClauses.join(', ')}
    `;

    const result = await this.pool.query(query, params);
    return result.rowCount ?? positions.length;
  }

  async getTrajectory(
    entityId: string,
    start: string | Date,
    end: string | Date,
  ): Promise<any> {
    const result = await this.pool.query(
      `SELECT
         entity_id,
         json_build_object(
           'type', 'LineString',
           'coordinates', json_agg(
             json_build_array(lon, lat, altitude_m) ORDER BY time
           )
         ) AS geojson,
         array_agg(speed_kts ORDER BY time) AS speeds
       FROM entity_positions
       WHERE entity_id = $1
         AND time BETWEEN $2 AND $3
       GROUP BY entity_id`,
      [entityId, start, end],
    );

    return result.rows[0] ?? null;
  }

  async getProximity(
    lat: number,
    lon: number,
    radiusMeters: number,
    timeWindow?: { start: string | Date; end: string | Date },
  ): Promise<any[]> {
    const conditions = [
      `ST_DWithin(
        ST_Point(lon, lat)::geography,
        ST_Point($2, $1)::geography,
        $3
      )`,
    ];
    const params: any[] = [lat, lon, radiusMeters];
    let paramIndex = 4;

    if (timeWindow?.start) {
      conditions.push(`time >= $${paramIndex++}`);
      params.push(timeWindow.start);
    }

    if (timeWindow?.end) {
      conditions.push(`time <= $${paramIndex++}`);
      params.push(timeWindow.end);
    }

    const query = `
      SELECT DISTINCT ON (entity_id) *
      FROM entity_positions
      WHERE ${conditions.join(' AND ')}
      ORDER BY entity_id, time DESC
    `;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getHourlySummary(
    entityId: string,
    start: string | Date,
    end: string | Date,
  ): Promise<any[]> {
    const result = await this.pool.query(
      `SELECT *
       FROM entity_hourly_summary
       WHERE entity_id = $1
         AND bucket BETWEEN $2 AND $3
       ORDER BY bucket`,
      [entityId, start, end],
    );

    return result.rows;
  }

  async getLatestPositions(entityType?: string): Promise<any[]> {
    let query: string;
    const params: any[] = [];

    if (entityType) {
      query = `
        SELECT DISTINCT ON (ep.entity_id) ep.*
        FROM entity_positions ep
        JOIN entities e ON e.entity_id = ep.entity_id
        WHERE e.entity_type = $1
        ORDER BY ep.entity_id, ep.time DESC
        LIMIT 5000
      `;
      params.push(entityType);
    } else {
      query = `
        SELECT DISTINCT ON (entity_id) *
        FROM entity_positions
        ORDER BY entity_id, time DESC
        LIMIT 5000
      `;
    }

    const result = await this.pool.query(query, params);
    return result.rows;
  }
}
