/**
 * Singleton Socket.io instance.
 *
 * Call init(httpServer) once in server.js.
 * Call getIo() anywhere else to emit events.
 */
const jwt         = require('jsonwebtoken');
const User        = require('../models/User');
const Workspace   = require('../models/Workspace');
const ChatMessage = require('../models/ChatMessage');

let _io = null;

const init = (httpServer) => {
  const { Server } = require('socket.io');

  const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim());

  _io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // ── Auth middleware — verify JWT on every connection ─────────────────────
  _io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication error: no token'));

      const jwtConfig = require('../config/jwt');
      const decoded   = jwt.verify(token, jwtConfig.secret);

      const user = await User.findById(decoded.id).select('_id name email');
      if (!user) return next(new Error('Authentication error: user not found'));

      // Attach the user to the socket for use in event handlers
      socket.user = { _id: user._id.toString(), name: user.name, email: user.email };
      next();
    } catch (err) {
      next(new Error('Authentication error: invalid token'));
    }
  });

  _io.on('connection', (socket) => {
    // ── Workspace room management ─────────────────────────────────────────

    /**
     * Client joins a workspace room.
     * Payload: { workspaceId: string }
     */
    socket.on('join:workspace', ({ workspaceId }) => {
      if (workspaceId) {
        socket.join(`workspace:${workspaceId}`);
      }
    });

    /**
     * Client leaves a workspace room.
     */
    socket.on('leave:workspace', ({ workspaceId }) => {
      if (workspaceId) {
        socket.leave(`workspace:${workspaceId}`);
      }
    });

    // ── Chat ──────────────────────────────────────────────────────────────

    /**
     * Client sends a chat message to a workspace.
     * Payload: { workspaceId: string, text: string }
     *
     * The server validates membership, builds the message envelope,
     * then broadcasts it to everyone in the workspace room (including sender).
     */
    socket.on('chat:message', async ({ workspaceId, text }) => {
      try {
        if (!workspaceId || !text?.trim()) return;

        // Verify the socket user is actually a member of this workspace
        const workspace = await Workspace.findById(workspaceId).select('members');
        if (!workspace) return;

        const isMember = workspace.members.some(
          (m) => m.user.toString() === socket.user._id
        );
        if (!isMember) return;

        // ── Persist to MongoDB ───────────────────────────────────────────
        const saved = await ChatMessage.create({
          workspace: workspaceId,
          sender:    socket.user._id,
          text:      text.trim(),
        });

        const message = {
          id:          saved._id.toString(),
          _id:         saved._id.toString(),
          workspaceId,
          text:        saved.text,
          sender: {
            _id:   socket.user._id,
            name:  socket.user.name,
            email: socket.user.email,
          },
          createdAt: saved.createdAt.toISOString(),
        };

        // Broadcast to the entire workspace room (sender included)
        _io.to(`workspace:${workspaceId}`).emit('chat:message', message);

      } catch (err) {
        console.error('[Socket] chat:message error:', err.message);
      }
    });

    socket.on('disconnect', () => {
      // Rooms are automatically cleaned up on disconnect
    });
  });

  console.log('[Socket.io] Initialised');
  return _io;
};

const getIo = () => {
  if (!_io) {
    return { to: () => ({ emit: () => {} }) };
  }
  return _io;
};

module.exports = { init, getIo };
