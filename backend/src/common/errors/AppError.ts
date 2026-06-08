export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly errorCode: string,
    message: string
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class BadRequestError extends AppError {
  constructor(errorCode: string, message: string) {
    super(400, errorCode, message);
  }
}

export class NotFoundError extends AppError {
  constructor(errorCode: string, message: string) {
    super(404, errorCode, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(errorCode: string, message: string) {
    super(403, errorCode, message);
  }
}

export class ConflictError extends AppError {
  constructor(errorCode: string, message: string) {
    super(409, errorCode, message);
  }
}
