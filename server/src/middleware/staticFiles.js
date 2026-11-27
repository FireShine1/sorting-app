import fs from 'node:fs';
import path from 'node:path';
import express, { Router } from 'express';

/** Serves the built frontend (client/dist) with SPA fallback to index.html. */
export function staticFiles(dir) {
  const router = Router();
  if (!dir || !fs.existsSync(dir)) return router;

  router.use(express.static(dir, { index: false, maxAge: '1h' }));
  router.get('*', (req, res) => res.sendFile(path.join(dir, 'index.html')));
  return router;
}
