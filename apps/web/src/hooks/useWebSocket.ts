import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useEntityStore } from '@/stores/entity-store';
import type { ViewportBounds } from '@sentinel/shared';

export function useWebSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const updatePosition = useEntityStore((s) => s.updatePosition);
  const updateBatch = useEntityStore((s) => s.updateBatch);

  useEffect(() => {
    const socket = io('/sentinel', {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('entity:update', (data) => updatePosition(data));
    socket.on('entity:batch', (data) => {
      if (data.updates) updateBatch(data.updates);
    });
    socket.on('alert:new', (alert) => {
      // Could trigger toast notification here
      console.log('New alert:', alert);
    });

    return () => {
      socket.disconnect();
    };
  }, [updatePosition, updateBatch]);

  const sendViewportUpdate = useCallback((bounds: ViewportBounds) => {
    socketRef.current?.emit('viewport:update', bounds);
  }, []);

  return { connected, sendViewportUpdate, socket: socketRef };
}
