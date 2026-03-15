// ---------------------------------------------------------------------------
// Nova Sonic bidirectional streaming event types
// Ref: AWS Bedrock Nova Sonic speech-to-speech API
// ---------------------------------------------------------------------------

// ========================== Shared Primitives ==============================

export interface AudioConfig {
  mediaType: 'audio/lpcm';
  sampleRateHertz: 16000;
  sampleSizeBits: 16;
  channelCount: 1;
  audioEncoding: 'base64';
}

export interface TextConfig {
  mediaType: 'text/plain';
}

export interface ToolDefinition {
  toolSpec: {
    name: string;
    description: string;
    inputSchema: {
      json: Record<string, unknown>;
    };
  };
}

export interface ToolConfig {
  tools: ToolDefinition[];
}

export interface InferenceConfig {
  maxTokens: number;
  topP?: number;
  temperature?: number;
}

// ========================== Input Events ===================================

/** Top-level wrapper — every frame sent to Nova Sonic is one of these. */
export type NovaSonicInputEvent =
  | { sessionStart: SessionStartEvent }
  | { promptStart: PromptStartEvent }
  | { systemPrompt: SystemPromptEvent }
  | { startAudioInput: StartAudioInputEvent }
  | { audioInput: AudioInputEvent }
  | { toolResult: ToolResultEvent }
  | { promptEnd: PromptEndEvent }
  | { sessionEnd: SessionEndEvent };

export interface SessionStartEvent {
  inferenceConfiguration: InferenceConfig;
}

export interface PromptStartEvent {
  promptName: string;
  textOutputConfiguration?: {
    mediaType: 'text/plain';
  };
  audioOutputConfiguration?: AudioConfig;
  toolUseOutputConfiguration?: {
    mediaType: 'application/json';
  };
}

export interface SystemPromptEvent {
  textContent: {
    text: string;
  };
}

export interface StartAudioInputEvent {
  audioConfiguration: AudioConfig;
}

export interface AudioInputEvent {
  promptName: string;
  contentName: string;
  content: string; // base64-encoded LPCM chunk
}

export interface ToolResultEvent {
  promptName: string;
  contentName: string;
  toolUseId: string;
  content: {
    text: string;
  };
}

export interface PromptEndEvent {
  promptName: string;
}

export interface SessionEndEvent {}

// ========================== Output Events ==================================

/** Top-level wrapper — every frame received from Nova Sonic is one of these. */
export type NovaSonicOutputEvent =
  | { sessionReady: SessionReadyEvent }
  | { promptReady: PromptReadyEvent }
  | { contentStart: ContentStartEvent }
  | { textOutput: TextOutputEvent }
  | { audioOutput: AudioOutputEvent }
  | { toolUse: ToolUseOutputEvent }
  | { contentEnd: ContentEndEvent }
  | { promptEnd: PromptEndOutputEvent }
  | { sessionEnd: SessionEndOutputEvent }
  | { error: NovaSonicErrorEvent };

export interface SessionReadyEvent {
  sessionId: string;
}

export interface PromptReadyEvent {
  promptName: string;
}

export interface ContentStartEvent {
  promptName: string;
  contentName: string;
  type: 'TEXT' | 'AUDIO' | 'TOOL';
  role?: 'ASSISTANT' | 'USER';
  textContentStart?: {
    text: string;
  };
  audioContentStart?: {
    audioConfiguration: AudioConfig;
  };
  toolContentStart?: {
    toolUseId: string;
    toolName: string;
  };
}

export interface TextOutputEvent {
  promptName: string;
  contentName: string;
  content: string;
}

export interface AudioOutputEvent {
  promptName: string;
  contentName: string;
  content: string; // base64-encoded LPCM
}

export interface ToolUseOutputEvent {
  promptName: string;
  contentName: string;
  content: string; // JSON-encoded tool arguments
}

export interface ContentEndEvent {
  promptName: string;
  contentName: string;
  type: 'TEXT' | 'AUDIO' | 'TOOL';
  stopReason?: 'TOOL_USE' | 'END_TURN' | 'INTERRUPTED';
  toolResultInputConfiguration?: {
    toolUseId: string;
  };
}

export interface PromptEndOutputEvent {
  promptName: string;
}

export interface SessionEndOutputEvent {}

export interface NovaSonicErrorEvent {
  message: string;
  code?: string;
}

// ========================== Client ↔ Gateway DTOs ==========================

/** Payload the browser sends with the `start-session` Socket.IO event. */
export interface StartSessionPayload {
  /** Optional override for the model ID. */
  modelId?: string;
  /** Optional override for the system prompt. */
  systemPrompt?: string;
}

/** Payload the browser sends with the `audio-input` Socket.IO event. */
export interface AudioInputPayload {
  /** Base64-encoded LPCM audio chunk. */
  audio: string;
}

/** Payload the gateway emits back via the `tool-call` Socket.IO event. */
export interface ToolCallPayload {
  toolUseId: string;
  toolName: string;
  input: Record<string, unknown>;
}

/** Payload the browser sends with the `tool-result` Socket.IO event. */
export interface ToolResultPayload {
  toolUseId: string;
  result: string;
}

/** Payload the gateway emits via `audio-output`. */
export interface AudioOutputPayload {
  /** Base64-encoded LPCM audio chunk. */
  audio: string;
}

/** Payload the gateway emits via `text-output`. */
export interface TextOutputPayload {
  /** Partial or complete text from the model. */
  text: string;
  /** Whether this is a user transcript or assistant response. */
  role: 'user' | 'assistant';
}

/** Payload the gateway emits via `error`. */
export interface VoiceErrorPayload {
  message: string;
  code?: string;
}

// ========================== Internal Session State =========================

export interface VoiceSession {
  /** Unique session identifier (matches Socket.IO client id). */
  clientId: string;
  /** Prompt name used for the active turn. */
  promptName: string;
  /** Content name counter for unique content identifiers. */
  contentIndex: number;
  /** The active bidirectional stream (async iterable). */
  stream: AsyncIterable<any> | null;
  /** Function to write an input event into the stream. */
  sendEvent: ((event: NovaSonicInputEvent) => void) | null;
  /** Whether the session has been fully initialised. */
  ready: boolean;
  /** Whether audio input is currently being streamed. */
  streaming: boolean;
  /** Accumulated tool-use JSON fragments keyed by contentName. */
  toolBuffers: Map<string, string>;
}
