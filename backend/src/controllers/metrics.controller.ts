import { NextFunction, Request, Response } from 'express';
import {
  getActivityHeatmap,
  getExerciseProgress,
  getMetricsSummary
} from '../services/metrics.service';
import { getAuthenticatedUserId } from '../utils/getAuthenticatedUserId';

export async function summary(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await getMetricsSummary(getAuthenticatedUserId(req), req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function activityHeatmap(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await getActivityHeatmap(getAuthenticatedUserId(req), req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function exerciseProgress(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const exerciseId = Number(req.query.exerciseId);
    const result = await getExerciseProgress(getAuthenticatedUserId(req), exerciseId, req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
}
