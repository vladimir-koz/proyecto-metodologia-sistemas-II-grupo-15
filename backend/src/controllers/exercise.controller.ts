import { NextFunction, Request, Response } from 'express';
import {
  createExercise,
  deleteExercise,
  getExerciseById,
  listExercises,
  listExercisesByMuscleGroup,
  updateExercise
} from '../services/exercise.service';
import { AppError } from '../utils/AppError';

function getAuthenticatedUserId(req: Request): number {
  if (!req.user) {
    throw new AppError('Usuario no autenticado', 401);
  }

  return req.user.id;
}

export async function index(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const muscleGroupId = req.query.muscleGroupId;
    const result = muscleGroupId === undefined
      ? await listExercises(userId)
      : await listExercisesByMuscleGroup(Number(muscleGroupId), userId);

    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function show(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await getExerciseById(Number(req.params.id), getAuthenticatedUserId(req));
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function store(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await createExercise(req.body, getAuthenticatedUserId(req));
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await updateExercise(Number(req.params.id), req.body, getAuthenticatedUserId(req));
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function destroy(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await deleteExercise(Number(req.params.id), getAuthenticatedUserId(req));
    res.json(result);
  } catch (error) {
    next(error);
  }
}
