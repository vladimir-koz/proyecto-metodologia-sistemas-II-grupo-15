import { NextFunction, Request, Response } from 'express';
import {
  createProgramWeekService,
  deleteProgramWeekService,
  getProgramWeekById,
  listProgramWeeks,
  updateProgramWeekService
} from '../services/programWeek.service';
import { AppError } from '../utils/AppError';
import { getAuthenticatedUserId } from '../utils/getAuthenticatedUserId';
import { parseId } from '../utils/parseId';

function parseRequiredQueryId(value: unknown, fieldName: string): number {
  if (typeof value !== 'string') {
    throw new AppError(`El query param ${fieldName} es obligatorio`, 400);
  }

  return parseId(value);
}

export async function index(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const trainingProgramId = parseRequiredQueryId(req.query.trainingProgramId, 'trainingProgramId');
    const result = await listProgramWeeks(trainingProgramId, getAuthenticatedUserId(req));
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function show(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await getProgramWeekById(parseId(req.params.id), getAuthenticatedUserId(req));
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function store(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await createProgramWeekService(req.body, getAuthenticatedUserId(req));
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await updateProgramWeekService(parseId(req.params.id), req.body, getAuthenticatedUserId(req));
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function destroy(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await deleteProgramWeekService(parseId(req.params.id), getAuthenticatedUserId(req));
    res.json(result);
  } catch (error) {
    next(error);
  }
}
