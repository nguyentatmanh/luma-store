import { respond } from '../../common/response.js';
import { productId, productInput, productQuery } from './product.validation.js';

export function createProductController(service) {
  return {
    list: async (req, res) => respond(req, res, await service.list(productQuery(req.query))),
    find: async (req, res) => respond(req, res, await service.find(productId(req.params.id))),
    create: async (req, res) => respond(req, res, await service.create(productInput(req.body, true)), 201),
    update: async (req, res) => respond(req, res, await service.update(productId(req.params.id), productInput(req.body))),
    upload: async (req, res) => respond(req, res, await service.uploadImage(productId(req.params.id), req.file)),
    categories: async (req, res) => respond(req, res, await service.categories()),
  };
}
