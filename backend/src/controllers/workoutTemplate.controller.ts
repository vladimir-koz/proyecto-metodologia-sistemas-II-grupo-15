import { NextFunction, Request, Response } from 'express';
import {
  createWorkoutTemplate,
  deleteWorkoutTemplate,
  getWorkoutTemplateById,
  listWorkoutTemplates,
  updateWorkoutTemplate
} from '../services/workoutTemplate.service';
import { AppError } from '../utils/AppError';

function getAuthenticatedUserId(req: Request): number {
  if (!req.user) {
    throw new AppError('Usuario no autenticado', 401);
  }

  return req.user.id;
}

export async function index(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await listWorkoutTemplates(getAuthenticatedUserId(req));
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function show(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await getWorkoutTemplateById(Number(req.params.id), getAuthenticatedUserId(req));
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function store(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await createWorkoutTemplate(req.body, getAuthenticatedUserId(req));
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await updateWorkoutTemplate(Number(req.params.id), req.body, getAuthenticatedUserId(req));
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function destroy(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await deleteWorkoutTemplate(Number(req.params.id), getAuthenticatedUserId(req));
    res.json(result);
  } catch (error) {
    next(error);
  }
}
