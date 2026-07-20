require('dotenv').config();

const http = require('http');
const app = require('./app');
const connectDB = require('./config/database');
const { init: initSocket } = require('./config/socket');

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ── Unhandled Rejection / Uncaught Exception Safety Nets ─────────────────────
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Promise Rejection:', reason);
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.message);
  process.exit(1);
});

// ── Boot Sequence ─────────────────────────────────────────────────────────────
const startServer = async () => {
  try {
    await connectDB();

    // Wrap Express app in an HTTP server so Socket.io can share the same port
    const httpServer = http.createServer(app);

    // Initialise Socket.io
    initSocket(httpServer);

    httpServer.listen(PORT, () => {
      console.log('─────────────────────────────────────────');
      console.log(`  🚀  Kanban Board API`);
      console.log(`  ENV  : ${NODE_ENV}`);
      console.log(`  PORT : ${PORT}`);
      console.log(`  API  : http://localhost:${PORT}`);
      console.log(`  DOCS : http://localhost:${PORT}/api-docs`);
      console.log(`  WS   : ws://localhost:${PORT}`);
      console.log('─────────────────────────────────────────');
    });

    // Graceful SIGTERM shutdown (Render / Docker)
    process.on('SIGTERM', () => {
      console.log('SIGTERM received. Shutting down gracefully...');
      httpServer.close(() => {
        console.log('Server closed.');
        process.exit(0);
      });
    });

    return httpServer;
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

const server = startServer();

module.exports = server;
