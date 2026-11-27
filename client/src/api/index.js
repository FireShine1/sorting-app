// Public API of the backend used by components.

import { request } from './http.js';
import { enqueue } from './batchClient.js';
import { PAGE_SIZE } from '../config.js';

export { ApiError } from './http.js';

export const api = {
  /** Unselected elements, ascending, after the cursor `after`. */
  getItems: ({ filter, after }) => enqueue({ op: 'items', filter, after, limit: PAGE_SIZE }, { dedup: true }),

  /** Selected elements in user order, starting from `offset` in the filtered list. */
  getSelected: ({ filter, offset }) => enqueue({ op: 'selected', filter, offset, limit: PAGE_SIZE }, { dedup: true }),

  select: (id) => enqueue({ op: 'select', id }),
  deselect: (id) => enqueue({ op: 'deselect', id }),

  /** Put `id` before/after `targetId` in the full selected list. */
  reorder: (id, targetId, position) => enqueue({ op: 'reorder', id, targetId, position }),

  /** Additions wait for the server's 10-second batch, so they use their own request. */
  addItem: (id) => request('POST', '/api/items', { id }),
};
