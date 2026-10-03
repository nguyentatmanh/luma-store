import { Router } from 'express';

export function inventoryRoutes(controller) {
  const router = Router();
  router.get('/inventory/movements', controller.list);
  router.post('/inventory/movements', controller.move);
  return router;
}
