import { WorkoutTemplateRequestBody } from '../types/workoutTemplate.types';
import { AppError } from '../utils/AppError';
import {
  createWorkoutTemplate as createWorkoutTemplateRepo,
  deleteWorkoutTemplate as deleteWorkoutTemplateRepo,
  findWorkoutTemplateById,
  findWorkoutTemplates,
  updateWorkoutTemplate as updateWorkoutTemplateRepo
} from '../repositories/workoutTemplate.repository';

function validarDatosWorkoutTemplate(data: WorkoutTemplateRequestBody, partial = false): void {
  if (!partial && !data.nombre) {
    throw new AppError('El nombre de la plantilla de entrenamiento es obligatorio', 400);
  }

  if (data.nombre !== undefined && data.nombre.trim().length < 2) {
    throw new AppError('El nombre de la plantilla de entrenamiento debe tener al menos 2 caracteres', 400);
  }
}

export async function listWorkoutTemplates(userId: number) {
  const workoutTemplates = await findWorkoutTemplates(userId);

  return { workoutTemplates };
}

export async function getWorkoutTemplateById(id: number, userId: number) {
  const workoutTemplate = await findWorkoutTemplateById(id, userId);

  if (!workoutTemplate) {
    throw new AppError('Plantilla de entrenamiento no encontrada', 404);
  }

  return { workoutTemplate };
}

export async function createWorkoutTemplate(data: WorkoutTemplateRequestBody, userId: number) {
  validarDatosWorkoutTemplate(data);

  const workoutTemplate = await createWorkoutTemplateRepo({
    nombre: data.nombre.trim(),
    descripcion: data.descripcion?.trim() || null,
    tipo: data.tipo?.trim() || null,
    userId,
    grupoMuscularEtiqueta: data.grupoMuscularEtiqueta?.trim() || null,
    dificultad: data.dificultad?.trim() || null,
    tiempoEstimado: data.tiempoEstimado ?? null
  });

  return {
    message: 'Plantilla de entrenamiento creada exitosamente',
    workoutTemplate
  };
}

export async function updateWorkoutTemplate(id: number, data: WorkoutTemplateRequestBody, userId: number) {
  validarDatosWorkoutTemplate(data, true);

  const workoutTemplate = await findWorkoutTemplateById(id, userId);

  if (!workoutTemplate) {
    throw new AppError('Plantilla de entrenamiento no encontrada', 404);
  }

  if (workoutTemplate.userId !== userId) {
    throw new AppError('No se puede modificar una plantilla global', 403);
  }

  const updatedWorkoutTemplate = await updateWorkoutTemplateRepo(id, {
    nombre: data.nombre?.trim(),
    descripcion: data.descripcion !== undefined ? data.descripcion.trim() || null : undefined,
    tipo: data.tipo !== undefined ? data.tipo.trim() || null : undefined,
    grupoMuscularEtiqueta: data.grupoMuscularEtiqueta !== undefined ? data.grupoMuscularEtiqueta.trim() || null : undefined,
    dificultad: data.dificultad !== undefined ? data.dificultad.trim() || null : undefined,
    tiempoEstimado: data.tiempoEstimado !== undefined ? data.tiempoEstimado : undefined
  }, userId);

  return {
    message: 'Plantilla de entrenamiento actualizada exitosamente',
    workoutTemplate: updatedWorkoutTemplate
  };
}

export async function deleteWorkoutTemplate(id: number, userId: number) {
  const workoutTemplate = await findWorkoutTemplateById(id, userId);

  if (!workoutTemplate) {
    throw new AppError('Plantilla de entrenamiento no encontrada', 404);
  }

  if (workoutTemplate.userId !== userId) {
    throw new AppError('No se puede eliminar una plantilla global', 403);
  }

  await deleteWorkoutTemplateRepo(id, userId);

  return { message: 'Plantilla de entrenamiento eliminada exitosamente' };
}
