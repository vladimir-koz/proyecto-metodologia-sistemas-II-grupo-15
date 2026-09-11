import { WorkoutTemplateExerciseRequestBody } from '../types/workoutTemplateExercise.types';
import { AppError } from '../utils/AppError';
import {
  createWorkoutTemplateExercise,
  deleteWorkoutTemplateExercise,
  findWorkoutTemplateExerciseById,
  findWorkoutTemplateExercisesByWorkoutTemplateId,
  updateWorkoutTemplateExercise
} from '../repositories/workoutTemplateExercise.repository';
import { findExerciseById } from '../repositories/exercise.repository';
import { findWorkoutTemplateById } from '../repositories/workoutTemplate.repository';

function validarDatosWorkoutTemplateExercise(data: WorkoutTemplateExerciseRequestBody, partial = false): void {
  if (!partial) {
    if (!data.workoutTemplateId) {
      throw new AppError('El workoutTemplateId es obligatorio', 400);
    }

    if (!data.exerciseId) {
      throw new AppError('El exerciseId es obligatorio', 400);
    }

    if (data.orden === undefined) {
      throw new AppError('El orden es obligatorio', 400);
    }

    if (data.repeticiones === undefined) {
      throw new AppError('Las repeticiones son obligatorias', 400);
    }
  }

  if (data.orden !== undefined && data.orden < 1) {
    throw new AppError('El orden debe ser un numero positivo', 400);
  }

  if (data.repeticiones !== undefined && data.repeticiones < 1) {
    throw new AppError('Las repeticiones deben ser un numero positivo', 400);
  }

  if (data.peso !== undefined && data.peso !== null && data.peso < 0) {
    throw new AppError('El peso debe ser un numero positivo', 400);
  }

  if (data.rirObjetivo !== undefined && data.rirObjetivo !== null && (!Number.isInteger(data.rirObjetivo) || data.rirObjetivo < 0 || data.rirObjetivo > 10)) {
    throw new AppError('El rirObjetivo debe ser un entero entre 0 y 10', 400);
  }

  if (data.rpeObjetivo !== undefined && data.rpeObjetivo !== null && (data.rpeObjetivo < 1 || data.rpeObjetivo > 10)) {
    throw new AppError('El rpeObjetivo debe estar entre 1 y 10', 400);
  }
}

async function ensureWorkoutTemplateVisible(workoutTemplateId: number, userId: number) {
  const workoutTemplate = await findWorkoutTemplateById(workoutTemplateId, userId);

  if (!workoutTemplate) {
    throw new AppError('Plantilla de entrenamiento no encontrada', 404);
  }

  return workoutTemplate;
}

async function ensureWorkoutTemplateOwned(workoutTemplateId: number, userId: number) {
  const workoutTemplate = await ensureWorkoutTemplateVisible(workoutTemplateId, userId);

  if (workoutTemplate.userId !== userId) {
    throw new AppError('No se puede modificar una plantilla global', 403);
  }

  return workoutTemplate;
}

async function ensureExerciseVisible(exerciseId: number, userId: number) {
  const exercise = await findExerciseById(exerciseId, userId);

  if (!exercise) {
    throw new AppError('Ejercicio no encontrado', 404);
  }

  return exercise;
}

async function ensureWorkoutTemplateExerciseVisible(id: number, userId: number) {
  const workoutTemplateExercise = await findWorkoutTemplateExerciseById(id);

  if (!workoutTemplateExercise) {
    throw new AppError('Ejercicio de plantilla no encontrado', 404);
  }

  await ensureWorkoutTemplateVisible(workoutTemplateExercise.workoutTemplateId, userId);

  return workoutTemplateExercise;
}

async function ensureWorkoutTemplateExerciseOwned(id: number, userId: number) {
  const workoutTemplateExercise = await findWorkoutTemplateExerciseById(id);

  if (!workoutTemplateExercise) {
    throw new AppError('Ejercicio de plantilla no encontrado', 404);
  }

  await ensureWorkoutTemplateOwned(workoutTemplateExercise.workoutTemplateId, userId);

  return workoutTemplateExercise;
}

export async function listWorkoutTemplateExercises(workoutTemplateId: number, userId: number) {
  await ensureWorkoutTemplateVisible(workoutTemplateId, userId);

  const workoutTemplateExercises = await findWorkoutTemplateExercisesByWorkoutTemplateId(workoutTemplateId);

  return { workoutTemplateExercises };
}

export async function getWorkoutTemplateExerciseById(id: number, userId: number) {
  const workoutTemplateExercise = await ensureWorkoutTemplateExerciseVisible(id, userId);

  return { workoutTemplateExercise };
}

export async function createWorkoutTemplateExerciseService(data: WorkoutTemplateExerciseRequestBody, userId: number) {
  validarDatosWorkoutTemplateExercise(data);
  await ensureWorkoutTemplateOwned(data.workoutTemplateId, userId);
  await ensureExerciseVisible(data.exerciseId, userId);

  const workoutTemplateExercise = await createWorkoutTemplateExercise({
    workoutTemplateId: data.workoutTemplateId,
    exerciseId: data.exerciseId,
    orden: data.orden,
    repeticiones: data.repeticiones,
    peso: data.peso ?? null,
    rirObjetivo: data.rirObjetivo ?? null,
    rpeObjetivo: data.rpeObjetivo ?? null
  });

  return {
    message: 'Ejercicio de plantilla creado exitosamente',
    workoutTemplateExercise
  };
}

export async function updateWorkoutTemplateExerciseService(id: number, data: WorkoutTemplateExerciseRequestBody, userId: number) {
  validarDatosWorkoutTemplateExercise(data, true);
  await ensureWorkoutTemplateExerciseOwned(id, userId);

  if (data.workoutTemplateId !== undefined) {
    await ensureWorkoutTemplateOwned(data.workoutTemplateId, userId);
  }

  if (data.exerciseId !== undefined) {
    await ensureExerciseVisible(data.exerciseId, userId);
  }

  const workoutTemplateExercise = await updateWorkoutTemplateExercise(id, {
    workoutTemplateId: data.workoutTemplateId,
    exerciseId: data.exerciseId,
    orden: data.orden,
    repeticiones: data.repeticiones,
    peso: data.peso,
    rirObjetivo: data.rirObjetivo,
    rpeObjetivo: data.rpeObjetivo
  });

  if (!workoutTemplateExercise) {
    throw new AppError('Ejercicio de plantilla no encontrado', 404);
  }

  return {
    message: 'Ejercicio de plantilla actualizado exitosamente',
    workoutTemplateExercise
  };
}

export async function deleteWorkoutTemplateExerciseService(id: number, userId: number) {
  await ensureWorkoutTemplateExerciseOwned(id, userId);
  await deleteWorkoutTemplateExercise(id);

  return { message: 'Ejercicio de plantilla eliminado exitosamente' };
}
