import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://127.0.0.1:5000';

let socket: Socket | null = null;

/**
 * Get or create a Socket.IO connection (lazy — only connects when called).
 */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['polling', 'websocket'],
      autoConnect: false,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 5000,
    });

    socket.on('connect', () => {
      console.log('🔌 Socket.IO connected:', socket?.id);
    });

    socket.on('disconnect', (reason) => {
      console.warn('🔌 Socket.IO disconnected:', reason);
    });

    socket.on('connect_error', () => {
      // Silently retry — no console spam
    });
  }

  // Connect if not already connected
  if (!socket.connected) {
    socket.connect();
  }

  return socket;
}

/**
 * Disconnect and dispose the Socket.IO client.
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
