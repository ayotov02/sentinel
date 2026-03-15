import { Injectable, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';

export interface SearchFilters {
  types?: string[];
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  type: string;
  id: string;
  title: string;
  subtitle: string | null;
  score: number;
}

@Injectable()
export class SearchService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async globalSearch(
    query: string,
    filters: SearchFilters = {},
  ): Promise<SearchResult[]> {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const limit = filters.limit ?? 50;
    const offset = filters.offset ?? 0;
    const types = filters.types ?? ['entity', 'event', 'case'];

    const unionParts: string[] = [];
    const params: any[] = [query];
    let paramIndex = 2;

    if (types.includes('entity')) {
      unionParts.push(`
        SELECT
          'entity' AS type,
          id::text,
          display_name AS title,
          entity_type AS subtitle,
          similarity(display_name, $1) AS score
        FROM entities
        WHERE display_name % $1 OR entity_id ILIKE $1 || '%'
      `);
    }

    if (types.includes('event')) {
      unionParts.push(`
        SELECT
          'event' AS type,
          id::text,
          COALESCE(description, event_type) AS title,
          event_type AS subtitle,
          CASE
            WHEN description ILIKE '%' || $1 || '%' THEN 0.5
            ELSE 0.3
          END AS score
        FROM events
        WHERE description ILIKE '%' || $1 || '%'
      `);
    }

    if (types.includes('case')) {
      unionParts.push(`
        SELECT
          'case' AS type,
          id::text,
          name AS title,
          status AS subtitle,
          CASE
            WHEN name ILIKE '%' || $1 || '%' THEN 0.7
            ELSE 0.3
          END AS score
        FROM cases
        WHERE name ILIKE '%' || $1 || '%'
      `);
    }

    if (unionParts.length === 0) {
      return [];
    }

    params.push(limit);
    const limitParam = paramIndex++;
    params.push(offset);
    const offsetParam = paramIndex++;

    const sql = `
      SELECT type, id, title, subtitle, score
      FROM (
        ${unionParts.join(' UNION ALL ')}
      ) AS results
      ORDER BY score DESC
      LIMIT $${limitParam} OFFSET $${offsetParam}
    `;

    const result = await this.pool.query(sql, params);
    return result.rows;
  }

  async autocomplete(
    query: string,
    limit = 10,
  ): Promise<Array<{ id: string; label: string; type: string }>> {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const result = await this.pool.query(
      `SELECT id::text, display_name AS label, entity_type AS type
       FROM entities
       WHERE display_name ILIKE $1 || '%' OR entity_id ILIKE $1 || '%'
       ORDER BY last_seen DESC NULLS LAST
       LIMIT $2`,
      [query, limit],
    );

    return result.rows;
  }
}
