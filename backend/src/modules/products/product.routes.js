import { Router } from 'express';
import multer from 'multer';

export function productRoutes(controller) {
  const router = Router();
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 8 * 1024 * 1024, files: 1, fields: 0, parts: 2 },
  });
  router.get('/categories', controller.categories);
  router.get('/products', controller.list);
  router.post('/products', controller.create);
  router.get('/products/:id', controller.find);
  router.put('/products/:id', controller.update);
  router.post('/products/:id/image', upload.single('image'), controller.upload);
  return router;
}
