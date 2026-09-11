import { findTrainingProgramById } from '../repositories/trainingProgram.repository';
import {
  createProgramWeek,
  deleteProgramWeek,
  findProgramWeekById,
  findProgramWeeksByTrainingProgramId,
  findProgramWeekWithProgram,
  updateProgramWeek
} from '../repositories/programWeek.repository';
import { ProgramWeekRequestBody } from '../types/programWeek.types';
import { AppError } from '../utils/AppError';

function validateProgramWeek(data: ProgramWeekRequestBody, partial = false): void {
  if (!partial) {
    if (!data.trainingProgramId) {
      throw new AppError('El trainingProgramId es obligatorio', 400);
    }

    if (data.numeroSemana === undefined) {
      throw new AppError('El numeroSemana es obligatorio', 400);
    }
  }

  if (data.numeroSemana !== undefined && data.numeroSemana < 1) {
    throw new AppError('El numeroSemana debe ser un numero positivo', 400);
  }
}

async function ensureTrainingProgramVisible(trainingProgramId: number, userId: number) {
  const trainingProgram = await findTrainingProgramById(trainingProgramId, userId);

  if (!trainingProgram) {
    throw new AppError('Programa de entrenamiento no encontrado', 404);
  }

  return trainingProgram;
}

async function ensureTrainingProgramOwned(trainingProgramId: number, userId: number) {
  const trainingProgram = await ensureTrainingProgramVisible(trainingProgramId, userId);

  if (trainingProgram.userId !== userId) {
    throw new AppError('No se puede modificar un programa global', 403);
  }

  return trainingProgram;
}

async function ensureProgramWeekVisible(id: number, userId: number) {
  const programWeek = await findProgramWeekWithProgram(id);

  if (!programWeek) {
    throw new AppError('Semana de programa no encontrada', 404);
  }

  await ensureTrainingProgramVisible(programWeek.trainingProgramId, userId);

  return programWeek;
}

async function ensureProgramWeekOwned(id: number, userId: number) {
  const programWeek = await findProgramWeekWithProgram(id);

  if (!programWeek) {
    throw new AppError('Semana de programa no encontrada', 404);
  }

  await ensureTrainingProgramOwned(programWeek.trainingProgramId, userId);

  return programWeek;
}

export async function listProgramWeeks(trainingProgramId: number, userId: number) {
  await ensureTrainingProgramVisible(trainingProgramId, userId);
  const programWeeks = await findProgramWeeksByTrainingProgramId(trainingProgramId);
  return { programWeeks };
}

export async function getProgramWeekById(id: number, userId: number) {
  await ensureProgramWeekVisible(id, userId);
  const programWeek = await findProgramWeekById(id);
  return { programWeek };
}

export async function createProgramWeekService(data: ProgramWeekRequestBody, userId: number) {
  validateProgramWeek(data);
  await ensureTrainingProgramOwned(data.trainingProgramId, userId);

  const programWeek = await createProgramWeek({
    trainingProgramId: data.trainingProgramId,
    numeroSemana: data.numeroSemana,
    nombre: data.nombre?.trim() || null,
    objetivo: data.objetivo?.trim() || null,
    notas: data.notas?.trim() || null,
    esDescarga: data.esDescarga ?? false
  });

  return {
    message: 'Semana de programa creada exitosamente',
    programWeek
  };
}

export async function updateProgramWeekService(id: number, data: ProgramWeekRequestBody, userId: number) {
  validateProgramWeek(data, true);
  await ensureProgramWeekOwned(id, userId);

  if (data.trainingProgramId !== undefined) {
    await ensureTrainingProgramOwned(data.trainingProgramId, userId);
  }

  const programWeek = await updateProgramWeek(id, {
    trainingProgramId: data.trainingProgramId,
    numeroSemana: data.numeroSemana,
    nombre: data.nombre !== undefined ? data.nombre.trim() || null : undefined,
    objetivo: data.objetivo !== undefined ? data.objetivo.trim() || null : undefined,
    notas: data.notas !== undefined ? data.notas.trim() || null : undefined,
    esDescarga: data.esDescarga
  });

  if (!programWeek) {
    throw new AppError('Semana de programa no encontrada', 404);
  }

  return {
    message: 'Semana de programa actualizada exitosamente',
    programWeek
  };
}

export async function deleteProgramWeekService(id: number, userId: number) {
  await ensureProgramWeekOwned(id, userId);
  await deleteProgramWeek(id);
  return { message: 'Semana de programa eliminada exitosamente' };
}
