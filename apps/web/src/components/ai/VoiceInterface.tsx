import { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { io, Socket } from 'socket.io-client';

type VoiceState = 'idle' | 'connecting' | 'listening' | 'processing' | 'speaking';

export function VoiceInterface() {
  const [state, setState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const socketRef = useRef<Socket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const playbackContextRef = useRef<AudioContext | null>(null);

  const startSession = useCallback(async () => {
    try {
      setState('connecting');
      setTranscript('');
      setResponse('');

      // Connect to voice Socket.IO namespace
      const socket = io('/voice', {
        transports: ['websocket'],
        reconnection: false,
      });
      socketRef.current = socket;

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;

      // Set up AudioContext for 16kHz mono PCM capture
      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);

      // Use ScriptProcessorNode as fallback for AudioWorklet
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processor.onaudioprocess = (e) => {
        if (state !== 'listening') return;
        const inputData = e.inputBuffer.getChannelData(0);
        // Convert Float32 to Int16 PCM
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }
        socket.emit('audio-input', pcm16.buffer);
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      // Socket event handlers
      socket.on('connect', () => {
        socket.emit('start-session', {
          model: 'amazon.nova-2-sonic-v1:0',
          sampleRate: 16000,
          encoding: 'pcm',
        });
        setState('listening');
      });

      socket.on('text-output', (data: { text: string; final: boolean }) => {
        if (data.final) {
          setTranscript(data.text);
        } else {
          setTranscript(data.text);
        }
      });

      socket.on('audio-output', (data: ArrayBuffer) => {
        setState('speaking');
        playAudio(data);
      });

      socket.on('tool-call', (data: { name: string; args: any }) => {
        setState('processing');
        setResponse(`Executing: ${data.name}`);
      });

      socket.on('response-text', (data: { text: string }) => {
        setResponse(data.text);
      });

      socket.on('session-end', () => {
        setState('idle');
      });

      socket.on('error', (err: any) => {
        console.error('Voice error:', err);
        stopSession();
      });
    } catch (err) {
      console.error('Failed to start voice session:', err);
      setState('idle');
    }
  }, []);

  const playAudio = useCallback((pcmBuffer: ArrayBuffer) => {
    try {
      if (!playbackContextRef.current) {
        playbackContextRef.current = new AudioContext({ sampleRate: 16000 });
      }
      const ctx = playbackContextRef.current;
      const int16 = new Int16Array(pcmBuffer);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 0x8000;
      }
      const buffer = ctx.createBuffer(1, float32.length, 16000);
      buffer.getChannelData(0).set(float32);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.onended = () => setState('listening');
      source.start();
    } catch (err) {
      console.error('Audio playback error:', err);
      setState('listening');
    }
  }, []);

  const stopSession = useCallback(() => {
    socketRef.current?.emit('end-session');
    socketRef.current?.disconnect();
    socketRef.current = null;

    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    audioContextRef.current?.close();
    audioContextRef.current = null;

    setState('idle');
  }, []);

  useEffect(() => {
    return () => {
      stopSession();
      playbackContextRef.current?.close();
    };
  }, [stopSession]);

  const isActive = state !== 'idle';

  return (
    <div className="flex items-center gap-3">
      <Button
        variant={isActive ? 'destructive' : 'outline'}
        size="icon"
        className={cn(
          'h-10 w-10 rounded-full transition-all',
          state === 'listening' && 'animate-pulse ring-2 ring-red-500/50',
          state === 'speaking' && 'ring-2 ring-blue-500/50',
        )}
        onClick={isActive ? stopSession : startSession}
      >
        {isActive ? (
          state === 'speaking' ? (
            <Volume2 className="h-5 w-5" />
          ) : (
            <MicOff className="h-5 w-5" />
          )
        ) : (
          <Mic className="h-5 w-5" />
        )}
      </Button>

      <div className="flex flex-col min-w-0">
        {state === 'connecting' && (
          <span className="text-xs text-muted-foreground animate-pulse">
            Connecting to Nova Sonic...
          </span>
        )}
        {state === 'listening' && (
          <span className="text-xs text-red-400 animate-pulse">
            Listening...
          </span>
        )}
        {state === 'processing' && (
          <span className="text-xs text-amber-400 animate-pulse">
            Processing...
          </span>
        )}
        {state === 'speaking' && (
          <span className="text-xs text-blue-400">Speaking...</span>
        )}
        {transcript && (
          <span className="text-xs text-muted-foreground truncate max-w-[200px]">
            {transcript}
          </span>
        )}
        {response && (
          <span className="text-xs text-foreground truncate max-w-[200px]">
            {response}
          </span>
        )}
      </div>
    </div>
  );
}
