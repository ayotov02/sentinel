import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { entityBuffer } from '@/lib/entity-buffer';
import type { ViewportBounds } from '@sentinel/shared';

/** Re-render trigger: bumped at most 10Hz so React doesn't thrash */
let _bufferVersion = 0;
const VERSION_LISTENERS = new Set<() => void>();

function notifyVersionChange() {
  _bufferVersion = entityBuffer.version;
  VERSION_LISTENERS.forEach((fn) => fn());
}

// Throttled version pump — max 10Hz
let _throttleTimer: ReturnType<typeof setInterval> | null = null;
function startVersionPump() {
  if (_throttleTimer) return;
  _throttleTimer = setInterval(() => {
    if (entityBuffer.version !== _bufferVersion) {
      notifyVersionChange();
    }
  }, 100); // 10Hz
}
function stopVersionPump() {
  if (_throttleTimer) {
    clearInterval(_throttleTimer);
    _throttleTimer = null;
  }
}

/**
 * Hook to subscribe to the entity buffer version at 10Hz.
 * Use this in components that render entity positions (e.g., EntityLayer).
 */
export function useBufferVersion(): number {
  const [version, setVersion] = useState(_bufferVersion);
  useEffect(() => {
    const handler = () => setVersion(entityBuffer.version);
    VERSION_LISTENERS.add(handler);
    return () => {
      VERSION_LISTENERS.delete(handler);
    };
  }, []);
  return version;
}

export function useWebSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [latestAlert, setLatestAlert] = useState<any>(null);

  useEffect(() => {
    const socket = io('/sentinel', {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    socketRef.current = socket;
    startVersionPump();

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    // Route entity updates directly to the typed-array buffer
    socket.on('entity:update', (data: any) => {
      entityBuffer.upsert(
        data.entityId,
        data.lon,
        data.lat,
        data.entityType,
        data.heading,
      );
    });

    socket.on('entity:batch', (data: any) => {
      if (data.updates) {
        entityBuffer.batchUpsert(data.updates);
      }
    });

    // Alert toast notification
    socket.on('alert:new', (alert: any) => {
      setLatestAlert(alert);
      // Auto-clear after 8 seconds
      setTimeout(() => setLatestAlert(null), 8000);
    });

    return () => {
      socket.disconnect();
      stopVersionPump();
    };
  }, []);

  const sendViewportUpdate = useCallback((bounds: ViewportBounds) => {
    socketRef.current?.emit('viewport:update', bounds);
  }, []);

  return { connected, sendViewportUpdate, socket: socketRef, latestAlert };
}
