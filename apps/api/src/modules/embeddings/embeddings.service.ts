import { Injectable, Logger } from '@nestjs/common';
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { InjectPool } from '../../modules/database/database.module';

export interface EmbeddingResult {
  embedding: number[];
  dimensions: number;
}

export interface SimilarityResult {
  id: string;
  content: string;
  source_url: string;
  entity_type: string;
  metadata: Record<string, unknown>;
  similarity: number;
}

@Injectable()
export class EmbeddingsService {
  private readonly logger = new Logger(EmbeddingsService.name);
  private readonly bedrockClient: BedrockRuntimeClient;
  private readonly modelId =
    'amazon.nova-2-multimodal-embeddings-v1:0';
  private readonly defaultDimension = 1024;

  constructor(
    private readonly configService: ConfigService,
    @InjectPool() private readonly pool: Pool,
  ) {
    this.bedrockClient = new BedrockRuntimeClient({
      region: this.configService.get<string>('AWS_REGION', 'us-east-1'),
    });
  }

  /**
   * Generate a 1024-dimension text embedding using Amazon Nova Multimodal Embeddings.
   */
  async embedText(
    text: string,
    purpose: 'RETRIEVAL' | 'CLASSIFICATION' | 'CLUSTERING' = 'RETRIEVAL',
  ): Promise<EmbeddingResult> {
    const requestBody = {
      taskType: 'SINGLE_EMBEDDING',
      singleEmbeddingParams: {
        embeddingPurpose: purpose,
        embeddingDimension: this.defaultDimension,
        text: {
          truncationMode: 'END',
          value: text,
        },
      },
    };

    const command = new InvokeModelCommand({
      modelId: this.modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(requestBody),
    });

    const response = await this.bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    return {
      embedding: responseBody.embedding,
      dimensions: this.defaultDimension,
    };
  }

  /**
   * Generate an image embedding for cross-modal search.
   */
  async embedImage(
    imageBase64: string,
    format: 'png' | 'jpeg' | 'gif' | 'webp' = 'png',
  ): Promise<EmbeddingResult> {
    const requestBody = {
      taskType: 'SINGLE_EMBEDDING',
      singleEmbeddingParams: {
        embeddingPurpose: 'RETRIEVAL',
        embeddingDimension: this.defaultDimension,
        image: {
          format,
          source: {
            bytes: imageBase64,
          },
        },
      },
    };

    const command = new InvokeModelCommand({
      modelId: this.modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(requestBody),
    });

    const response = await this.bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    return {
      embedding: responseBody.embedding,
      dimensions: this.defaultDimension,
    };
  }

  /**
   * Generate an embedding for the given content and INSERT into the
   * intelligence_embeddings table with pgvector.
   */
  async indexDocument(
    content: string,
    sourceUrl: string,
    entityType: string,
    metadata?: Record<string, unknown>,
  ): Promise<string> {
    const { embedding } = await this.embedText(content);
    const vectorLiteral = `[${embedding.join(',')}]`;

    const result = await this.pool.query(
      `INSERT INTO intelligence_embeddings
        (content, source_url, entity_type, metadata, embedding)
       VALUES ($1, $2, $3, $4, $5::vector)
       RETURNING id`,
      [
        content,
        sourceUrl,
        entityType,
        metadata ? JSON.stringify(metadata) : null,
        vectorLiteral,
      ],
    );

    const id: string = result.rows[0].id;
    this.logger.log(
      `Indexed document ${id} (entity_type=${entityType}, source=${sourceUrl})`,
    );
    return id;
  }

  /**
   * Embed the query text and perform cosine similarity search via pgvector.
   */
  async searchSimilar(
    query: string,
    limit = 10,
    entityTypeFilter?: string,
  ): Promise<SimilarityResult[]> {
    const { embedding } = await this.embedText(query);
    const vectorLiteral = `[${embedding.join(',')}]`;

    let sql = `
      SELECT
        id,
        content,
        source_url,
        entity_type,
        metadata,
        1 - (embedding <=> $1::vector) AS similarity
      FROM intelligence_embeddings
    `;
    const params: unknown[] = [vectorLiteral];

    if (entityTypeFilter) {
      sql += ` WHERE entity_type = $2`;
      params.push(entityTypeFilter);
    }

    sql += ` ORDER BY embedding <=> $1::vector ASC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await this.pool.query(sql, params);
    return result.rows as SimilarityResult[];
  }

  /**
   * Cross-modal image-to-text search: embed an image and find similar
   * text documents via cosine similarity.
   */
  async searchByImage(
    imageBase64: string,
    format: 'png' | 'jpeg' | 'gif' | 'webp' = 'png',
    limit = 10,
  ): Promise<SimilarityResult[]> {
    const { embedding } = await this.embedImage(imageBase64, format);
    const vectorLiteral = `[${embedding.join(',')}]`;

    const result = await this.pool.query(
      `SELECT
         id,
         content,
         source_url,
         entity_type,
         metadata,
         1 - (embedding <=> $1::vector) AS similarity
       FROM intelligence_embeddings
       ORDER BY embedding <=> $1::vector ASC
       LIMIT $2`,
      [vectorLiteral, limit],
    );

    return result.rows as SimilarityResult[];
  }
}
