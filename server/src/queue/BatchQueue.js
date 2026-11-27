// Request queue with periodic batch processing and deduplication.
//
// - Every incoming operation is put into the queue and its HTTP request waits
//   for the next flush (once per `intervalMs`).
// - Operations with the same dedup key that are waiting in the same batch are
//   merged: the work is done once and every caller receives the same result.
// - On flush, write operations are applied strictly in arrival order (the
//   queue is the single writer, so there are no races), then read operations
//   are executed against the already-updated state.

export class BatchQueue {
  constructor({ name, intervalMs }) {
    this.name = name;
    this.intervalMs = intervalMs;
    this.writes = [];
    this.reads = [];
    this.byKey = new Map();
    // entity -> dedup key of the last write touching it in the current batch
    this.lastWriteByEntity = new Map();
    this.timer = null;
    this.nextFlushAt = null;
    this.stats = { received: 0, deduplicated: 0, executed: 0, batches: 0, lastBatchSize: 0 };
  }

  start() {
    if (this.timer) return;
    this.nextFlushAt = Date.now() + this.intervalMs;
    this.timer = setInterval(() => {
      this.nextFlushAt = Date.now() + this.intervalMs;
      this.flush();
    }, this.intervalMs);
    this.timer.unref?.();
  }

  stop() {
    clearInterval(this.timer);
    this.timer = null;
  }

  get size() {
    return this.writes.length + this.reads.length;
  }

  /**
   * @param {object} op
   * @param {string|null} op.key   dedup key; null disables deduplication
   * @param {'read'|'write'} op.kind
   * @param {() => any} op.run     executed during flush
   * @param {string} [op.entity]   for writes: what the write touches. A write is
   *   merged only with the *latest* write to the same entity, so that
   *   "select 5, deselect 5, select 5" stays three operations, while
   *   "select 5, select 5" collapses into one.
   * @returns {Promise<any>}
   */
  enqueue({ key = null, kind = 'read', run, entity }) {
    this.stats.received++;

    if (key !== null) {
      const existing = this.byKey.get(key);
      const mergeable = existing && (entity === undefined || this.lastWriteByEntity.get(entity) === key);
      if (mergeable) {
        this.stats.deduplicated++;
        return existing.promise;
      }
    }

    const entry = { key, run, ...Promise.withResolvers() };
    if (key !== null) this.byKey.set(key, entry);
    if (entity !== undefined) this.lastWriteByEntity.set(entity, key);
    (kind === 'write' ? this.writes : this.reads).push(entry);
    return entry.promise;
  }

  flush() {
    const batch = [...this.writes, ...this.reads];
    this.writes = [];
    this.reads = [];
    this.byKey = new Map();
    this.lastWriteByEntity = new Map();
    if (batch.length === 0) return;

    this.stats.batches++;
    this.stats.lastBatchSize = batch.length;
    for (const entry of batch) {
      this.stats.executed++;
      try {
        entry.resolve(entry.run());
      } catch (err) {
        entry.reject(err);
      }
    }
  }

  info() {
    return {
      name: this.name,
      intervalMs: this.intervalMs,
      pending: this.size,
      nextFlushAt: this.nextFlushAt,
      ...this.stats,
    };
  }
}
