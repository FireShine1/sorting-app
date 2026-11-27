// Client-side request queue.
//
// Data operations are not sent one by one: they are put into a queue and sent
// together in a single POST /api/batch. Only one batch request is in flight at
// a time; everything that arrives meanwhile goes into the next batch.
// Identical reads that are queued or already in flight are deduplicated and
// share one result.

import { ApiError, request } from './http.js';
import { MAX_BATCH_OPS } from '../config.js';

let queue = []; // { op, resolve, reject }
const readsByKey = new Map(); // dedup key -> promise
let sending = false;

/**
 * @param {object} op           operation for the server, e.g. { op: 'select', id: 5 }
 * @param {object} [options]
 * @param {boolean} [options.dedup] merge with an identical queued/in-flight op
 */
export function enqueue(op, { dedup = false } = {}) {
  const key = dedup ? JSON.stringify(op) : null;
  if (key && readsByKey.has(key)) return readsByKey.get(key);

  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  queue.push({ op, resolve, reject });

  if (key) {
    readsByKey.set(key, promise);
    promise.catch(() => {}).finally(() => readsByKey.delete(key));
  }
  pump();
  return promise;
}

function settle(entry, result) {
  if (result?.ok) entry.resolve(result.data);
  else entry.reject(new ApiError(result?.status, result?.error, result?.message || 'Ошибка запроса'));
}

async function pump() {
  if (sending || queue.length === 0) return;
  sending = true;
  const batch = queue.slice(0, MAX_BATCH_OPS);
  queue = queue.slice(MAX_BATCH_OPS);
  try {
    const { results } = await request('POST', '/api/batch', { ops: batch.map((e) => e.op) });
    batch.forEach((entry, i) => settle(entry, results[i]));
  } catch (e) {
    batch.forEach((entry) => entry.reject(e));
  } finally {
    sending = false;
    pump();
  }
}
