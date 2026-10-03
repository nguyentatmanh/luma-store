import express from 'express';
import { requestContext } from './common/request-context.js';
import { AppError, errorHandler } from './common/errors.js';
import { createImageStorage } from './infrastructure/image-storage.js';
import { createProductRepository } from './modules/products/product.repository.js';
import { createProductService } from './modules/products/product.service.js';
import { createProductController } from './modules/products/product.controller.js';
import { productRoutes } from './modules/products/product.routes.js';
import { createInventoryRepository } from './modules/inventory/inventory.repository.js';
import { createInventoryService } from './modules/inventory/inventory.service.js';
import { createInventoryController } from './modules/inventory/inventory.controller.js';
import { inventoryRoutes } from './modules/inventory/inventory.routes.js';
import { createOverviewRepository } from './modules/overview/overview.repository.js';
import { createOverviewService } from './modules/overview/overview.service.js';
import { createOverviewController } from './modules/overview/overview.controller.js';
import { overviewRoutes } from './modules/overview/overview.routes.js';
import { systemRoutes } from './modules/system/system.routes.js';

// Composition root: dependencies are wired here, business modules do not import globals.
export function createApp({ pool, config }) {
  const products = createProductRepository(pool);
  const inventory = createInventoryRepository(pool);
  const images = createImageStorage(config.uploadDir);
  const productService = createProductService({ pool, products, inventory, images });
  const inventoryService = createInventoryService({ pool, products, inventory });
  const overview = createOverviewRepository(pool);
  const overviewService = createOverviewService({ overview, productService, inventory });

  const app = express();
  app.disable('x-powered-by');
  app.use(requestContext(config.serverId));
  app.use(express.json({ limit: '64kb' }));
  app.use('/api', productRoutes(createProductController(productService)));
  app.use('/api', inventoryRoutes(createInventoryController(inventoryService)));
  app.use('/api', overviewRoutes(createOverviewController(overviewService)));
  app.use('/api', systemRoutes(pool));
  app.use((req, res, next) => next(new AppError(404, 'ROUTE_NOT_FOUND', 'Không tìm thấy API.')));
  app.use(errorHandler);
  return app;
}
