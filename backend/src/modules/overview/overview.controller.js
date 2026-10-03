import { respond } from '../../common/response.js';

export function createOverviewController(service) {
  return { get: async (req, res) => respond(req, res, await service.get()) };
}
