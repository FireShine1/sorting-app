// In-memory storage.
//
// Elements 1..baseMax exist implicitly (they are never materialised, so the
// million base elements cost no memory). Elements added by users live in a
// sorted array `extra` + a Set for O(1) lookups.
//
// Selected elements are kept in an ordered array (the user-defined order)
// plus a Set for O(1) membership checks.

import { BASE_MAX, PAGE_SIZE } from '../config.js';
import { HttpError } from '../utils/HttpError.js';
import { upperBound, insertSorted } from '../utils/sortedArray.js';

const matchesFilter = (id, filter) => filter === '' || String(id).includes(filter);

/** Cuts the "one extra" element used to detect the next page. */
function toPage(items, limit) {
  const hasMore = items.length > limit;
  if (hasMore) items.length = limit;
  return { items, hasMore };
}

export class Store {
  constructor(baseMax = BASE_MAX) {
    this.baseMax = baseMax;
    this.extra = [];
    this.extraSet = new Set();
    this.selected = [];
    this.selectedSet = new Set();
  }

  has(id) {
    return (id >= 1 && id <= this.baseMax) || this.extraSet.has(id);
  }

  get totalCount() {
    return this.baseMax + this.extra.length;
  }

  get selectedCount() {
    return this.selected.length;
  }

  /** Adds a new id. Returns false if it already exists (the hard uniqueness guarantee). */
  add(id) {
    if (this.has(id)) return false;
    insertSorted(this.extra, id);
    this.extraSet.add(id);
    return true;
  }

  /**
   * Unselected elements in ascending id order, cursor-based pagination.
   * `after` - last id the client already has (null for the first page).
   */
  listAvailable({ filter = '', after = null, limit = PAGE_SIZE }) {
    const items = [];
    const want = limit + 1; // one extra to know whether there is a next page

    // The base range can only match a filter made of digits that fits in "1000000".
    const baseCanMatch = filter === '' || (/^\d+$/.test(filter) && filter.length <= String(this.baseMax).length);

    // Two sorted sequences (base range and added ids) are merged on the fly.
    let b = baseCanMatch ? (after === null ? 1 : Math.max(1, after + 1)) : this.baseMax + 1;
    let e = after === null ? 0 : upperBound(this.extra, after);

    while (items.length < want) {
      const bv = b <= this.baseMax ? b : Infinity;
      const ev = e < this.extra.length ? this.extra[e] : Infinity;
      if (bv === Infinity && ev === Infinity) break;

      let id;
      if (bv < ev) { id = bv; b++; } else { id = ev; e++; }

      if (!this.selectedSet.has(id) && matchesFilter(id, filter)) items.push(id);
    }

    return toPage(items, limit);
  }

  /** Selected elements in user order, offset-based pagination over the filtered sequence. */
  listSelected({ filter = '', offset = 0, limit = PAGE_SIZE }) {
    const items = [];
    const want = limit + 1;
    let skipped = 0;
    for (let i = 0; i < this.selected.length && items.length < want; i++) {
      const id = this.selected[i];
      if (!matchesFilter(id, filter)) continue;
      if (skipped < offset) { skipped++; continue; }
      items.push(id);
    }
    return { ...toPage(items, limit), total: this.selected.length };
  }

  select(id) {
    if (!this.has(id)) throw new HttpError(404, 'not_found', `Элемент ${id} не найден`);
    if (this.selectedSet.has(id)) return { changed: false };
    this.selected.push(id);
    this.selectedSet.add(id);
    return { changed: true };
  }

  deselect(id) {
    if (!this.selectedSet.has(id)) return { changed: false };
    this.selected.splice(this.selected.indexOf(id), 1);
    this.selectedSet.delete(id);
    return { changed: true };
  }

  /** Moves `id` directly before/after `targetId` in the full selected list. */
  move(id, targetId, position) {
    if (id === targetId) return { changed: false };
    for (const x of [id, targetId]) {
      if (!this.selectedSet.has(x)) throw new HttpError(404, 'not_selected', `Элемент ${x} не выбран`);
    }
    this.selected.splice(this.selected.indexOf(id), 1);
    const targetIndex = this.selected.indexOf(targetId);
    this.selected.splice(position === 'after' ? targetIndex + 1 : targetIndex, 0, id);
    return { changed: true };
  }
}
