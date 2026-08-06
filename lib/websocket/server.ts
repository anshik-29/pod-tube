import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';

let io: SocketIOServer | null = null;

export function initializeSocketIO(httpServer: HTTPServer): SocketIOServer {
  if (io) {
    return io;
  }

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('join-session', (sessionId: string) => {
      socket.join(`session:${sessionId}`);
      console.log(`Client ${socket.id} joined session ${sessionId}`);
      socket.to(`session:${sessionId}`).emit('user-joined', { socketId: socket.id });
    });

    socket.on('leave-session', (sessionId: string) => {
      socket.leave(`session:${sessionId}`);
      console.log(`Client ${socket.id} left session ${sessionId}`);
      socket.to(`session:${sessionId}`).emit('user-left', { socketId: socket.id });
    });

    // WebRTC signaling
    socket.on('webrtc-request-offer', (data: { sessionId: string }) => {
      socket.to(`session:${data.sessionId}`).emit('webrtc-request-offer', data);
    });

    socket.on('webrtc-offer', (data: { sessionId: string; offer: RTCSessionDescriptionInit }) => {
      socket.to(`session:${data.sessionId}`).emit('webrtc-offer', data);
    });

    socket.on('webrtc-answer', (data: { sessionId: string; answer: RTCSessionDescriptionInit }) => {
      socket.to(`session:${data.sessionId}`).emit('webrtc-answer', data);
    });

    socket.on('webrtc-ice-candidate', (data: { sessionId: string; candidate: RTCIceCandidateInit }) => {
      socket.to(`session:${data.sessionId}`).emit('webrtc-ice-candidate', data);
    });

    socket.on('media-toggle', (data: { sessionId: string; type: 'camera' | 'mic'; enabled: boolean }) => {
      socket.to(`session:${data.sessionId}`).emit('media-toggle', data);
    });

    // Recording synchronization
    socket.on('recording:start', (data: { sessionId: string }) => {
      console.log(`[Socket.IO] Broadcasting recording:start for session ${data.sessionId}`);
      io?.to(`session:${data.sessionId}`).emit('recording:start', data);
    });

    socket.on('recording:stop', (data: { sessionId: string }) => {
      console.log(`[Socket.IO] Broadcasting recording:stop for session ${data.sessionId}`);
      io?.to(`session:${data.sessionId}`).emit('recording:stop', data);
    });

    // Upload progress
    socket.on('upload-progress', (data: { sessionId: string; uploadId: string; progress: number }) => {
      socket.to(`session:${data.sessionId}`).emit('upload-progress', data);
    });

    // Processing status
    socket.on('processing-status', (data: { sessionId: string; episodeId: string; status: string }) => {
      socket.to(`session:${data.sessionId}`).emit('processing-status', data);
    });

    socket.on('disconnecting', () => {
      for (const room of socket.rooms) {
        if (room.startsWith('session:')) {
          console.log(`Client ${socket.id} disconnecting from ${room}, emitting user-left`);
          socket.to(room).emit('user-left', { socketId: socket.id });
        }
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
}

export function getSocketIO(): SocketIOServer | null {
  return io;
}

export function emitToSession(sessionId: string, event: string, data: any): void {
  if (io) {
    io.to(`session:${sessionId}`).emit(event, data);
  }
}
