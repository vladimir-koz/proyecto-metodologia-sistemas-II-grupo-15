import { TrainingProgramRequestBody } from '../types/trainingProgram.types';
import { AppError } from '../utils/AppError';
import {
  createTrainingProgram as createTrainingProgramRepo,
  deleteTrainingProgram as deleteTrainingProgramRepo,
  findTrainingProgramById,
  findTrainingPrograms,
  updateTrainingProgram as updateTrainingProgramRepo
} from '../repositories/trainingProgram.repository';

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

function validateTrainingProgram(data: TrainingProgramRequestBody, partial = false): void {
  if (!partial && !data.nombre) {
    throw new AppError('El nombre del programa es obligatorio', 400);
  }

  if (data.nombre !== undefined && data.nombre.trim().length < 2) {
    throw new AppError('El nombre del programa debe tener al menos 2 caracteres', 400);
  }
}

export async function listTrainingPrograms(userId: number) {
  const trainingPrograms = await findTrainingPrograms(userId);
  return { trainingPrograms };
}

export async function getTrainingProgramById(id: number, userId: number) {
  const trainingProgram = await findTrainingProgramById(id, userId);

  if (!trainingProgram) {
    throw new AppError('Programa de entrenamiento no encontrado', 404);
  }

  return { trainingProgram };
}

export async function createTrainingProgram(data: TrainingProgramRequestBody, userId: number) {
  validateTrainingProgram(data);

  const trainingProgram = await createTrainingProgramRepo({
    nombre: data.nombre.trim(),
    descripcion: data.descripcion?.trim() || null,
    objetivo: data.objetivo?.trim() || null,
    userId,
    fechaInicio: parseOptionalDate(data.fechaInicio, 'fechaInicio') ?? null,
    fechaFin: parseOptionalDate(data.fechaFin, 'fechaFin') ?? null,
    estado: data.estado?.trim() || 'activo'
  });

  return {
    message: 'Programa de entrenamiento creado exitosamente',
    trainingProgram
  };
}

export async function updateTrainingProgram(id: number, data: TrainingProgramRequestBody, userId: number) {
  validateTrainingProgram(data, true);

  const trainingProgram = await findTrainingProgramById(id, userId);

  if (!trainingProgram) {
    throw new AppError('Programa de entrenamiento no encontrado', 404);
  }

  if (trainingProgram.userId !== userId) {
    throw new AppError('No se puede modificar un programa global', 403);
  }

  const updatedTrainingProgram = await updateTrainingProgramRepo(id, {
    nombre: data.nombre?.trim(),
    descripcion: data.descripcion !== undefined ? data.descripcion.trim() || null : undefined,
    objetivo: data.objetivo !== undefined ? data.objetivo.trim() || null : undefined,
    fechaInicio: parseOptionalDate(data.fechaInicio, 'fechaInicio'),
    fechaFin: parseOptionalDate(data.fechaFin, 'fechaFin'),
    estado: data.estado !== undefined ? data.estado.trim() || null : undefined
  }, userId);

  return {
    message: 'Programa de entrenamiento actualizado exitosamente',
    trainingProgram: updatedTrainingProgram
  };
}

export async function deleteTrainingProgram(id: number, userId: number) {
  const trainingProgram = await findTrainingProgramById(id, userId);

  if (!trainingProgram) {
    throw new AppError('Programa de entrenamiento no encontrado', 404);
  }

  if (trainingProgram.userId !== userId) {
    throw new AppError('No se puede eliminar un programa global', 403);
  }

  await deleteTrainingProgramRepo(id, userId);

  return { message: 'Programa de entrenamiento eliminado exitosamente' };
}
