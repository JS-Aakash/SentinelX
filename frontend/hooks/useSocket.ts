'use client';

import { useEffect, useRef, useCallback } from 'react';
import { getSocket, disconnectSocket } from '@/lib/socket';
import type { Socket } from 'socket.io-client';

/**
 * Custom hook for Socket.IO lifecycle management.
 * Auto-connects on mount, auto-disconnects on unmount.
 */
export function useSocket() {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    socketRef.current = getSocket();
  }, []);

  const subscribe = useCallback(<T = unknown>(event: string, callback: (data: T) => void) => {
    const socket = socketRef.current;
    if (!socket) return () => {};

    socket.on(event, callback as (...args: unknown[]) => void);
    return () => {
      socket.off(event, callback as (...args: unknown[]) => void);
    };
  }, []);

  const emit = useCallback((event: string, data?: unknown) => {
    const socket = socketRef.current;
    if (socket?.connected) {
      socket.emit(event, data);
    }
  }, []);

  return { subscribe, emit, socket: socketRef };
}
