import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';

export interface EntityFilters {
  entityType?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

@Injectable()
export class EntitiesService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async findAll(filters: EntityFilters = {}): Promise<any[]> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.entityType) {
      conditions.push(`entity_type = $${paramIndex++}`);
      params.push(filters.entityType);
    }

    if (filters.search) {
      conditions.push(`display_name % $${paramIndex++}`);
      params.push(filters.search);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const limit = filters.limit ?? 100;
    const offset = filters.offset ?? 0;

    params.push(limit);
    const limitParam = paramIndex++;
    params.push(offset);
    const offsetParam = paramIndex++;

    const query = `
      SELECT *
      FROM entities
      ${whereClause}
      ORDER BY last_seen DESC NULLS LAST, created_at DESC
      LIMIT $${limitParam} OFFSET $${offsetParam}
    `;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async findById(id: string): Promise<any> {
    const result = await this.pool.query(
      'SELECT * FROM entities WHERE id = $1',
      [id],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Entity with id ${id} not found`);
    }

    return result.rows[0];
  }

  async findByEntityId(entityId: string): Promise<any> {
    const result = await this.pool.query(
      'SELECT * FROM entities WHERE entity_id = $1',
      [entityId],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(
        `Entity with entity_id ${entityId} not found`,
      );
    }

    return result.rows[0];
  }

  async upsert(entity: {
    entity_id: string;
    entity_type: string;
    display_name: string;
    properties?: Record<string, any>;
    source?: string;
    confidence?: number;
  }): Promise<any> {
    const result = await this.pool.query(
      `INSERT INTO entities (entity_id, entity_type, display_name, properties, source, confidence, last_seen)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (entity_id) DO UPDATE SET
         display_name = EXCLUDED.display_name,
         properties = EXCLUDED.properties,
         source = EXCLUDED.source,
         confidence = EXCLUDED.confidence,
         last_seen = NOW()
       RETURNING *`,
      [
        entity.entity_id,
        entity.entity_type,
        entity.display_name,
        JSON.stringify(entity.properties ?? {}),
        entity.source ?? null,
        entity.confidence ?? null,
      ],
    );

    return result.rows[0];
  }

  async search(query: string, limit = 20): Promise<any[]> {
    const result = await this.pool.query(
      `SELECT *, similarity(display_name, $1) AS sim
       FROM entities
       WHERE display_name % $1
       ORDER BY sim DESC
       LIMIT $2`,
      [query, limit],
    );

    return result.rows;
  }
}
