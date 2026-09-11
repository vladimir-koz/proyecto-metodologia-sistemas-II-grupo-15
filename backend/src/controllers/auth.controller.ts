import { NextFunction, Request, Response } from 'express';
import { getProfile, loginUser, registerUser } from '../services/auth.service';
import { AppError } from '../utils/AppError';

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await registerUser(req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await loginUser(req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function perfil(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Usuario no autenticado', 401);
    }

    const result = await getProfile(req.user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
}
