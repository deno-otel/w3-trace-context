export class InvalidError extends Error {
  constructor(message?: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;
    this.message = message ?? "";
  }
}
