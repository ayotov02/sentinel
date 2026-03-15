import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';

export interface CaseFilters {
  status?: string;
  owner?: string;
}

@Injectable()
export class CasesService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async findAll(filters: CaseFilters = {}): Promise<any[]> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(filters.status);
    }

    if (filters.owner) {
      conditions.push(`owner = $${paramIndex++}`);
      params.push(filters.owner);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT *
      FROM cases
      ${whereClause}
      ORDER BY updated_at DESC
    `;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async findById(id: string): Promise<any> {
    const result = await this.pool.query(
      'SELECT * FROM cases WHERE id = $1',
      [id],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Case with id ${id} not found`);
    }

    return result.rows[0];
  }

  async create(data: {
    name: string;
    description?: string;
    classification?: string;
    owner?: string;
  }): Promise<any> {
    const result = await this.pool.query(
      `INSERT INTO cases (name, description, classification, owner)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        data.name,
        data.description ?? null,
        data.classification ?? 'UNCLASSIFIED',
        data.owner ?? null,
      ],
    );

    return result.rows[0];
  }

  async update(
    id: string,
    data: {
      name?: string;
      description?: string;
      status?: string;
      classification?: string;
    },
  ): Promise<any> {
    const result = await this.pool.query(
      `UPDATE cases
       SET name = COALESCE($2, name),
           description = COALESCE($3, description),
           status = COALESCE($4, status),
           classification = COALESCE($5, classification),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [
        id,
        data.name ?? null,
        data.description ?? null,
        data.status ?? null,
        data.classification ?? null,
      ],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Case with id ${id} not found`);
    }

    return result.rows[0];
  }

  async delete(id: string): Promise<void> {
    const result = await this.pool.query(
      'DELETE FROM cases WHERE id = $1',
      [id],
    );

    if (result.rowCount === 0) {
      throw new NotFoundException(`Case with id ${id} not found`);
    }
  }

  async addEntity(caseId: string, entityId: string): Promise<any> {
    const result = await this.pool.query(
      `UPDATE cases
       SET entity_ids = array_append(entity_ids, $2),
           updated_at = NOW()
       WHERE id = $1 AND NOT ($2 = ANY(entity_ids))
       RETURNING *`,
      [caseId, entityId],
    );

    if (result.rows.length === 0) {
      // Could be not found or already present; check existence
      const existing = await this.pool.query(
        'SELECT id FROM cases WHERE id = $1',
        [caseId],
      );

      if (existing.rows.length === 0) {
        throw new NotFoundException(`Case with id ${caseId} not found`);
      }

      // Entity already in the case, return the current state
      return this.findById(caseId);
    }

    return result.rows[0];
  }

  async removeEntity(caseId: string, entityId: string): Promise<any> {
    const result = await this.pool.query(
      `UPDATE cases
       SET entity_ids = array_remove(entity_ids, $2),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [caseId, entityId],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Case with id ${caseId} not found`);
    }

    return result.rows[0];
  }

  async addActivity(
    caseId: string,
    action: string,
    actor: string,
    description?: string,
  ): Promise<any> {
    const result = await this.pool.query(
      `INSERT INTO case_activities (case_id, action, actor, description)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [caseId, action, actor, description ?? null],
    );

    return result.rows[0];
  }

  async getActivities(caseId: string): Promise<any[]> {
    const result = await this.pool.query(
      `SELECT *
       FROM case_activities
       WHERE case_id = $1
       ORDER BY created_at DESC`,
      [caseId],
    );

    return result.rows;
  }
}
