import { randomUUID } from 'node:crypto';

export function requestContext(serverId) {
  return (req, res, next) => {
    req.requestId = randomUUID();
    req.serverId = serverId;
    res.setHeader('X-Backend-Id', serverId);
    res.setHeader('X-Request-Id', req.requestId);
    res.setHeader('Cache-Control', 'no-store');
    const start = performance.now();
    res.on('finish', () => console.log(JSON.stringify({
      event: 'request', serverId, requestId: req.requestId,
      method: req.method, path: req.path, status: res.statusCode,
      durationMs: Math.round(performance.now() - start),
      forwardedFor: req.get('x-forwarded-for') || null,
      forwardedProto: req.get('x-forwarded-proto') || null,
    })));
    next();
  };
}
