import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BedrockRuntimeClient,
  ConverseCommand,
  ConverseStreamCommand,
  InvokeModelCommand,
  ThrottlingException,
  type ContentBlock,
  type Message,
  type SystemContentBlock,
  type Tool,
  type ToolConfiguration,
} from '@aws-sdk/client-bedrock-runtime';
import { ENTITY_EXTRACTION_PROMPT } from './prompts/entity-extraction';
import { CHAT_SYSTEM_PROMPT } from './prompts/chat-system';
import { BRIEFING_TEMPLATE } from './prompts/briefing-template';
import { ANOMALY_DETECTION_PROMPT } from './prompts/anomaly-detection';

// ---------------------------------------------------------------------------
// Model IDs
// ---------------------------------------------------------------------------
const MODEL_NOVA_LITE = 'us.amazon.nova-2-lite-v1:0';
const MODEL_NOVA_PRO = 'us.amazon.nova-pro-v1:0';
const MODEL_NOVA_PREMIER = 'us.amazon.nova-premier-v1:0';
const MODEL_NOVA_CANVAS = 'amazon.nova-canvas-v1:0';
const MODEL_NOVA_EMBEDDINGS = 'amazon.nova-2-multimodal-embeddings-v1:0';

// ---------------------------------------------------------------------------
// Retry configuration
// ---------------------------------------------------------------------------
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;

// ---------------------------------------------------------------------------
// Entity extraction tool schema (used for constrained decoding)
// ---------------------------------------------------------------------------
const EXTRACT_OSINT_ENTITIES_TOOL: Tool = {
  toolSpec: {
    name: 'ExtractOSINTEntities',
    description:
      'Extract structured OSINT entities from the provided intelligence text. Returns persons, organizations, locations, vessels, aircraft, relationships, and risk indicators.',
    inputSchema: {
      json: {
        type: 'object',
        properties: {
          persons: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Full name of the person' },
                aliases: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Known aliases or alternate names',
                },
                role: { type: 'string', description: 'Role, title, or position' },
                nationality: { type: 'string', description: 'Known nationality' },
                confidence: {
                  type: 'number',
                  minimum: 0,
                  maximum: 1,
                  description: 'Confidence score 0.0-1.0',
                },
                context: { type: 'string', description: 'Surrounding context from the source text' },
              },
              required: ['name', 'confidence'],
            },
            description: 'Extracted person entities',
          },
          organizations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Organization name' },
                type: {
                  type: 'string',
                  enum: ['government', 'military', 'corporate', 'ngo', 'criminal', 'other'],
                  description: 'Organization type',
                },
                country: { type: 'string', description: 'Country of origin or base' },
                confidence: { type: 'number', minimum: 0, maximum: 1 },
                context: { type: 'string' },
              },
              required: ['name', 'confidence'],
            },
            description: 'Extracted organization entities',
          },
          locations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Location name' },
                type: {
                  type: 'string',
                  enum: ['city', 'country', 'region', 'facility', 'base', 'port', 'airfield', 'coordinates', 'other'],
                },
                coordinates: {
                  type: 'object',
                  properties: {
                    lat: { type: 'number' },
                    lon: { type: 'number' },
                  },
                  description: 'Geographic coordinates if available',
                },
                confidence: { type: 'number', minimum: 0, maximum: 1 },
                context: { type: 'string' },
              },
              required: ['name', 'confidence'],
            },
            description: 'Extracted location entities',
          },
          vessels: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Vessel name' },
                mmsi: { type: 'string', description: 'MMSI number' },
                imo: { type: 'string', description: 'IMO number' },
                flag: { type: 'string', description: 'Flag state' },
                type: { type: 'string', description: 'Vessel type (tanker, cargo, military, etc.)' },
                confidence: { type: 'number', minimum: 0, maximum: 1 },
                context: { type: 'string' },
              },
              required: ['name', 'confidence'],
            },
            description: 'Extracted vessel entities',
          },
          aircraft: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                identifier: {
                  type: 'string',
                  description: 'Callsign, tail number, or ICAO hex code',
                },
                type: { type: 'string', description: 'Aircraft type/model' },
                operator: { type: 'string', description: 'Known operator' },
                confidence: { type: 'number', minimum: 0, maximum: 1 },
                context: { type: 'string' },
              },
              required: ['identifier', 'confidence'],
            },
            description: 'Extracted aircraft entities',
          },
          relationships: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                source: { type: 'string', description: 'Source entity name' },
                target: { type: 'string', description: 'Target entity name' },
                type: {
                  type: 'string',
                  enum: [
                    'owns',
                    'operates',
                    'commands',
                    'affiliated_with',
                    'located_at',
                    'traveled_to',
                    'met_with',
                    'financial_link',
                    'supplies',
                    'other',
                  ],
                },
                description: { type: 'string' },
                confidence: { type: 'number', minimum: 0, maximum: 1 },
              },
              required: ['source', 'target', 'type', 'confidence'],
            },
            description: 'Relationships between extracted entities',
          },
          riskIndicators: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                indicator: { type: 'string', description: 'Description of the risk indicator' },
                severity: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
                entities: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Entity names involved',
                },
                confidence: { type: 'number', minimum: 0, maximum: 1 },
              },
              required: ['indicator', 'severity', 'confidence'],
            },
            description: 'Identified risk indicators or threat signals',
          },
        },
        required: [
          'persons',
          'organizations',
          'locations',
          'vessels',
          'aircraft',
          'relationships',
          'riskIndicators',
        ],
      },
    },
  },
};

