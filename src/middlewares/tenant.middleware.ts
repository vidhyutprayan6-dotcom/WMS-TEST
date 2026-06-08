import { Request, Response, NextFunction } from 'express';
import { BadRequestError, ForbiddenError } from '../common/errors/AppError';
import { HTTP_MESSAGES } from '../common/constants';

export interface TenantRequest extends Request {
  clientId: string;
  userId: string;
}

export function tenantMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const clientId = req.headers['x-client-id'] as string | undefined;
  const userId = req.headers['x-user-id'] as string | undefined;

  if (!clientId) {
    return next(new BadRequestError('TENANT_REQUIRED', HTTP_MESSAGES.TENANT_REQUIRED));
  }

  if (!userId) {
    return next(new BadRequestError('USER_REQUIRED', HTTP_MESSAGES.USER_REQUIRED));
  }

  (req as TenantRequest).clientId = clientId;
  (req as TenantRequest).userId = userId;
  next();
}

export function validateTenantMatch(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const tenantReq = req as TenantRequest;
  const bodyClientId = req.body?.clientId as string | undefined;

  if (bodyClientId && bodyClientId !== tenantReq.clientId) {
    return next(new ForbiddenError('TENANT_MISMATCH', HTTP_MESSAGES.TENANT_MISMATCH));
  }

  next();
}
