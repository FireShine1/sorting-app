// Execution of POST /api/batch: several data operations in one HTTP request.

import { HttpError } from '../utils/HttpError.js';
import { MAX_BATCH_OPS } from '../config.js';

/** Operations allowed in a batch (additions have their own 10-second queue). */
const BATCH_OPS = new Set(['items', 'selected', 'select', 'deselect', 'reorder']);

function toResult(settled) {
  if (settled.status === 'fulfilled') return { ok: true, data: settled.value };
  const err = settled.reason;
  if (err instanceof HttpError) {
    return { ok: false, status: err.status, error: err.code, message: err.message };
  }
  console.error(err);
  return { ok: false, status: 500, error: 'internal', message: 'Внутренняя ошибка сервера' };
}

/**
 * @param {ReturnType<import('./operations.js').createOperations>} operations
 * @param {unknown} list  [{ op: 'select', id: 5 }, ...]
 * @returns {Promise<{ results: object[] }>} results in the same order as the operations
 */
export async function executeBatch(operations, list) {
  if (!Array.isArray(list) || list.length === 0 || list.length > MAX_BATCH_OPS) {
    throw new HttpError(400, 'invalid_batch', `ops должен быть массивом из 1..${MAX_BATCH_OPS} операций`);
  }

  const settled = await Promise.allSettled(list.map(async (item) => {
    if (!item || !BATCH_OPS.has(item.op)) throw new HttpError(400, 'invalid_op', 'Неизвестная операция');
    return operations[item.op](item);
  }));

  return { results: settled.map(toResult) };
}
