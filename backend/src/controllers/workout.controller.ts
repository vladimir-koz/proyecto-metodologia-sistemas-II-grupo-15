import { NextFunction, Request, Response } from 'express';
import {
  createWorkoutService,
  deleteWorkoutService,
  getWorkout,
  getWorkouts,
  updateWorkoutService
} from '../services/workout.service';
import { getAuthenticatedUserId } from '../utils/getAuthenticatedUserId';
import { parseId } from '../utils/parseId';

export async function listWorkouts(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = getAuthenticatedUserId(req);
    const workouts = await getWorkouts(userId);
    res.json({ workouts });
  } catch (error) {
    next(error);
  }
}

export async function getWorkoutById(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = getAuthenticatedUserId(req);
    const workout = await getWorkout(userId, parseId(req.params.id));
    res.json({ workout });
  } catch (error) {
    next(error);
  }
}

export async function createWorkout(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = getAuthenticatedUserId(req);
    const workout = await createWorkoutService(userId, req.body);
    res.status(201).json({ workout });
  } catch (error) {
    next(error);
  }
}

export async function updateWorkout(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = getAuthenticatedUserId(req);
    const workout = await updateWorkoutService(userId, parseId(req.params.id), req.body);
    res.json({ workout });
  } catch (error) {
    next(error);
  }
}

export async function deleteWorkout(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = getAuthenticatedUserId(req);
    await deleteWorkoutService(userId, parseId(req.params.id));
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
