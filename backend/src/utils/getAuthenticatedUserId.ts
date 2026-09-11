import { Request } from 'express';
import { AppError } from './AppError';

export function getAuthenticatedUserId(req: Request): number {
  if (!req.user) {
    throw new AppError('Usuario no autenticado', 401);
  }

  return req.user.id;
}
