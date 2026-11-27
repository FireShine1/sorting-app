import express from 'express';
import { ADD_BATCH_INTERVAL_MS, DATA_BATCH_INTERVAL_MS, JSON_BODY_LIMIT } from './config.js';
import { Store } from './store/Store.js';
import { BatchQueue } from './queue/BatchQueue.js';
import { createOperations } from './helpers/operations.js';
import { createApiRouter } from './routes/apiRouter.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { staticFiles } from './middleware/staticFiles.js';

export function createApp({
  store = new Store(),
  dataIntervalMs = DATA_BATCH_INTERVAL_MS,
  addIntervalMs = ADD_BATCH_INTERVAL_MS,
  staticDir,
} = {}) {
  const dataQueue = new BatchQueue({ name: 'data', intervalMs: dataIntervalMs });
  const addQueue = new BatchQueue({ name: 'add', intervalMs: addIntervalMs });
  dataQueue.start();
  addQueue.start();

  const operations = createOperations({ store, dataQueue, addQueue });

  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: JSON_BODY_LIMIT }));

  app.use('/api', createApiRouter(operations), notFound);
  app.use(staticFiles(staticDir));
  app.use(errorHandler);

  app.locals.queues = { dataQueue, addQueue };
  return app;
}
