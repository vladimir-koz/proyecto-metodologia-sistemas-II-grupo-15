import { NextFunction, Request, Response } from 'express';
import {
  createMuscleGroup,
  deleteMuscleGroup,
  getMuscleGroupById,
  listMuscleGroups,
  updateMuscleGroup
} from '../services/muscleGroup.service';
import { AppError } from '../utils/AppError';

function getAuthenticatedUserId(req: Request): number {
  if (!req.user) {
    throw new AppError('Usuario no autenticado', 401);
  }

  return req.user.id;
}

export async function index(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await listMuscleGroups(getAuthenticatedUserId(req));
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function show(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await getMuscleGroupById(Number(req.params.id), getAuthenticatedUserId(req));
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function store(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await createMuscleGroup(req.body, getAuthenticatedUserId(req));
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await updateMuscleGroup(Number(req.params.id), req.body, getAuthenticatedUserId(req));
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function destroy(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await deleteMuscleGroup(Number(req.params.id), getAuthenticatedUserId(req));
    res.json(result);
  } catch (error) {
    next(error);
  }
}
