import { findProgramWeekWithProgram } from '../repositories/programWeek.repository';
import {
  createScheduledWorkout,
  deleteScheduledWorkout,
  findScheduledWorkoutById,
  findScheduledWorkoutsByProgramWeekId,
  findScheduledWorkoutWithProgram,
  updateScheduledWorkout
} from '../repositories/scheduledWorkout.repository';
import { findWorkoutTemplateById } from '../repositories/workoutTemplate.repository';
import { ScheduledWorkoutRequestBody } from '../types/scheduledWorkout.types';
import { AppError } from '../utils/AppError';

function parseOptionalDate(value: string | undefined, fieldName: string): Date | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!value.trim()) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new AppError(`${fieldName} debe ser una fecha valida`, 400);
  }

  return date;
}

function validateScheduledWorkout(data: ScheduledWorkoutRequestBody, partial = false): void {
  if (!partial) {
    if (!data.programWeekId) {
      throw new AppError('El programWeekId es obligatorio', 400);
    }

    if (!data.workoutTemplateId) {
      throw new AppError('El workoutTemplateId es obligatorio', 400);
    }

    if (!data.nombre) {
      throw new AppError('El nombre del entrenamiento programado es obligatorio', 400);
    }

    if (data.orden === undefined) {
      throw new AppError('El orden es obligatorio', 400);
    }
  }

  if (data.nombre !== undefined && data.nombre.trim().length < 2) {
    throw new AppError('El nombre del entrenamiento programado debe tener al menos 2 caracteres', 400);
  }

  if (data.orden !== undefined && data.orden < 1) {
    throw new AppError('El orden debe ser un numero positivo', 400);
  }

  if (data.diaSemana !== undefined && (data.diaSemana < 1 || data.diaSemana > 7)) {
    throw new AppError('El diaSemana debe estar entre 1 y 7', 400);
  }
}

async function ensureProgramWeekVisible(programWeekId: number, userId: number) {
  const programWeek = await findProgramWeekWithProgram(programWeekId);

  if (!programWeek) {
    throw new AppError('Semana de programa no encontrada', 404);
  }

  const trainingProgram = programWeek.get('trainingProgram') as { userId: number | null } | undefined;

  if (!trainingProgram || (trainingProgram.userId !== null && trainingProgram.userId !== userId)) {
    throw new AppError('Semana de programa no encontrada', 404);
  }

  return programWeek;
}

async function ensureProgramWeekOwned(programWeekId: number, userId: number) {
  const programWeek = await ensureProgramWeekVisible(programWeekId, userId);
  const trainingProgram = programWeek.get('trainingProgram') as { userId: number | null } | undefined;

  if (!trainingProgram || trainingProgram.userId !== userId) {
    throw new AppError('No se puede modificar un programa global', 403);
  }

  return programWeek;
}

async function ensureWorkoutTemplateVisible(workoutTemplateId: number, userId: number) {
  const workoutTemplate = await findWorkoutTemplateById(workoutTemplateId, userId);

  if (!workoutTemplate) {
    throw new AppError('Plantilla de entrenamiento no encontrada', 404);
  }

  return workoutTemplate;
}

async function ensureScheduledWorkoutVisible(id: number, userId: number) {
  const scheduledWorkout = await findScheduledWorkoutWithProgram(id);

  if (!scheduledWorkout) {
    throw new AppError('Entrenamiento programado no encontrado', 404);
  }

  await ensureProgramWeekVisible(scheduledWorkout.programWeekId, userId);

  return scheduledWorkout;
}

async function ensureScheduledWorkoutOwned(id: number, userId: number) {
  const scheduledWorkout = await findScheduledWorkoutWithProgram(id);

  if (!scheduledWorkout) {
    throw new AppError('Entrenamiento programado no encontrado', 404);
  }

  await ensureProgramWeekOwned(scheduledWorkout.programWeekId, userId);

  return scheduledWorkout;
}

export async function listScheduledWorkouts(programWeekId: number, userId: number) {
  await ensureProgramWeekVisible(programWeekId, userId);
  const scheduledWorkouts = await findScheduledWorkoutsByProgramWeekId(programWeekId);
  return { scheduledWorkouts };
}

export async function getScheduledWorkoutById(id: number, userId: number) {
  await ensureScheduledWorkoutVisible(id, userId);
  const scheduledWorkout = await findScheduledWorkoutById(id);
  return { scheduledWorkout };
}

export async function createScheduledWorkoutService(data: ScheduledWorkoutRequestBody, userId: number) {
  validateScheduledWorkout(data);
  await ensureProgramWeekOwned(data.programWeekId, userId);
  await ensureWorkoutTemplateVisible(data.workoutTemplateId, userId);

  const scheduledWorkout = await createScheduledWorkout({
    programWeekId: data.programWeekId,
    workoutTemplateId: data.workoutTemplateId,
    nombre: data.nombre.trim(),
    diaSemana: data.diaSemana ?? null,
    fechaProgramada: parseOptionalDate(data.fechaProgramada, 'fechaProgramada') ?? null,
    orden: data.orden,
    notas: data.notas?.trim() || null
  });

  return {
    message: 'Entrenamiento programado creado exitosamente',
    scheduledWorkout
  };
}

export async function updateScheduledWorkoutService(id: number, data: ScheduledWorkoutRequestBody, userId: number) {
  validateScheduledWorkout(data, true);
  await ensureScheduledWorkoutOwned(id, userId);

  if (data.programWeekId !== undefined) {
    await ensureProgramWeekOwned(data.programWeekId, userId);
  }

  if (data.workoutTemplateId !== undefined) {
    await ensureWorkoutTemplateVisible(data.workoutTemplateId, userId);
  }

  const scheduledWorkout = await updateScheduledWorkout(id, {
    programWeekId: data.programWeekId,
    workoutTemplateId: data.workoutTemplateId,
    nombre: data.nombre?.trim(),
    diaSemana: data.diaSemana !== undefined ? data.diaSemana : undefined,
    fechaProgramada: parseOptionalDate(data.fechaProgramada, 'fechaProgramada'),
    orden: data.orden,
    notas: data.notas !== undefined ? data.notas.trim() || null : undefined
  });

  if (!scheduledWorkout) {
    throw new AppError('Entrenamiento programado no encontrado', 404);
  }

  return {
    message: 'Entrenamiento programado actualizado exitosamente',
    scheduledWorkout
  };
}

export async function deleteScheduledWorkoutService(id: number, userId: number) {
  await ensureScheduledWorkoutOwned(id, userId);
  await deleteScheduledWorkout(id);
  return { message: 'Entrenamiento programado eliminado exitosamente' };
}
