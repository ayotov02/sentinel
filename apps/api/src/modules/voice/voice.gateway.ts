import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import {
  BedrockRuntimeClient,
  InvokeModelWithBidirectionalStreamCommand,
  InvokeModelWithBidirectionalStreamInput,
} from '@aws-sdk/client-bedrock-runtime';
import { NodeHttp2Handler } from '@smithy/node-http-handler';

import type {
  NovaSonicInputEvent,
  NovaSonicOutputEvent,
  VoiceSession,
  StartSessionPayload,
  AudioInputPayload,
  ToolResultPayload,
  AudioConfig,
  ToolDefinition,
} from './voice.types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MODEL_ID = 'amazon.nova-sonic-v1:0';

const AUDIO_CONFIG: AudioConfig = {
  mediaType: 'audio/lpcm',
  sampleRateHertz: 16000,
  sampleSizeBits: 16,
  channelCount: 1,
  audioEncoding: 'base64',
};

const SYSTEM_PROMPT =
  'You are SENTINEL, an advanced OSINT intelligence analyst. You help analysts ' +
  'query real-time geospatial intelligence data including aircraft tracking, vessel ' +
  'movements, conflict events, and sanctions screening. Be precise, cite data ' +
  'sources, and flag confidence levels.';

const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    toolSpec: {
      name: 'search_entities',
      description:
        'Search the SENTINEL knowledge graph for entities such as aircraft, vessels, ' +
        'organizations, or persons. Returns matching records with metadata.',
      inputSchema: {
        json: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Free-text search query or entity identifier (ICAO hex, MMSI, name).',
            },
            entityType: {
              type: 'string',
              enum: ['aircraft', 'vessel', 'person', 'organization', 'facility', 'any'],
              description: 'Restrict search to a specific entity type.',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default 10).',
            },
          },
          required: ['query'],
        },
      },
    },
  },
  {
    toolSpec: {
      name: 'get_trajectory',
      description:
        'Retrieve the movement history / trajectory of a tracked entity over a time window. ' +
        'Returns an array of timestamped positions.',
      inputSchema: {
        json: {
          type: 'object',
          properties: {
            entityId: {
              type: 'string',
              description: 'Unique entity identifier.',
            },
            startTime: {
              type: 'string',
              description: 'ISO-8601 start of the time window.',
            },
            endTime: {
              type: 'string',
              description: 'ISO-8601 end of the time window.',
            },
          },
          required: ['entityId'],
        },
      },
    },
  },
  {
    toolSpec: {
      name: 'check_sanctions',
      description:
        'Screen a name or identifier against OFAC SDN, EU, UN, and OpenSanctions lists. ' +
        'Returns matching sanctions entries with confidence scores.',
      inputSchema: {
        json: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Entity name or alias to screen.',
            },
            entityType: {
              type: 'string',
              enum: ['person', 'vessel', 'organization', 'aircraft'],
              description: 'Type of entity for more precise matching.',
            },
            fuzzyThreshold: {
              type: 'number',
              description: 'Fuzzy match threshold 0-1 (default 0.85).',
            },
          },
          required: ['name'],
        },
      },
    },
  },
  {
    toolSpec: {
      name: 'get_proximity',
      description:
        'Find tracked entities within a given radius of a geographic coordinate. ' +
        'Returns nearby entities sorted by distance.',
      inputSchema: {
        json: {
          type: 'object',
          properties: {
            latitude: {
              type: 'number',
              description: 'Center latitude in decimal degrees.',
            },
            longitude: {
              type: 'number',
              description: 'Center longitude in decimal degrees.',
            },
            radiusKm: {
              type: 'number',
              description: 'Search radius in kilometers (default 50).',
            },
            entityType: {
              type: 'string',
              enum: ['aircraft', 'vessel', 'any'],
              description: 'Filter by entity type.',
            },
          },
          required: ['latitude', 'longitude'],
        },
      },
    },
  },
  {
    toolSpec: {
      name: 'get_latest_events',
      description:
        'Retrieve recent conflict events, natural disasters, or other significant incidents ' +
        'from ACLED, GDELT, and ReliefWeb feeds. Optionally filter by region or event type.',
      inputSchema: {
        json: {
          type: 'object',
          properties: {
            region: {
              type: 'string',
              description: 'Geographic region or country name to filter by.',
            },
            eventType: {
              type: 'string',
              enum: [
                'conflict',
                'protest',
                'disaster',
                'military',
                'maritime_incident',
                'any',
              ],
              description: 'Type of event to retrieve.',
            },
            since: {
              type: 'string',
              description: 'ISO-8601 timestamp — only return events after this time.',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of events to return (default 20).',
            },
          },
          required: [],
        },
      },
    },
  },
];

