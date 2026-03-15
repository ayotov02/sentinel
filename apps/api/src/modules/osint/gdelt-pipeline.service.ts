import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import { AiService } from '../ai/ai.service';
import { SanctionsService } from '../sanctions/sanctions.service';
import { EmbeddingsService } from '../embeddings/embeddings.service';

interface GdeltArticle {
  url: string;
  title: string;
  seendate: string;
  socialimage?: string;
  domain: string;
  language: string;
  sourcecountry: string;
  tone: number;
}

interface ExtractedEntity {
  name: string;
  type: 'person' | 'organization' | 'location' | 'vessel' | 'aircraft';
  confidence: number;
  context: string;
  properties: Record<string, unknown>;
}

@Injectable()
export class GdeltPipelineService {
  private readonly logger = new Logger(GdeltPipelineService.name);
  private lastFetchTime = new Date(Date.now() - 15 * 60 * 1000);

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly ai: AiService,
    private readonly sanctions: SanctionsService,
    private readonly embeddings: EmbeddingsService,
  ) {}

  @Cron('*/15 * * * *')
  async runPipeline() {
    try {
      this.logger.log('GDELT pipeline starting...');

      // Step 1: Fetch recent articles from GDELT DOC API
      const articles = await this.fetchGdeltArticles();
      if (articles.length === 0) {
        this.logger.log('No new GDELT articles found');
        return;
      }
      this.logger.log(`Fetched ${articles.length} GDELT articles`);

      // Step 2: Extract entities via Nova 2 Lite (batched)
      const allEntities: Array<ExtractedEntity & { sourceUrl: string; sourceTitle: string }> = [];
      const batchSize = 5;

      for (let i = 0; i < articles.length; i += batchSize) {
        const batch = articles.slice(i, i + batchSize);
        const batchText = batch
          .map((a) => `[${a.title}] (${a.sourcecountry}) ${a.url}`)
          .join('\n');

        try {
          const extracted = await this.extractEntitiesWithNova(batchText);
          for (const entity of extracted) {
            allEntities.push({
              ...entity,
              sourceUrl: batch[0].url,
              sourceTitle: batch[0].title,
            });
          }
        } catch (err) {
          this.logger.warn(`Entity extraction failed for batch ${i}: ${err}`);
        }
      }

      this.logger.log(`Extracted ${allEntities.length} entities from ${articles.length} articles`);

      // Step 3: Upsert entities to PostgreSQL
      await this.upsertEntities(allEntities);

      // Step 4: Screen against OpenSanctions
      for (const entity of allEntities) {
        if (entity.type === 'person' || entity.type === 'organization') {
          try {
            await this.sanctions.searchByName(entity.name);
          } catch {
            // Sanctions service may be unavailable
          }
        }
      }

      // Step 5: Index in pgvector embeddings
      for (const entity of allEntities) {
        try {
          await this.embeddings.indexEntity(entity.name, entity.type, entity.context);
        } catch {
          // Embeddings service may be unavailable
        }
      }

      this.lastFetchTime = new Date();
      this.logger.log(`GDELT pipeline complete: ${allEntities.length} entities processed`);
    } catch (err) {
      this.logger.error(`GDELT pipeline failed: ${err}`);
    }
  }

  private async fetchGdeltArticles(): Promise<GdeltArticle[]> {
    const timeFilter = this.lastFetchTime.toISOString().replace(/[-:T]/g, '').slice(0, 14);
    const query = encodeURIComponent('military OR sanctions OR vessel OR maritime OR conflict');
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${query}&mode=artlist&maxrecords=50&format=json&startdatetime=${timeFilter}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        this.logger.warn(`GDELT API returned ${response.status}`);
        return [];
      }
      const data = await response.json();
      return (data.articles || []).map((a: any) => ({
        url: a.url,
        title: a.title || '',
        seendate: a.seendate || '',
        socialimage: a.socialimage,
        domain: a.domain || '',
        language: a.language || 'English',
        sourcecountry: a.sourcecountry || '',
        tone: parseFloat(a.tone?.split(',')[0] || '0'),
      }));
    } catch (err) {
      this.logger.error(`GDELT fetch error: ${err}`);
      return [];
    }
  }

  private async extractEntitiesWithNova(text: string): Promise<ExtractedEntity[]> {
    try {
      const result = await this.ai.extractEntities(text);
      if (Array.isArray(result)) {
        return result.map((e: any) => ({
          name: e.name || e.entity || '',
          type: this.mapEntityType(e.type || e.entityType || 'person'),
          confidence: e.confidence || 0.7,
          context: e.context || text.slice(0, 200),
          properties: e.properties || {},
        }));
      }
      return [];
    } catch {
      return [];
    }
  }

  private mapEntityType(type: string): ExtractedEntity['type'] {
    const normalized = type.toLowerCase();
    if (normalized.includes('person') || normalized.includes('individual')) return 'person';
    if (normalized.includes('org') || normalized.includes('company') || normalized.includes('group')) return 'organization';
    if (normalized.includes('loc') || normalized.includes('place') || normalized.includes('country') || normalized.includes('city')) return 'location';
    if (normalized.includes('vessel') || normalized.includes('ship')) return 'vessel';
    if (normalized.includes('aircraft') || normalized.includes('plane')) return 'aircraft';
    return 'person';
  }

  private async upsertEntities(
    entities: Array<ExtractedEntity & { sourceUrl: string; sourceTitle: string }>,
  ) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      for (const e of entities) {
        const entityId = `gdelt-${e.type}-${e.name.toLowerCase().replace(/\s+/g, '-').slice(0, 50)}`;
        await client.query(
          `INSERT INTO entities (entity_type, entity_id, display_name, properties, source, confidence, last_seen)
           VALUES ($1, $2, $3, $4, 'gdelt', $5, NOW())
           ON CONFLICT (entity_id) DO UPDATE SET
             properties = entities.properties || EXCLUDED.properties,
             confidence = GREATEST(entities.confidence, EXCLUDED.confidence),
             last_seen = NOW()`,
          [
            e.type,
            entityId,
            e.name,
            JSON.stringify({
              ...e.properties,
              gdeltSource: e.sourceUrl,
              gdeltTitle: e.sourceTitle,
              extractedContext: e.context,
            }),
            e.confidence,
          ],
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      this.logger.error(`Failed to upsert GDELT entities: ${err}`);
    } finally {
      client.release();
    }
  }
}
