import { HttpError } from './HttpError.js';
import { MAX_FILTER_LENGTH, PAGE_SIZE } from '../config.js';

const isEmpty = (value) => value === undefined || value === null || value === '';

/** Returns a safe integer or null. */
export function parseId(value) {
  const str = String(value ?? '').trim();
  if (!/^-?\d+$/.test(str)) return null;
  const n = Number(str);
  return Number.isSafeInteger(n) ? n : null;
}

export function requireId(value, field = 'id') {
  const id = parseId(value);
  if (id === null) throw new HttpError(400, 'invalid_id', `Поле "${field}" должно быть целым числом`);
  return id;
}

/** Optional id: empty value means "not set". */
export function optionalId(value, field) {
  return isEmpty(value) ? null : requireId(value, field);
}

export function parseFilter(value) {
  const filter = String(value ?? '').trim();
  if (filter.length > MAX_FILTER_LENGTH) throw new HttpError(400, 'invalid_filter', 'Слишком длинный фильтр');
  return filter;
}

/** Page size: never more than PAGE_SIZE (20) elements per request. */
export function parseLimit(value) {
  if (isEmpty(value)) return PAGE_SIZE;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) throw new HttpError(400, 'invalid_limit', 'Некорректный limit');
  return Math.min(n, PAGE_SIZE);
}

export function parseOffset(value) {
  if (isEmpty(value)) return 0;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) throw new HttpError(400, 'invalid_offset', 'Некорректный offset');
  return n;
}

export function parsePosition(value) {
  if (value !== 'before' && value !== 'after') {
    throw new HttpError(400, 'invalid_position', 'position должен быть "before" или "after"');
  }
  return value;
}
