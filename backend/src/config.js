import path from 'node:path';

function integerEnv(name, fallback) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value < 1) throw new Error('Invalid environment: ' + name);
  return value;
}

export const config = Object.freeze({
  port: integerEnv('PORT', 8080),
  serverId: process.env.SERVER_ID || 'BACKEND-LOCAL',
  uploadDir: path.resolve(process.env.UPLOAD_DIR || './uploads'),
  mysql: {
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: integerEnv('MYSQL_PORT', 3306),
    database: process.env.MYSQL_DATABASE || 'luma_store',
    user: process.env.MYSQL_USER || 'product_app',
    password: process.env.MYSQL_PASSWORD || '',
    connectionLimit: 10,
    waitForConnections: true,
    timezone: 'Z',
    charset: 'utf8mb4',
  },
});
