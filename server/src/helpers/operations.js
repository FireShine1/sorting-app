// Core application logic: every operation validates its parameters and is put
// into the matching queue. The operations are used both by the REST routes and
// by POST /api/batch (several operations in one HTTP request).

import { HttpError } from '../utils/HttpError.js';
import {
  requireId, optionalId, parseFilter, parseLimit, parseOffset, parsePosition,
} from '../utils/validation.js';

/**
 * @param {object} deps
 * @param {import('../store/Store.js').Store} deps.store
 * @param {import('../queue/BatchQueue.js').BatchQueue} deps.dataQueue  1-second batches
 * @param {import('../queue/BatchQueue.js').BatchQueue} deps.addQueue   10-second batches
 */
export function createOperations({ store, dataQueue, addQueue }) {
  const read = (key, run) => dataQueue.enqueue({ kind: 'read', key, run });
  const write = (key, entity, run) => dataQueue.enqueue({ kind: 'write', key, entity, run });

  return {
    /** Unselected elements (left container). */
    items(params) {
      const filter = parseFilter(params.filter);
      const after = optionalId(params.after, 'after');
      const limit = parseLimit(params.limit);
      return read(`items|${filter}|${after}|${limit}`, () => store.listAvailable({ filter, after, limit }));
    },

    /** Selected elements in user order (right container). */
    selected(params) {
      const filter = parseFilter(params.filter);
      const offset = parseOffset(params.offset);
      const limit = parseLimit(params.limit);
      return read(`selected|${filter}|${offset}|${limit}`, () => store.listSelected({ filter, offset, limit }));
    },

    select(params) {
      const id = requireId(params.id);
      return write(`select|${id}`, `sel|${id}`, () => store.select(id));
    },

    deselect(params) {
      const id = requireId(params.id);
      return write(`deselect|${id}`, `sel|${id}`, () => store.deselect(id));
    },

    /**
     * Puts `id` before/after `targetId`. It works on the full list, so it is
     * correct even when the client sees a filtered subset.
     */
    reorder(params) {
      const id = requireId(params.id, 'id');
      const targetId = requireId(params.targetId, 'targetId');
      const position = parsePosition(params.position);
      return write(`move|${id}|${position}|${targetId}`, 'order', () => store.move(id, targetId, position));
    },

    /** Adds a new element (10-second batch). */
    add(params) {
      const id = requireId(params.id);
      const exists = () => new HttpError(409, 'exists', `Элемент ${id} уже существует`);

      // Fast path: already existing ids are rejected without waiting for the batch.
      if (store.has(id)) throw exists();

      return addQueue.enqueue({
        kind: 'write',
        key: `add|${id}`, // identical pending additions are merged into one
        run: () => {
          // Final guarantee: check and insert happen together inside the
          // single-threaded batch, so an id can never be inserted twice.
          if (!store.add(id)) throw exists();
          return { id, status: 'added' };
        },
      });
    },

    stats() {
      return {
        total: store.totalCount,
        selected: store.selectedCount,
        queues: [dataQueue.info(), addQueue.info()],
      };
    },
  };
}
