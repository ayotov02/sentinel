import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BedrockRuntimeClient,
  ConverseCommand,
  ConverseStreamCommand,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { ENTITY_EXTRACTION_PROMPT } from './prompts/entity-extraction';
import { CHAT_SYSTEM_PROMPT } from './prompts/chat-system';
import { BRIEFING_TEMPLATE } from './prompts/briefing-template';
import { ANOMALY_DETECTION_PROMPT } from './prompts/anomaly-detection';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private client: BedrockRuntimeClient | null = null;

  constructor(private readonly config: ConfigService) {
    const region = config.get('AWS_REGION', 'us-east-1');
    const accessKeyId = config.get('AWS_ACCESS_KEY_ID');
    const secretAccessKey = config.get('AWS_SECRET_ACCESS_KEY');

    if (accessKeyId && secretAccessKey) {
      this.client = new BedrockRuntimeClient({
        region,
        credentials: { accessKeyId, secretAccessKey },
      });
      this.logger.log('Bedrock client initialized');
    } else {
      this.logger.warn('AWS credentials not configured — AI features will return mock responses');
    }
  }

  async chat(
    messages: { role: string; content: string }[],
    systemPrompt?: string,
    model = 'amazon.nova-pro-v1:0',
  ): Promise<AsyncGenerator<string>> {
    if (!this.client) {
      return this.mockStreamResponse('I am the SENTINEL AI assistant. AWS credentials are not configured, so I\'m returning a mock response. In production, I would analyze intelligence data using Amazon Nova Pro to answer your question.');
    }

    const converseMessages = messages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: [{ text: m.content }],
    }));

    const command = new ConverseStreamCommand({
      modelId: model,
      messages: converseMessages,
      system: [{ text: systemPrompt || CHAT_SYSTEM_PROMPT }],
    });

    const response = await this.client.send(command);
    return this.processStream(response);
  }

  private async *processStream(response: any): AsyncGenerator<string> {
    if (response.stream) {
      for await (const event of response.stream) {
        if (event.contentBlockDelta?.delta?.text) {
          yield event.contentBlockDelta.delta.text;
        }
      }
    }
  }

  private async *mockStreamResponse(text: string): AsyncGenerator<string> {
    const words = text.split(' ');
    for (const word of words) {
      yield word + ' ';
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  async extractEntities(text: string): Promise<any> {
    if (!this.client) {
      return this.mockEntityExtraction(text);
    }

    const command = new ConverseCommand({
      modelId: 'amazon.nova-2-lite-v1:0',
      messages: [
        {
          role: 'user',
          content: [{ text: `Extract entities from the following text:\n\n${text}` }],
        },
      ],
      system: [{ text: ENTITY_EXTRACTION_PROMPT }],
    });

    const response = await this.client.send(command);
    const responseText = response.output?.message?.content?.[0]?.text || '{}';

    try {
      return JSON.parse(responseText);
    } catch {
      return { entities: [], raw: responseText };
    }
  }

  private mockEntityExtraction(text: string): any {
    // Simple regex-based mock extraction
    const entities: any[] = [];

    // Look for potential aircraft identifiers
    const icaoPattern = /\b([A-Z]{3}\d{2,4})\b/g;
    let match;
    while ((match = icaoPattern.exec(text)) !== null) {
      entities.push({
        type: 'aircraft',
        value: match[1],
        confidence: 0.8,
        span: { start: match.index, end: match.index + match[0].length },
      });
    }

    // Look for coordinates
    const coordPattern = /(\d{1,3}\.\d+)[°]?\s*([NS]),?\s*(\d{1,3}\.\d+)[°]?\s*([EW])/g;
    while ((match = coordPattern.exec(text)) !== null) {
      entities.push({
        type: 'location',
        value: match[0],
        lat: parseFloat(match[1]) * (match[2] === 'S' ? -1 : 1),
        lon: parseFloat(match[3]) * (match[4] === 'W' ? -1 : 1),
        confidence: 0.9,
        span: { start: match.index, end: match.index + match[0].length },
      });
    }

    // Look for vessel names (ALL CAPS multi-word)
    const vesselPattern = /\b([A-Z]{2,}\s[A-Z]{2,}(?:\s[A-Z]{2,})?)\b/g;
    while ((match = vesselPattern.exec(text)) !== null) {
      entities.push({
        type: 'vessel',
        value: match[1],
        confidence: 0.6,
        span: { start: match.index, end: match.index + match[0].length },
      });
    }

    // Look for organization-like names
    const orgPattern = /\b((?:Ministry|Department|Agency|Force|Navy|Army|Air Force|Coast Guard|Organization|Institute)\s+(?:of\s+)?[\w\s]{2,30})\b/gi;
    while ((match = orgPattern.exec(text)) !== null) {
      entities.push({
        type: 'organization',
        value: match[1],
        confidence: 0.7,
        span: { start: match.index, end: match.index + match[0].length },
      });
    }

    // Look for person names (Title + Name pattern)
    const personPattern = /\b((?:President|General|Admiral|Captain|Minister|Dr\.|Prof\.)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/g;
    while ((match = personPattern.exec(text)) !== null) {
      entities.push({
        type: 'person',
        value: match[1],
        confidence: 0.75,
        span: { start: match.index, end: match.index + match[0].length },
      });
    }

    return { entities, sourceText: text.substring(0, 200) };
  }

  async generateBriefing(
    entityIds: string[],
    timeRange: { start: string; end: string },
    context?: string,
  ): Promise<any> {
    if (!this.client) {
      return this.mockBriefing(entityIds, timeRange);
    }

    const prompt = `Generate an intelligence briefing for entities: ${entityIds.join(', ')}
Time range: ${timeRange.start} to ${timeRange.end}
${context ? `Additional context: ${context}` : ''}`;

    const command = new ConverseCommand({
      modelId: 'amazon.nova-premier-v1:0',
      messages: [{ role: 'user', content: [{ text: prompt }] }],
      system: [{ text: BRIEFING_TEMPLATE }],
    });

    const response = await this.client.send(command);
    const responseText = response.output?.message?.content?.[0]?.text || '';

    try {
      return JSON.parse(responseText);
    } catch {
      return {
        title: 'Intelligence Briefing',
        sections: [{ title: 'Summary', content: responseText }],
        generatedAt: new Date().toISOString(),
      };
    }
  }

  private mockBriefing(entityIds: string[], timeRange: { start: string; end: string }): any {
    return {
      title: `Intelligence Briefing — ${entityIds.length} Entities`,
      classification: 'UNCLASSIFIED',
      generatedAt: new Date().toISOString(),
      timeRange,
      sections: [
        {
          title: 'Executive Summary',
          content: `This briefing covers ${entityIds.length} entities of interest during the specified time period. Analysis indicates normal patterns of activity with some notable deviations requiring further investigation.`,
          confidence: 0.85,
        },
        {
          title: 'Key Findings',
          content: '1. Maritime traffic in the Strait of Hormuz remains elevated compared to seasonal baseline.\n2. Two aircraft of interest conducted unusual flight patterns over the Eastern Mediterranean.\n3. SIGINT indicators suggest increased communications activity in the region.',
          entities: entityIds.slice(0, 3),
          confidence: 0.78,
        },
        {
          title: 'Pattern Analysis',
          content: 'Behavioral analysis reveals deviation from established patterns for 3 of the tracked entities. Route analysis shows potential coordination between vessel and aircraft movements.',
          confidence: 0.72,
        },
        {
          title: 'Recommendations',
          content: '1. Continue monitoring flagged entities with increased collection priority.\n2. Task additional ISR assets to the Eastern Mediterranean corridor.\n3. Coordinate with allied intelligence services for corroboration.',
          confidence: 0.80,
        },
      ],
    };
  }

  async analyzeImage(imageUri: string, prompt: string): Promise<string> {
    if (!this.client) {
      return 'Mock image analysis: The image shows a satellite view of a port facility with several vessels docked. Two large container ships are visible at berths 3 and 4, with loading operations apparently in progress. No unusual activity detected.';
    }

    const command = new ConverseCommand({
      modelId: 'amazon.nova-pro-v1:0',
      messages: [
        {
          role: 'user',
          content: [
            { text: prompt },
            { image: { format: 'png', source: { s3: { uri: imageUri } } } } as any,
          ],
        },
      ],
    });

    const response = await this.client.send(command);
    return response.output?.message?.content?.[0]?.text || 'No analysis available';
  }

  async generateImage(prompt: string): Promise<{ imageUrl: string }> {
    if (!this.client) {
      return { imageUrl: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect fill="#1e293b" width="512" height="512"/><text x="256" y="256" text-anchor="middle" fill="#94a3b8" font-size="16">Mock Generated Image</text></svg>') };
    }

    const command = new InvokeModelCommand({
      modelId: 'amazon.nova-canvas-v1:0',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        taskType: 'TEXT_IMAGE',
        textToImageParams: { text: prompt },
        imageGenerationConfig: { numberOfImages: 1, width: 1024, height: 1024 },
      }),
    });

    const response = await this.client.send(command);
    const body = JSON.parse(new TextDecoder().decode(response.body));
    return { imageUrl: `data:image/png;base64,${body.images?.[0]}` };
  }

  async semanticSearch(query: string, corpus: string[]): Promise<{ results: { text: string; score: number }[] }> {
    if (!this.client) {
      // Mock: simple keyword matching
      const queryWords = query.toLowerCase().split(/\s+/);
      const scored = corpus.map((text) => {
        const textLower = text.toLowerCase();
        const matches = queryWords.filter((w) => textLower.includes(w)).length;
        return { text, score: matches / queryWords.length };
      });
      return { results: scored.filter((r) => r.score > 0).sort((a, b) => b.score - a.score) };
    }

    // Use Nova Embeddings for real semantic search
    const results: { text: string; score: number }[] = [];

    const queryCommand = new InvokeModelCommand({
      modelId: 'amazon.nova-2-multimodal-embeddings-v1:0',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        inputText: query,
        dimensions: 1024,
      }),
    });

    const queryResponse = await this.client.send(queryCommand);
    const queryEmbedding = JSON.parse(new TextDecoder().decode(queryResponse.body)).embedding;

    for (const text of corpus) {
      const docCommand = new InvokeModelCommand({
        modelId: 'amazon.nova-2-multimodal-embeddings-v1:0',
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({ inputText: text, dimensions: 1024 }),
      });

      const docResponse = await this.client.send(docCommand);
      const docEmbedding = JSON.parse(new TextDecoder().decode(docResponse.body)).embedding;

      const score = this.cosineSimilarity(queryEmbedding, docEmbedding);
      results.push({ text, score });
    }

    return { results: results.sort((a, b) => b.score - a.score) };
  }

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
}
