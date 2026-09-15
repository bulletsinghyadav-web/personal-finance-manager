const { createApp } = require('./app');
const config = require('./config/env');
const { closePool } = require('./db/pool');

const app = createApp();

const server = app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Personal Finance API listening on port ${config.port} [${config.nodeEnv}]`);
});

async function shutdown(signal) {
  // eslint-disable-next-line no-console
  console.log(`Received ${signal}, shutting down gracefully...`);
  server.close(async () => {
    try {
      await closePool();
    } finally {
      process.exit(0);
    }
  });
  // Force-exit if shutdown hangs
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = server;
