import { respond } from '../../common/response.js';
import { movementInput, movementQuery } from './inventory.validation.js';

export function createInventoryController(service) {
  return {
    list: async (req, res) => respond(req, res, await service.list(movementQuery(req.query))),
    move: async (req, res) => respond(req, res, await service.move(movementInput(req.body)), 201),
  };
}
