// REST routes. Handlers only map an HTTP request to an operation.

import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { executeBatch } from '../helpers/batch.js';

const handle = (run, status = 200) => asyncHandler(async (req, res) => {
  res.status(status).json(await run(req));
});

/** @param {ReturnType<import('../helpers/operations.js').createOperations>} ops */
export function createApiRouter(ops) {
  const router = Router();

  // Left container: unselected elements + adding new ones
  router.get('/items', handle((req) => ops.items(req.query)));
  router.post('/items', handle((req) => ops.add(req.body ?? {}), 201));

  // Right container: selected elements
  router.get('/selected', handle((req) => ops.selected(req.query)));
  router.post('/selected', handle((req) => ops.select(req.body ?? {})));
  router.delete('/selected/:id', handle((req) => ops.deselect(req.params)));
  router.post('/selected/reorder', handle((req) => ops.reorder(req.body ?? {})));

  // Several operations in one request: { ops: [{ op: 'select', id: 5 }, ...] }
  router.post('/batch', handle((req) => executeBatch(ops, req.body?.ops)));

  // Queue counters (not batched)
  router.get('/stats', (req, res) => res.json(ops.stats()));

  return router;
}
