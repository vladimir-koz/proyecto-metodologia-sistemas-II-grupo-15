import { MuscleGroupRequestBody } from '../types/muscleGroup.types';
import { AppError } from '../utils/AppError';
import {
  createMuscleGroup as createMuscleGroupRepo,
  deleteMuscleGroup as deleteMuscleGroupRepo,
  findMuscleGroupById,
  findMuscleGroups,
  updateMuscleGroup as updateMuscleGroupRepo
} from '../repositories/muscleGroup.repository';

function validateMuscleGroupData(data: MuscleGroupRequestBody, partial = false): void {
  if (!partial && !data.nombre) {
    throw new AppError('El nombre del grupo muscular es obligatorio', 400);
  }

  if (data.nombre !== undefined && data.nombre.trim().length < 2) {
    throw new AppError('El nombre del grupo muscular debe tener al menos 2 caracteres', 400);
  }
}

export async function listMuscleGroups(userId: number) {
  const muscleGroups = await findMuscleGroups(userId);

  return { muscleGroups };
}

export async function getMuscleGroupById(id: number, userId: number) {
  const muscleGroup = await findMuscleGroupById(id, userId);

  if (!muscleGroup) {
    throw new AppError('Grupo muscular no encontrado', 404);
  }

  return { muscleGroup };
}

export async function createMuscleGroup(data: MuscleGroupRequestBody, userId: number) {
  validateMuscleGroupData(data);

  const muscleGroup = await createMuscleGroupRepo({
    nombre: data.nombre.trim(),
    userId
  });

  return {
    message: 'Grupo muscular creado exitosamente',
    muscleGroup
  };
}

export async function updateMuscleGroup(id: number, data: MuscleGroupRequestBody, userId: number) {
  validateMuscleGroupData(data, true);

  const muscleGroup = await findMuscleGroupById(id, userId);

  if (!muscleGroup) {
    throw new AppError('Grupo muscular no encontrado', 404);
  }

  if (muscleGroup.userId !== userId) {
    throw new AppError('No se puede modificar un grupo muscular global', 403);
  }

  const updatedMuscleGroup = await updateMuscleGroupRepo(id, {
    nombre: data.nombre?.trim()
  }, userId);

  return {
    message: 'Grupo muscular actualizado exitosamente',
    muscleGroup: updatedMuscleGroup
  };
}

export async function deleteMuscleGroup(id: number, userId: number) {
  const muscleGroup = await findMuscleGroupById(id, userId);

  if (!muscleGroup) {
    throw new AppError('Grupo muscular no encontrado', 404);
  }

  if (muscleGroup.userId !== userId) {
    throw new AppError('No se puede eliminar un grupo muscular global', 403);
  }

  await deleteMuscleGroupRepo(id, userId);

  return { message: 'Grupo muscular eliminado exitosamente' };
}
