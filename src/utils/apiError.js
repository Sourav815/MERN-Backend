class apiError extends Error {
  constructor(
    statusCode,
    errors = [],
    stack = "",
    message = "Something error wrong"
  ) {
    super(message);
    this.data = null;
    this.statusCode = statusCode;
    this.success = false;
    this.message = message;
    this.errors = errors;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export { apiError };
