import { Router } from 'express';

export function overviewRoutes(controller) {
  const router = Router();
  router.get('/overview', controller.get);
  return router;
}
