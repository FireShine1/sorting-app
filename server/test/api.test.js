import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { Store } from '../src/store/Store.js';

// Short batch intervals so the test runs fast.
async function startServer() {
  const app = createApp({ store: new Store(), dataIntervalMs: 20, addIntervalMs: 50 });
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const base = `http://localhost:${server.address().port}/api`;
  const call = async (method, path, body) => {
    const res = await fetch(base + path, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, body: await res.json() };
  };
  const close = () => {
    app.locals.queues.dataQueue.stop();
    app.locals.queues.addQueue.stop();
    return new Promise((resolve) => server.close(resolve));
  };
  return { call, close };
}

test('API: select, filter, reorder, batch', async (t) => {
  const { call, close } = await startServer();
  t.after(close);

  for (const id of [3, 13, 5, 31]) await call('POST', '/selected', { id });

  const left = await call('GET', '/items?limit=50');
  assert.equal(left.body.items.length, 20); // never more than 20
  assert.equal(left.body.items.includes(3), false);

  await call('POST', '/selected/reorder', { id: 31, targetId: 13, position: 'before' });
  assert.deepEqual((await call('GET', '/selected?filter=3')).body.items, [3, 31, 13]);
  assert.deepEqual((await call('GET', '/selected')).body.items, [3, 31, 13, 5]);

  const batch = await call('POST', '/batch', {
    ops: [{ op: 'deselect', id: 5 }, { op: 'selected' }, { op: 'select', id: 'x' }],
  });
  assert.deepEqual(batch.body.results[1].data.items, [3, 31, 13]);
  assert.equal(batch.body.results[2].ok, false);
  assert.equal(batch.body.results[2].status, 400);
});

test('API: concurrent additions of the same id insert it once', async (t) => {
  const { call, close } = await startServer();
  t.after(close);

  const results = await Promise.all(Array.from({ length: 30 }, () => call('POST', '/items', { id: 5_000_000 })));
  assert.ok(results.every((r) => r.status === 201 || r.status === 409));

  const found = await call('GET', '/items?filter=5000000');
  assert.deepEqual(found.body.items, [5_000_000]);
  assert.equal((await call('POST', '/items', { id: 5_000_000 })).status, 409);
  assert.equal((await call('POST', '/items', { id: 7 })).status, 409);
  assert.equal((await call('GET', '/stats')).body.total, 1_000_001);
});
