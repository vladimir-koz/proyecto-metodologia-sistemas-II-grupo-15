import { ExerciseRequestBody } from '../types/exercise.types';
import { AppError } from '../utils/AppError';
import {
  createExercise as createExerciseRepo,
  deleteExercise as deleteExerciseRepo,
  findExerciseById,
  findExercises,
  findExercisesByMuscleGroup,
  updateExercise as updateExerciseRepo
} from '../repositories/exercise.repository';
import { replaceExerciseMuscleGroups } from '../repositories/exerciseMuscleGroup.repository';
import { findMuscleGroupById } from '../repositories/muscleGroup.repository';

const dificultadesValidas = ['principiante', 'intermedio', 'avanzado'];

function validarDatosExercise(data: ExerciseRequestBody, partial = false): void {
  if (!partial && !data.nombre) {
    throw new AppError('El nombre del ejercicio es obligatorio', 400);
  }

  if (data.nombre !== undefined && data.nombre.trim().length < 2) {
    throw new AppError('El nombre debe tener al menos 2 caracteres', 400);
  }

  if (data.dificultad && !dificultadesValidas.includes(data.dificultad)) {
    throw new AppError('La dificultad debe ser principiante, intermedio o avanzado', 400);
  }

  if (data.muscleGroupIds !== undefined && !Array.isArray(data.muscleGroupIds)) {
    throw new AppError('muscleGroupIds debe ser un arreglo', 400);
  }

  if (data.muscleGroupIds?.some((id) => !Number.isInteger(id) || id < 1)) {
    throw new AppError('muscleGroupIds debe contener IDs validos', 400);
  }
}

async function validateMuscleGroupsVisible(muscleGroupIds: number[] | undefined, userId: number): Promise<void> {
  if (muscleGroupIds === undefined) {
    return;
  }

  const uniqueMuscleGroupIds = Array.from(new Set(muscleGroupIds));

  for (const muscleGroupId of uniqueMuscleGroupIds) {
    const muscleGroup = await findMuscleGroupById(muscleGroupId, userId);

    if (!muscleGroup) {
      throw new AppError(`Grupo muscular ${muscleGroupId} no encontrado`, 400);
    }
  }
}

export async function listExercises(userId: number) {
  const exercises = await findExercises(userId);

  return { exercises };
}

export async function listExercisesByMuscleGroup(muscleGroupId: number, userId: number) {
  const muscleGroup = await findMuscleGroupById(muscleGroupId, userId);

  if (!muscleGroup) {
    throw new AppError('Grupo muscular no encontrado', 404);
  }

  const exercises = await findExercisesByMuscleGroup(userId, muscleGroupId);

  return { exercises };
}

export async function getExerciseById(id: number, userId: number) {
  const exercise = await findExerciseById(id, userId);

  if (!exercise) {
    throw new AppError('Ejercicio no encontrado', 404);
  }

  return { exercise };
}

export async function createExercise(data: ExerciseRequestBody, userId: number) {
  validarDatosExercise(data);
  await validateMuscleGroupsVisible(data.muscleGroupIds, userId);

  const exercise = await createExerciseRepo({
    nombre: data.nombre.trim(),
    descripcion: data.descripcion?.trim() || null,
    userId,
    dificultad: data.dificultad || null,
    imagen: data.imagen?.trim() || null
  });

  if (data.muscleGroupIds !== undefined) {
    await replaceExerciseMuscleGroups(exercise.id, data.muscleGroupIds);
  }

  const exerciseWithMuscleGroups = await findExerciseById(exercise.id, userId);

  return {
    message: 'Ejercicio creado exitosamente',
    exercise: exerciseWithMuscleGroups
  };
}

export async function updateExercise(id: number, data: ExerciseRequestBody, userId: number) {
  validarDatosExercise(data, true);
  await validateMuscleGroupsVisible(data.muscleGroupIds, userId);

  const exercise = await findExerciseById(id, userId);

  if (!exercise) {
    throw new AppError('Ejercicio no encontrado', 404);
  }

  if (exercise.userId !== userId) {
    throw new AppError('No se puede modificar un ejercicio global', 403);
  }

  const updatedExercise = await updateExerciseRepo(id, {
    nombre: data.nombre?.trim(),
    descripcion: data.descripcion !== undefined ? data.descripcion.trim() || null : undefined,
    dificultad: data.dificultad !== undefined ? data.dificultad : undefined,
    imagen: data.imagen !== undefined ? data.imagen.trim() || null : undefined
  }, userId);

  if (data.muscleGroupIds !== undefined) {
    await replaceExerciseMuscleGroups(id, data.muscleGroupIds);
  }

  const exerciseWithMuscleGroups = await findExerciseById(id, userId);

  return {
    message: 'Ejercicio actualizado exitosamente',
    exercise: exerciseWithMuscleGroups ?? updatedExercise
  };
}

export async function deleteExercise(id: number, userId: number) {
  const exercise = await findExerciseById(id, userId);

  if (!exercise) {
    throw new AppError('Ejercicio no encontrado', 404);
  }

  if (exercise.userId !== userId) {
    throw new AppError('No se puede eliminar un ejercicio global', 403);
  }

  await deleteExerciseRepo(id, userId);

  return { message: 'Ejercicio eliminado exitosamente' };
}
