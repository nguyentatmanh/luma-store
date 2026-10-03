import { config } from './config.js';
import { createPool } from './database/pool.js';
import { createApp } from './app.js';

const pool = createPool(config.mysql);
await pool.query('SELECT 1');
const app = createApp({ pool, config });
const server = app.listen(config.port, () => console.log(JSON.stringify({
  event: 'started', serverId: config.serverId, port: config.port,
})));

function shutdown() {
  const timeout = setTimeout(() => process.exit(1), 10000);
  timeout.unref();
  server.close(async () => {
    await pool.end();
    clearTimeout(timeout);
    process.exit(0);
  });
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
