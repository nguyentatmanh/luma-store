import { Router } from 'express';
import { respond } from '../../common/response.js';

export function systemRoutes(pool) {
  const router = Router();
  router.get('/health', async (req, res) => {
    await pool.query('SELECT 1');
    respond(req, res, { status: 'ok', database: 'connected' });
  });
  router.get('/server-info', (req, res) => respond(req, res, {
    serverId: req.serverId,
    receivedHeaders: {
      host: req.get('host'),
      xRealIp: req.get('x-real-ip') || null,
      xForwardedFor: req.get('x-forwarded-for') || null,
      xForwardedProto: req.get('x-forwarded-proto') || null,
    },
  }));
  return router;
}