// ---------------------------------------------------------------------------
// Helper: pad system prompt to >= 1024 tokens for cachePoint eligibility
// ---------------------------------------------------------------------------
function buildCachedSystemBlocks(prompt: string): SystemContentBlock[] {
  // The prompt must be at least ~1024 tokens for caching to activate.
  // We pad with whitespace context if the prompt is short.
  const paddedPrompt =
    prompt.length >= 3000
      ? prompt
      : prompt +
        '\n\n' +
        '— '.repeat(600) +
        '\n[End of system instructions. The above padding ensures prompt caching eligibility.]';

  return [
    { text: paddedPrompt },
    // cachePoint marker tells Bedrock to cache everything above this block
    { cachePoint: { type: 'default' } } as unknown as SystemContentBlock,
  ];
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------
@Injectable()
export class AiService implements OnModuleInit {
  private readonly logger = new Logger(AiService.name);
  private client: BedrockRuntimeClient;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const region = this.config.get<string>('AWS_REGION', 'us-east-1');
    const accessKeyId = this.config.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.config.get<string>('AWS_SECRET_ACCESS_KEY');

    const clientConfig: Record<string, unknown> = { region };

    if (accessKeyId && secretAccessKey) {
      clientConfig.credentials = { accessKeyId, secretAccessKey };
      this.logger.log('Bedrock client initialized with explicit credentials');
    } else {
      // Fall back to the default credential chain (IAM role, env vars,
      // ~/.aws/credentials, IMDS, etc.). If nothing is found the SDK will
      // throw at call time with a clear error — no mock data.
      this.logger.log(
        'No explicit AWS credentials configured — using default credential provider chain',
      );
    }

    this.client = new BedrockRuntimeClient(clientConfig as any);
  }

  // -----------------------------------------------------------------------
  // chat() — Nova Pro streaming via ConverseStreamCommand
  // -----------------------------------------------------------------------
  async chat(
    messages: { role: string; content: string }[],
    systemPrompt?: string,
    model?: string,
  ): Promise<AsyncGenerator<string>> {
    const modelId = model || MODEL_NOVA_PRO;
    const startMs = Date.now();

    const converseMessages: Message[] = messages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: [{ text: m.content }] as ContentBlock[],
    }));

    const system = buildCachedSystemBlocks(systemPrompt || CHAT_SYSTEM_PROMPT);

    const command = new ConverseStreamCommand({
      modelId,
      messages: converseMessages,
      system,
    });

    const response = await this.withRetry(() => this.client.send(command));

    this.logger.log(`chat() stream opened — model=${modelId} latency=${Date.now() - startMs}ms`);

    return this.processStream(response, modelId, startMs);
  }

  private async *processStream(
    response: any,
    modelId: string,
    startMs: number,
  ): AsyncGenerator<string> {
    let inputTokens = 0;
    let outputTokens = 0;

    if (!response.stream) {
      this.logger.warn('ConverseStream returned no stream object');
      return;
    }

    for await (const event of response.stream) {
      if (event.contentBlockDelta?.delta?.text) {
        yield event.contentBlockDelta.delta.text;
      }

      // Capture usage metrics from the final metadata event
      if (event.metadata?.usage) {
        inputTokens = event.metadata.usage.inputTokens ?? 0;
        outputTokens = event.metadata.usage.outputTokens ?? 0;
      }
    }

    this.logger.log(
      `chat() stream closed — model=${modelId} inputTokens=${inputTokens} outputTokens=${outputTokens} totalLatency=${Date.now() - startMs}ms`,
    );
  }

  // -----------------------------------------------------------------------
  // extractEntities() — Nova 2 Lite with forced tool call
  // -----------------------------------------------------------------------
  async extractEntities(text: string): Promise<{
    persons: any[];
    organizations: any[];
    locations: any[];
    vessels: any[];
    aircraft: any[];
    relationships: any[];
    riskIndicators: any[];
  }> {
    const startMs = Date.now();

    const toolConfig: ToolConfiguration = {
      tools: [EXTRACT_OSINT_ENTITIES_TOOL],
      toolChoice: {
        tool: { name: 'ExtractOSINTEntities' },
      },
    };

    const system = buildCachedSystemBlocks(ENTITY_EXTRACTION_PROMPT);

    const command = new ConverseCommand({
      modelId: MODEL_NOVA_LITE,
      messages: [
        {
          role: 'user',
          content: [
            {
              text: `Extract all OSINT entities from the following intelligence text. Be thorough but conservative — only include entities you are confident about.\n\n---\n${text}\n---`,
            },
          ] as ContentBlock[],
        },
      ],
      system,
      toolConfig,
    });

    const response = await this.withRetry(() => this.client.send(command));

    const usage = response.usage;
    this.logger.log(
      `extractEntities() — model=${MODEL_NOVA_LITE} inputTokens=${usage?.inputTokens ?? '?'} outputTokens=${usage?.outputTokens ?? '?'} latency=${Date.now() - startMs}ms`,
    );

    // With forced tool call, the response contains a toolUse block
    const contentBlocks = response.output?.message?.content ?? [];
    for (const block of contentBlocks) {
      if (block.toolUse && block.toolUse.name === 'ExtractOSINTEntities') {
        const result = block.toolUse.input as any;
        return {
          persons: result.persons ?? [],
          organizations: result.organizations ?? [],
          locations: result.locations ?? [],
          vessels: result.vessels ?? [],
          aircraft: result.aircraft ?? [],
          relationships: result.relationships ?? [],
          riskIndicators: result.riskIndicators ?? [],
        };
      }
    }

    // Fallback: try to parse text content as JSON (should not normally happen
    // with forced tool call, but handle gracefully)
    const textContent = contentBlocks.find((b: any) => b.text)?.text;
    if (textContent) {
      this.logger.warn('extractEntities() fell back to text parsing — tool call block not found');
      try {
        return JSON.parse(textContent);
      } catch {
        throw new Error(
          `Entity extraction returned unparseable text instead of tool call: ${textContent.substring(0, 200)}`,
        );
      }
    }

    throw new Error('Entity extraction returned no content from Bedrock');
  }

  // -----------------------------------------------------------------------
  // generateBriefing() — Nova Premier with extended thinking
  // -----------------------------------------------------------------------
  async generateBriefing(
    entityIds: string[],
    timeRange: { start: string; end: string },
    context?: string,
  ): Promise<{
    title: string;
    classification: string;
    generatedAt: string;
    timeRange: { start: string; end: string };
    sections: { title: string; content: string; confidence?: number; entities?: string[] }[];
    reasoning?: string;
  }> {
    const startMs = Date.now();

    const userPrompt = [
      `Generate an intelligence briefing for the following entities: ${entityIds.join(', ')}`,
      `Time range: ${timeRange.start} to ${timeRange.end}`,
      context ? `Additional context: ${context}` : null,
      '',
      'Return the briefing as valid JSON matching the structure described in your system instructions.',
    ]
      .filter(Boolean)
      .join('\n');

    const system = buildCachedSystemBlocks(BRIEFING_TEMPLATE);

    const command = new ConverseCommand({
      modelId: MODEL_NOVA_PREMIER,
      messages: [
        {
          role: 'user',
          content: [{ text: userPrompt }] as ContentBlock[],
        },
      ],
      system,
      inferenceConfig: {
        maxTokens: 4096,
      },
      additionalModelRequestFields: {
        reasoningConfig: {
          maxReasoningEffort: 'medium',
        },
      },
    });

    const response = await this.withRetry(() => this.client.send(command));

    const usage = response.usage;
    this.logger.log(
      `generateBriefing() — model=${MODEL_NOVA_PREMIER} inputTokens=${usage?.inputTokens ?? '?'} outputTokens=${usage?.outputTokens ?? '?'} latency=${Date.now() - startMs}ms`,
    );

    const contentBlocks = response.output?.message?.content ?? [];

    // Collect reasoning text if present (extended thinking)
    let reasoning: string | undefined;
    const reasoningBlocks = contentBlocks.filter((b: any) => b.reasoningContent?.reasoningText?.text);
    if (reasoningBlocks.length > 0) {
      reasoning = reasoningBlocks
        .map((b: any) => b.reasoningContent.reasoningText.text)
        .join('\n');
    }

    // Extract the actual response text
    const textBlock = contentBlocks.find((b: any) => b.text);
    const responseText = textBlock?.text ?? '';

    if (!responseText) {
      throw new Error('Briefing generation returned no text content from Bedrock');
    }

    // Parse JSON — try to extract JSON from the response even if wrapped in markdown
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, responseText];
    const jsonStr = (jsonMatch[1] ?? responseText).trim();

    try {
      const parsed = JSON.parse(jsonStr);
      return {
        title: parsed.title ?? 'Intelligence Briefing',
        classification: parsed.classification ?? 'UNCLASSIFIED',
        generatedAt: parsed.generatedAt ?? new Date().toISOString(),
        timeRange: parsed.timeRange ?? timeRange,
        sections: parsed.sections ?? [{ title: 'Summary', content: responseText }],
        ...(reasoning ? { reasoning } : {}),
      };
    } catch {
      // If JSON parsing fails, return the raw text as a single-section briefing
      this.logger.warn('generateBriefing() could not parse JSON from model response');
      return {
        title: 'Intelligence Briefing',
        classification: 'UNCLASSIFIED',
        generatedAt: new Date().toISOString(),
        timeRange,
        sections: [{ title: 'Summary', content: responseText }],
        ...(reasoning ? { reasoning } : {}),
      };
    }
  }

  // -----------------------------------------------------------------------
  // analyzeImage() — Nova Pro with multimodal input
  // -----------------------------------------------------------------------
  async analyzeImage(imageUri: string, prompt: string): Promise<string> {
    const startMs = Date.now();

    const imageContent = this.buildImageContent(imageUri);

    const command = new ConverseCommand({
      modelId: MODEL_NOVA_PRO,
      messages: [
        {
          role: 'user',
          content: [
            { text: prompt },
            imageContent,
          ] as ContentBlock[],
        },
      ],
      system: buildCachedSystemBlocks(ANOMALY_DETECTION_PROMPT),
    });

    const response = await this.withRetry(() => this.client.send(command));

    const usage = response.usage;
    this.logger.log(
      `analyzeImage() — model=${MODEL_NOVA_PRO} inputTokens=${usage?.inputTokens ?? '?'} outputTokens=${usage?.outputTokens ?? '?'} latency=${Date.now() - startMs}ms`,
    );

    const text = response.output?.message?.content?.[0]?.text;
    if (!text) {
      throw new Error('Image analysis returned no text content from Bedrock');
    }
    return text;
  }

  /**
   * Build the image ContentBlock from either an S3 URI or a base64 data URI.
   */
  private buildImageContent(imageUri: string): ContentBlock {
    // S3 URI: s3://bucket/key
    if (imageUri.startsWith('s3://')) {
      return {
        image: {
          format: this.inferImageFormat(imageUri),
          source: {
            s3Location: {
              uri: imageUri,
            },
          },
        },
      } as unknown as ContentBlock;
    }

    // Base64 data URI: data:image/png;base64,...
    if (imageUri.startsWith('data:image/')) {
      const formatMatch = imageUri.match(/^data:image\/(\w+);base64,/);
      const format = (formatMatch?.[1] ?? 'png') as 'png' | 'jpeg' | 'gif' | 'webp';
      const base64Data = imageUri.replace(/^data:image\/\w+;base64,/, '');
      return {
        image: {
          format,
          source: {
            bytes: Buffer.from(base64Data, 'base64'),
          },
        },
      } as unknown as ContentBlock;
    }

    // Assume HTTPS URL pointing to an image — download is not supported
    // directly by Converse; treat as S3 URI and let Bedrock resolve it.
    // If this is a pre-signed S3 URL the caller should pass the s3:// form.
    throw new Error(
      `Unsupported image URI format. Provide an S3 URI (s3://bucket/key) or a base64 data URI (data:image/png;base64,...). Received: ${imageUri.substring(0, 80)}`,
    );
  }

  private inferImageFormat(uri: string): 'png' | 'jpeg' | 'gif' | 'webp' {
    const lower = uri.toLowerCase();
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'jpeg';
    if (lower.endsWith('.gif')) return 'gif';
    if (lower.endsWith('.webp')) return 'webp';
    return 'png';
  }

  // -----------------------------------------------------------------------
  // generateImage() — Nova Canvas via InvokeModelCommand
  // -----------------------------------------------------------------------
  async generateImage(prompt: string): Promise<{ imageBase64: string; contentType: string }> {
    const startMs = Date.now();

    const command = new InvokeModelCommand({
      modelId: MODEL_NOVA_CANVAS,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        taskType: 'TEXT_IMAGE',
        textToImageParams: { text: prompt },
        imageGenerationConfig: {
          numberOfImages: 1,
          width: 1024,
          height: 1024,
        },
      }),
    });

    const response = await this.withRetry(() => this.client.send(command));
    const body = JSON.parse(new TextDecoder().decode(response.body));

    this.logger.log(`generateImage() — model=${MODEL_NOVA_CANVAS} latency=${Date.now() - startMs}ms`);

    const imageBase64: string | undefined = body.images?.[0];
    if (!imageBase64) {
      throw new Error('Image generation returned no image data from Bedrock');
    }

    return {
      imageBase64,
      contentType: 'image/png',
    };
  }

  // -----------------------------------------------------------------------
  // generateEmbedding() — Nova Embeddings via InvokeModelCommand
  // -----------------------------------------------------------------------
  async generateEmbedding(input: {
    text?: string;
    imageBase64?: string;
  }): Promise<{ embedding: number[]; dimensions: number }> {
    const startMs = Date.now();

    const bodyPayload: Record<string, unknown> = {
      embeddingConfig: {
        outputEmbeddingLength: 1024,
      },
      inputType: 'RETRIEVAL',
    };

    if (input.text) {
      bodyPayload.inputText = input.text;
    }
    if (input.imageBase64) {
      bodyPayload.inputImage = input.imageBase64;
    }

    if (!input.text && !input.imageBase64) {
      throw new Error('generateEmbedding() requires at least one of text or imageBase64');
    }

    const command = new InvokeModelCommand({
      modelId: MODEL_NOVA_EMBEDDINGS,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(bodyPayload),
    });

    const response = await this.withRetry(() => this.client.send(command));
    const body = JSON.parse(new TextDecoder().decode(response.body));

    this.logger.log(
      `generateEmbedding() — model=${MODEL_NOVA_EMBEDDINGS} latency=${Date.now() - startMs}ms`,
    );

    const embedding: number[] = body.embedding;
    if (!embedding || !Array.isArray(embedding)) {
      throw new Error('Embedding generation returned no embedding vector from Bedrock');
    }

    return { embedding, dimensions: embedding.length };
  }

  // -----------------------------------------------------------------------
  // semanticSearch() — convenience method using generateEmbedding()
  // -----------------------------------------------------------------------
  async semanticSearch(
    query: string,
    corpus: string[],
  ): Promise<{ results: { text: string; score: number }[] }> {
    const queryResult = await this.generateEmbedding({ text: query });
    const queryEmbedding = queryResult.embedding;

    // Generate embeddings for all corpus documents in parallel (batched to
    // avoid overwhelming the API)
    const BATCH_SIZE = 5;
    const results: { text: string; score: number }[] = [];

    for (let i = 0; i < corpus.length; i += BATCH_SIZE) {
      const batch = corpus.slice(i, i + BATCH_SIZE);
      const embeddings = await Promise.all(
        batch.map((text) => this.generateEmbedding({ text })),
      );

      for (let j = 0; j < batch.length; j++) {
        const score = this.cosineSimilarity(queryEmbedding, embeddings[j].embedding);
        results.push({ text: batch[j], score });
      }
    }

    return {
      results: results.sort((a, b) => b.score - a.score),
    };
  }

  // -----------------------------------------------------------------------
  // Utility: cosine similarity
  // -----------------------------------------------------------------------
  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  // -----------------------------------------------------------------------
  // Utility: retry with exponential backoff for ThrottlingException
  // -----------------------------------------------------------------------
  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await fn();
      } catch (error: unknown) {
        lastError = error;

        const isThrottled =
          error instanceof ThrottlingException ||
          (error as any)?.name === 'ThrottlingException' ||
          (error as any)?.$metadata?.httpStatusCode === 429;

        if (!isThrottled || attempt === MAX_RETRIES) {
          // Not a throttling error or we've exhausted retries — rethrow
          this.logBedrockError(error);
          throw error;
        }

        const delayMs = BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 200;
        this.logger.warn(
          `Bedrock throttled (attempt ${attempt + 1}/${MAX_RETRIES + 1}) — retrying in ${Math.round(delayMs)}ms`,
        );
        await this.sleep(delayMs);
      }
    }

    // Should not reach here, but satisfy TypeScript
    throw lastError;
  }

  private logBedrockError(error: unknown): void {
    if (error instanceof Error) {
      const metadata = (error as any)?.$metadata;
      this.logger.error(
        `Bedrock API error: ${error.name} — ${error.message}` +
          (metadata ? ` [HTTP ${metadata.httpStatusCode}]` : ''),
      );

      // Provide actionable guidance for common errors
      if (
        error.name === 'CredentialsProviderError' ||
        error.message?.includes('Could not load credentials')
      ) {
        this.logger.error(
          'AWS credentials not found. Configure AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY ' +
            'environment variables, or attach an IAM role to the compute instance.',
        );
      }
      if (error.name === 'AccessDeniedException') {
        this.logger.error(
          'The configured IAM principal does not have permission to invoke Bedrock models. ' +
            'Ensure the policy includes bedrock:InvokeModel and bedrock:InvokeModelWithResponseStream.',
        );
      }
      if (error.name === 'ModelNotReadyException' || error.name === 'ResourceNotFoundException') {
        this.logger.error(
          'The requested model is not available in this region or has not been enabled. ' +
            'Check the Bedrock console to enable model access.',
        );
      }
    } else {
      this.logger.error(`Bedrock API error (unknown type): ${String(error)}`);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
