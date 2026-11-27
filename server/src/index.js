import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { PORT } from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const staticDir = path.resolve(__dirname, '../../client/dist');

createApp({ staticDir }).listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
