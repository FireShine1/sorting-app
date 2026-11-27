import { HttpError } from '../utils/HttpError.js';

/** 404 for unknown API endpoints. */
export function notFound(req, res) {
  res.status(404).json({ error: 'not_found', message: 'Unknown endpoint' });
}

/** Converts errors into JSON responses. */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.code, message: err.message });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'invalid_json', message: 'Некорректный JSON' });
  }
  console.error(err);
  return res.status(500).json({ error: 'internal', message: 'Внутренняя ошибка сервера' });
}
