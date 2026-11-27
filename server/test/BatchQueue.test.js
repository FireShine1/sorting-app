import test from 'node:test';
import assert from 'node:assert/strict';
import { BatchQueue } from '../src/queue/BatchQueue.js';

test('queue deduplicates reads and keeps write order', async () => {
  const q = new BatchQueue({ name: 't', intervalMs: 1000 });
  const log = [];
  const r1 = q.enqueue({ key: 'r', kind: 'read', run: () => { log.push('read'); return 1; } });
  const r2 = q.enqueue({ key: 'r', kind: 'read', run: () => { log.push('read'); return 2; } });
  q.enqueue({ key: 'sel|5', entity: '5', kind: 'write', run: () => log.push('sel') });
  q.enqueue({ key: 'sel|5', entity: '5', kind: 'write', run: () => log.push('sel-dup') });
  q.enqueue({ key: 'desel|5', entity: '5', kind: 'write', run: () => log.push('desel') });
  q.enqueue({ key: 'sel|5', entity: '5', kind: 'write', run: () => log.push('sel2') });

  assert.equal(r1, r2);
  q.flush();
  assert.deepEqual(log, ['sel', 'desel', 'sel2', 'read']);
  assert.equal(await r1, 1);
  assert.equal(q.info().deduplicated, 2);
});

test('errors of one operation do not affect others', async () => {
  const q = new BatchQueue({ name: 't', intervalMs: 1000 });
  const bad = q.enqueue({ kind: 'write', run: () => { throw new Error('boom'); } });
  const good = q.enqueue({ kind: 'read', run: () => 'ok' });
  q.flush();
  await assert.rejects(bad, /boom/);
  assert.equal(await good, 'ok');
});
