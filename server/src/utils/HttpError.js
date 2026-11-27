/** An error that is sent to the client with the given HTTP status. */
export class HttpError extends Error {
  /**
   * @param {number} status  HTTP status code
   * @param {string} code    machine-readable error code
   * @param {string} message human-readable message
   */
  constructor(status, code, message) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
  }
}
