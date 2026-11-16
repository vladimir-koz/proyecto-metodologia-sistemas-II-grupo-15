import { NextFunction, Request, Response } from 'express';
import {
  createWorkoutService,
  deleteWorkoutService,
  getWorkout,
  getWorkouts,
  serializeWorkout,
  updateWorkoutService
} from '../services/workout.service';
import { getAuthenticatedUserId } from '../utils/getAuthenticatedUserId';
import { parseId } from '../utils/parseId';

export async function listWorkouts(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = getAuthenticatedUserId(req);
    const workouts = await getWorkouts(userId, req.query);
    res.json({ workouts: workouts.map((workout) => serializeWorkout(workout)) });
  } catch (error) {
    next(error);
  }
}

export async function getWorkoutById(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = getAuthenticatedUserId(req);
    const workout = await getWorkout(userId, parseId(req.params.id));
    res.json({ workout: serializeWorkout(workout) });
  } catch (error) {
    next(error);
  }
}

export async function createWorkout(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = getAuthenticatedUserId(req);
    const workout = await createWorkoutService(userId, req.body);
    res.status(201).json({ workout: serializeWorkout(workout) });
  } catch (error) {
    next(error);
  }
}

export async function updateWorkout(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = getAuthenticatedUserId(req);
    const workout = await updateWorkoutService(userId, parseId(req.params.id), req.body);
    res.json({ workout: serializeWorkout(workout) });
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