// ---------------------------------------------------------------------------
// Gateway
// ---------------------------------------------------------------------------

@WebSocketGateway({
  namespace: '/voice',
  cors: {
    origin: 'http://localhost:5173',
    credentials: true,
  },
})
export class VoiceGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(VoiceGateway.name);
  private readonly sessions = new Map<string, VoiceSession>();
  private bedrockClient: BedrockRuntimeClient | null = null;

  // -----------------------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------------------

  afterInit() {
    const region = process.env.AWS_REGION || 'us-east-1';
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    if (accessKeyId && secretAccessKey) {
      this.bedrockClient = new BedrockRuntimeClient({
        region,
        credentials: { accessKeyId, secretAccessKey },
        requestHandler: new NodeHttp2Handler({
          requestTimeout: 300_000,
          sessionTimeout: 300_000,
        }),
      });
      this.logger.log('Voice gateway initialized with Bedrock client (HTTP/2)');
    } else {
      this.logger.warn(
        'AWS credentials not configured — voice features disabled',
      );
    }
  }

  handleConnection(client: Socket) {
    this.logger.debug(`Voice client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Voice client disconnected: ${client.id}`);
    this.destroySession(client.id);
  }

  // -----------------------------------------------------------------------
  // Socket.IO event handlers
  // -----------------------------------------------------------------------

  @SubscribeMessage('start-session')
  async handleStartSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: StartSessionPayload | undefined,
  ) {
    if (!this.bedrockClient) {
      client.emit('error', {
        message: 'AWS credentials not configured — voice features unavailable.',
        code: 'NO_CREDENTIALS',
      });
      return;
    }

    // Tear down any previous session for this client.
    this.destroySession(client.id);

    const session: VoiceSession = {
      clientId: client.id,
      promptName: 'sentinel-voice-prompt',
      contentIndex: 0,
      stream: null,
      sendEvent: null,
      ready: false,
      streaming: false,
      toolBuffers: new Map(),
    };

    this.sessions.set(client.id, session);

    try {
      await this.initBedrockStream(client, session, payload);
    } catch (err: any) {
      this.logger.error(`Failed to start Bedrock stream: ${err.message}`, err.stack);
      client.emit('error', {
        message: `Failed to initialise voice session: ${err.message}`,
        code: 'STREAM_INIT_FAILED',
      });
      this.destroySession(client.id);
    }
  }

  @SubscribeMessage('audio-input')
  handleAudioInput(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: AudioInputPayload,
  ) {
    const session = this.sessions.get(client.id);
    if (!session?.ready || !session.sendEvent) {
      this.logger.warn(`Audio received before session ready (client ${client.id})`);
      return;
    }

    const contentName = `audio-input-${session.contentIndex++}`;

    session.sendEvent({
      audioInput: {
        promptName: session.promptName,
        contentName,
        content: payload.audio,
      },
    });
  }

  @SubscribeMessage('tool-result')
  handleToolResult(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: ToolResultPayload,
  ) {
    const session = this.sessions.get(client.id);
    if (!session?.sendEvent) return;

    const contentName = `tool-result-${session.contentIndex++}`;

    session.sendEvent({
      toolResult: {
        promptName: session.promptName,
        contentName,
        toolUseId: payload.toolUseId,
        content: { text: payload.result },
      },
    });
  }

  @SubscribeMessage('stop-session')
  handleStopSession(@ConnectedSocket() client: Socket) {
    this.logger.debug(`Client ${client.id} requested session stop`);
    this.destroySession(client.id);
    client.emit('session-ended');
  }

  // -----------------------------------------------------------------------
  // Bedrock bidirectional stream lifecycle
  // -----------------------------------------------------------------------

  private async initBedrockStream(
    client: Socket,
    session: VoiceSession,
    payload?: StartSessionPayload,
  ) {
    const modelId = payload?.modelId || MODEL_ID;
    const systemPrompt = payload?.systemPrompt || SYSTEM_PROMPT;

    // Build the ordered sequence of setup events.
    const setupEvents: NovaSonicInputEvent[] = [
      {
        sessionStart: {
          inferenceConfiguration: {
            maxTokens: 4096,
            topP: 0.9,
            temperature: 0.7,
          },
        },
      },
      {
        promptStart: {
          promptName: session.promptName,
          textOutputConfiguration: { mediaType: 'text/plain' },
          audioOutputConfiguration: { ...AUDIO_CONFIG },
          toolUseOutputConfiguration: { mediaType: 'application/json' },
        },
      },
      {
        systemPrompt: {
          textContent: { text: systemPrompt },
        },
      },
      {
        startAudioInput: {
          audioConfiguration: { ...AUDIO_CONFIG },
        },
      },
    ];

    // Create an async generator that yields input events to Bedrock.
    // We expose a `push` function so that Socket.IO handlers can feed
    // events into the stream without blocking.
    const eventQueue: NovaSonicInputEvent[] = [...setupEvents];
    let resolveWaiting: ((value: IteratorResult<any>) => void) | null = null;
    let closed = false;

    const inputStream = {
      [Symbol.asyncIterator]() {
        return {
          next(): Promise<IteratorResult<any>> {
            if (closed) {
              return Promise.resolve({ value: undefined, done: true });
            }
            if (eventQueue.length > 0) {
              const event = eventQueue.shift()!;
              return Promise.resolve({ value: event, done: false });
            }
            // Park until a new event is pushed.
            return new Promise((resolve) => {
              resolveWaiting = resolve;
            });
          },
          return(): Promise<IteratorResult<any>> {
            closed = true;
            return Promise.resolve({ value: undefined, done: true });
          },
        };
      },
    };

    const pushEvent = (event: NovaSonicInputEvent) => {
      if (closed) return;
      if (resolveWaiting) {
        const resolve = resolveWaiting;
        resolveWaiting = null;
        resolve({ value: event, done: false });
      } else {
        eventQueue.push(event);
      }
    };

    session.sendEvent = pushEvent;

    // Build the command with tool configuration.
    const commandInput: InvokeModelWithBidirectionalStreamInput = {
      modelId,
      body: inputStream as any,
    };

    const command = new InvokeModelWithBidirectionalStreamCommand(commandInput);

    // Fire off the bidirectional stream.
    const response = await this.bedrockClient!.send(command);

    session.stream = response.body as AsyncIterable<any>;
    session.ready = true;

    client.emit('session-started');
    this.logger.log(`Voice session started for client ${client.id}`);

    // Process output events in the background.
    this.processOutputStream(client, session).catch((err) => {
      this.logger.error(
        `Output stream error (client ${client.id}): ${err.message}`,
        err.stack,
      );
      client.emit('error', {
        message: `Voice stream error: ${err.message}`,
        code: 'STREAM_ERROR',
      });
      this.destroySession(client.id);
    });
  }

  // -----------------------------------------------------------------------
  // Output stream processor
  // -----------------------------------------------------------------------

  private async processOutputStream(client: Socket, session: VoiceSession) {
    if (!session.stream) return;

    for await (const chunk of session.stream) {
      // Each chunk from Bedrock is a JSON envelope with one event key.
      const event = this.parseOutputEvent(chunk);
      if (!event) continue;

      // ----- sessionReady -----
      if ('sessionReady' in event) {
        this.logger.debug(
          `Session ready: ${(event as any).sessionReady.sessionId}`,
        );
        continue;
      }

      // ----- promptReady -----
      if ('promptReady' in event) {
        this.logger.debug(
          `Prompt ready: ${(event as any).promptReady.promptName}`,
        );
        continue;
      }

      // ----- contentStart -----
      if ('contentStart' in event) {
        const cs = (event as any).contentStart;
        if (cs.type === 'TOOL' && cs.toolContentStart) {
          // Begin accumulating tool-use JSON.
          session.toolBuffers.set(cs.contentName, '');
        }
        continue;
      }

      // ----- textOutput -----
      if ('textOutput' in event) {
        const to = (event as any).textOutput;
        client.emit('text-output', {
          text: to.content,
          role: 'assistant',
        });
        continue;
      }

      // ----- audioOutput -----
      if ('audioOutput' in event) {
        const ao = (event as any).audioOutput;
        client.emit('audio-output', { audio: ao.content });
        continue;
      }

      // ----- toolUse -----
      if ('toolUse' in event) {
        const tu = (event as any).toolUse;
        const existing = session.toolBuffers.get(tu.contentName) ?? '';
        session.toolBuffers.set(tu.contentName, existing + tu.content);
        continue;
      }

      // ----- contentEnd -----
      if ('contentEnd' in event) {
        const ce = (event as any).contentEnd;

        // If this ends a TOOL content block, emit the complete tool call.
        if (
          ce.type === 'TOOL' &&
          ce.toolResultInputConfiguration?.toolUseId
        ) {
          const toolUseId = ce.toolResultInputConfiguration.toolUseId;
          const rawJson = session.toolBuffers.get(ce.contentName) ?? '{}';
          session.toolBuffers.delete(ce.contentName);

          let input: Record<string, unknown> = {};
          try {
            input = JSON.parse(rawJson);
          } catch {
            this.logger.warn(`Malformed tool-use JSON: ${rawJson}`);
          }

          // Look up tool name from the contentStart we saw earlier.
          // For simplicity we derive it from the accumulated data.
          client.emit('tool-call', {
            toolUseId,
            toolName: this.resolveToolName(input),
            input,
          });
        }
        continue;
      }

      // ----- promptEnd -----
      if ('promptEnd' in event) {
        this.logger.debug('Prompt turn ended');
        continue;
      }

      // ----- sessionEnd -----
      if ('sessionEnd' in event) {
        this.logger.log(`Bedrock session ended for client ${client.id}`);
        client.emit('session-ended');
        this.destroySession(client.id);
        return;
      }

      // ----- error -----
      if ('error' in event) {
        const err = (event as any).error;
        this.logger.error(`Bedrock error: ${err.message}`);
        client.emit('error', {
          message: err.message,
          code: err.code ?? 'BEDROCK_ERROR',
        });
        continue;
      }
    }
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  /** Parse the raw Bedrock output chunk into a typed event. */
  private parseOutputEvent(chunk: any): NovaSonicOutputEvent | null {
    try {
      // Bedrock bidirectional stream chunks arrive as objects with a single
      // key representing the event type.  The SDK may already deserialize
      // them, but we handle both raw JSON and pre-parsed forms.
      if (typeof chunk === 'string') {
        return JSON.parse(chunk) as NovaSonicOutputEvent;
      }
      if (chunk?.body) {
        const text = new TextDecoder().decode(chunk.body);
        return JSON.parse(text) as NovaSonicOutputEvent;
      }
      // Already a plain object from the SDK.
      return chunk as NovaSonicOutputEvent;
    } catch {
      this.logger.warn('Failed to parse Bedrock output chunk');
      return null;
    }
  }

  /** Best-effort attempt to recover the tool name from the parsed input. */
  private resolveToolName(input: Record<string, unknown>): string {
    // The input schema structure often hints at which tool was invoked.
    if ('query' in input && !('latitude' in input)) return 'search_entities';
    if ('entityId' in input) return 'get_trajectory';
    if ('name' in input && 'fuzzyThreshold' in input) return 'check_sanctions';
    if ('name' in input) return 'check_sanctions';
    if ('latitude' in input && 'longitude' in input) return 'get_proximity';
    if ('eventType' in input || 'region' in input) return 'get_latest_events';
    return 'unknown';
  }

  /** Gracefully tear down a session and close the Bedrock stream. */
  private destroySession(clientId: string) {
    const session = this.sessions.get(clientId);
    if (!session) return;

    // Signal end-of-session to Bedrock.
    try {
      if (session.sendEvent) {
        session.sendEvent({
          promptEnd: { promptName: session.promptName },
        });
        session.sendEvent({ sessionEnd: {} });
      }
    } catch {
      // Best-effort; stream may already be closed.
    }

    // Close the async iterator if possible.
    try {
      const iter = (session.stream as any)?.[Symbol.asyncIterator]?.();
      iter?.return?.();
    } catch {
      // ignore
    }

    session.sendEvent = null;
    session.stream = null;
    session.ready = false;
    session.toolBuffers.clear();
    this.sessions.delete(clientId);

    this.logger.debug(`Session destroyed for client ${clientId}`);
  }
}
