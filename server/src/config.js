export const PORT = Number(process.env.PORT) || 3000;

/** Elements 1..BASE_MAX exist from the start. */
export const BASE_MAX = 1_000_000;

/** Maximum number of elements returned by one request. */
export const PAGE_SIZE = 20;

export const MAX_FILTER_LENGTH = 32;

/** Maximum number of operations in one POST /api/batch. */
export const MAX_BATCH_OPS = 100;

/** Reads and changes (select / deselect / reorder) are processed once per second. */
export const DATA_BATCH_INTERVAL_MS = 1000;

/** Additions of new elements are processed once per 10 seconds. */
export const ADD_BATCH_INTERVAL_MS = 10_000;

export const JSON_BODY_LIMIT = '10kb';
