import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';

@Injectable()
export class IngestionService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async createJob(
    filename?: string,
    fileType?: string,
    rawText?: string,
  ): Promise<any> {
    const result = await this.pool.query(
      `INSERT INTO ingestion_jobs (filename, file_type, raw_text)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [filename ?? null, fileType ?? null, rawText ?? null],
    );

    return result.rows[0];
  }

  async getJobs(): Promise<any[]> {
    const result = await this.pool.query(
      'SELECT * FROM ingestion_jobs ORDER BY created_at DESC',
    );
    return result.rows;
  }

  async getJob(id: string): Promise<any> {
    const result = await this.pool.query(
      'SELECT * FROM ingestion_jobs WHERE id = $1',
      [id],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Ingestion job with id ${id} not found`);
    }

    return result.rows[0];
  }

  async updateExtractedEntities(
    jobId: string,
    entities: any[],
  ): Promise<any> {
    const entitiesJson = JSON.stringify(entities);

    const result = await this.pool.query(
      `UPDATE ingestion_jobs
       SET extracted_entities = $2::jsonb,
           status = 'REVIEW',
           entity_count = $3
       WHERE id = $1
       RETURNING *`,
      [jobId, entitiesJson, entities.length],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(
        `Ingestion job with id ${jobId} not found`,
      );
    }

    return result.rows[0];
  }

  async confirmEntities(
    jobId: string,
    confirmedEntities: any[],
  ): Promise<any> {
    const entitiesJson = JSON.stringify(confirmedEntities);

    const result = await this.pool.query(
      `UPDATE ingestion_jobs
       SET confirmed_entities = $2::jsonb,
           status = 'CONFIRMED',
           completed_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [jobId, entitiesJson],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(
        `Ingestion job with id ${jobId} not found`,
      );
    }

    return result.rows[0];
  }

  async failJob(jobId: string, error: string): Promise<any> {
    const result = await this.pool.query(
      `UPDATE ingestion_jobs
       SET status = 'FAILED',
           error = $2
       WHERE id = $1
       RETURNING *`,
      [jobId, error],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(
        `Ingestion job with id ${jobId} not found`,
      );
    }

    return result.rows[0];
  }
}
