import test from 'node:test';
import assert from 'node:assert/strict';
import { Store } from '../src/store/Store.js';

test('first page of available items has 20 elements starting from 1', () => {
  const s = new Store();
  const page = s.listAvailable({ limit: 20 });
  assert.deepEqual(page.items, Array.from({ length: 20 }, (_, i) => i + 1));
  assert.equal(page.hasMore, true);
});

test('cursor pagination skips selected and merges added ids in order', () => {
  const s = new Store(10);
  s.add(-5);
  s.add(15);
  s.add(0);
  s.select(2);
  s.select(3);
  const p1 = s.listAvailable({ limit: 4 });
  assert.deepEqual(p1.items, [-5, 0, 1, 4]);
  const p2 = s.listAvailable({ after: 4, limit: 20 });
  assert.deepEqual(p2.items, [5, 6, 7, 8, 9, 10, 15]);
  assert.equal(p2.hasMore, false);
});

test('filter by id substring', () => {
  const s = new Store();
  s.add(1234567890);
  const p = s.listAvailable({ filter: '99999', limit: 20 });
  assert.deepEqual(p.items, [99999, 199999, 299999, 399999, 499999, 599999, 699999, 799999, 899999, 999990, 999991, 999992, 999993, 999994, 999995, 999996, 999997, 999998, 999999]);
  assert.equal(p.hasMore, false);
  assert.deepEqual(s.listAvailable({ filter: '123456789' }).items, [1234567890]);
  assert.deepEqual(s.listAvailable({ filter: 'abc' }).items, []);
});

test('add rejects duplicates', () => {
  const s = new Store();
  assert.equal(s.add(5), false);
  assert.equal(s.add(2_000_000), true);
  assert.equal(s.add(2_000_000), false);
});

test('selected: order, filter, offset, move', () => {
  const s = new Store();
  [10, 21, 31, 41, 12].forEach((id) => s.select(id));
  assert.deepEqual(s.listSelected({}).items, [10, 21, 31, 41, 12]);
  assert.deepEqual(s.listSelected({ filter: '1', offset: 2, limit: 2 }), { items: [31, 41], hasMore: true, total: 5 });

  s.move(12, 21, 'before');
  assert.deepEqual(s.selected, [10, 12, 21, 31, 41]);
  s.move(10, 41, 'after');
  assert.deepEqual(s.selected, [12, 21, 31, 41, 10]);
  s.deselect(31);
  assert.deepEqual(s.selected, [12, 21, 41, 10]);
  assert.throws(() => s.move(31, 10, 'before'));
});
