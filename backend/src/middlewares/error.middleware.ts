import { Request, Response, NextFunction } from 'express';
import { AppError } from '../common/errors/AppError';
import { ZodError } from 'zod';

export function errorMiddleware(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.errorCode,
      message: err.message,
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
    });
    return;
  }

  const errName = err.constructor?.name ?? '';
  if (errName === 'PrismaClientInitializationError' || errName === 'PrismaClientKnownRequestError') {
    res.status(503).json({
      success: false,
      error: 'DATABASE_ERROR',
      message: 'Database unavailable. APIs are running in demo mode when Supabase is unreachable.',
    });
    return;
  }

  const prismaCode = (err as { code?: string }).code;
  if (prismaCode?.startsWith('P')) {
    res.status(503).json({
      success: false,
      error: 'DATABASE_ERROR',
      message: err.message || 'Database connection failed. Check DATABASE_URL in .env',
    });
    return;
  }

  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred.',
  });
}
