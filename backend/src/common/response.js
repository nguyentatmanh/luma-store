export function respond(req, res, data, status = 200) {
  return res.status(status).json({
    data,
    meta: { serverId: req.serverId, requestId: req.requestId },
  });
}
