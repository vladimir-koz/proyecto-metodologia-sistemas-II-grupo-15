import { Workout } from '../models';
import { countExercisesByIdsForUser } from '../repositories/exercise.repository';
import { findScheduledWorkoutWithProgram } from '../repositories/scheduledWorkout.repository';
import {
  createWorkoutForUser,
  deleteWorkout,
  findWorkoutByIdForUser,
  findWorkoutsByUser,
  updateWorkoutForUser
} from '../repositories/workout.repository';
import { findWorkoutTemplateById } from '../repositories/workoutTemplate.repository';
import {
  CreateWorkoutBody,
  Modalidad,
  UpdateWorkoutBody,
  WorkoutListQuery,
  WorkoutSetInput
} from '../types/workout.types';
import { AppError } from '../utils/AppError';
import { resolverModalidad } from '../utils/modalidad';
import { calcularRitmoSegundosPorKm, calcularVelocidadKmH } from '../utils/runningMath';
import { getUniquePositiveIntegerIds } from '../utils/validateIds';

async function validarEjerciciosDeSeries(
  userId: number,
  series: WorkoutSetInput[] | undefined
): Promise<void> {
  if (series === undefined) {
    return;
  }

  if (!Array.isArray(series)) {
    throw new AppError('series debe ser un arreglo', 400);
  }

  const exerciseIds = getUniquePositiveIntegerIds(
    series.map((serie) => serie.exerciseId),
    'series.exerciseId'
  );

  if (exerciseIds.length === 0) {
    return;
  }

  const existingCount = await countExercisesByIdsForUser(userId, exerciseIds);

  if (existingCount !== exerciseIds.length) {
    throw new AppError('Una o mas series usan ejercicios inexistentes o de otro usuario', 400);
  }

  for (const serie of series) {
    if (serie.rir !== undefined && serie.rir !== null && (!Number.isInteger(serie.rir) || serie.rir < 0 || serie.rir > 10)) {
      throw new AppError('series.rir debe ser un entero entre 0 y 10', 400);
    }

    if (serie.rpe !== undefined && serie.rpe !== null && (serie.rpe < 1 || serie.rpe > 10)) {
      throw new AppError('series.rpe debe estar entre 1 y 10', 400);
    }
  }
}

function validarIdOpcional(id: number | null | undefined, fieldName: string): void {
  if (id === undefined || id === null) {
    return;
  }

  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(`${fieldName} debe ser un numero entero positivo`, 400);
  }
}

async function validarPlantilla(workoutTemplateId: number | null | undefined, userId: number): Promise<void> {
  validarIdOpcional(workoutTemplateId, 'workoutTemplateId');

  if (workoutTemplateId === undefined || workoutTemplateId === null) {
    return;
  }

  const workoutTemplate = await findWorkoutTemplateById(workoutTemplateId, userId);

  if (!workoutTemplate) {
    throw new AppError('Plantilla de entrenamiento no encontrada', 404);
  }
}

async function normalizarPlanificacionWorkout<T extends CreateWorkoutBody | UpdateWorkoutBody>(
  userId: number,
  data: T
): Promise<T> {
  validarIdOpcional(data.scheduledWorkoutId, 'scheduledWorkoutId');
  validarIdOpcional(data.workoutTemplateId, 'workoutTemplateId');

  if (data.scheduledWorkoutId !== undefined && data.scheduledWorkoutId !== null) {
    const scheduledWorkout = await findScheduledWorkoutWithProgram(data.scheduledWorkoutId);

    if (!scheduledWorkout) {
      throw new AppError('Entrenamiento programado no encontrado', 404);
    }

    const programWeek = scheduledWorkout.get('programWeek') as { trainingProgram?: { userId: number | null } } | undefined;
    const trainingProgram = programWeek?.trainingProgram;

    if (!trainingProgram || (trainingProgram.userId !== null && trainingProgram.userId !== userId)) {
      throw new AppError('Entrenamiento programado no encontrado', 404);
    }

    if (data.workoutTemplateId !== undefined && data.workoutTemplateId !== null && data.workoutTemplateId !== scheduledWorkout.workoutTemplateId) {
      throw new AppError('El workoutTemplateId debe coincidir con el entrenamiento programado', 400);
    }

    return {
      ...data,
      workoutTemplateId: scheduledWorkout.workoutTemplateId
    };
  }

  await validarPlantilla(data.workoutTemplateId, userId);
  return data;
}

function estaPresente(value: unknown): boolean {
  return value !== undefined && value !== null;
}

/**
 * Reglas de cada modalidad sobre el estado final del entrenamiento
 * (datos existentes mezclados con los recibidos).
 */
function validarReglasDeModalidad(
  modalidad: Modalidad,
  final: {
    distanciaKm: number | null | undefined;
    duracionSegundos: number | null | undefined;
    workoutTemplateId: number | null | undefined;
    scheduledWorkoutId: number | null | undefined;
  },
  series: WorkoutSetInput[] | undefined
): void {
  if (modalidad === 'running') {
    if (!estaPresente(final.distanciaKm)) {
      throw new AppError('distanciaKm es obligatoria para running', 400);
    }

    if (!estaPresente(final.duracionSegundos)) {
      throw new AppError('duracionSegundos es obligatoria para running', 400);
    }

    if (!Number.isFinite(final.distanciaKm) || (final.distanciaKm as number) <= 0) {
      throw new AppError('distanciaKm debe ser un numero positivo', 400);
    }

    if (!Number.isInteger(final.duracionSegundos) || (final.duracionSegundos as number) <= 0) {
      throw new AppError('duracionSegundos debe ser un entero positivo', 400);
    }

    if (Array.isArray(series) && series.length > 0) {
      throw new AppError('Un entrenamiento de running no admite series', 400);
    }

    if (estaPresente(final.workoutTemplateId) || estaPresente(final.scheduledWorkoutId)) {
      throw new AppError('Un entrenamiento de running no admite plantilla ni entrenamiento programado', 400);
    }

    return;
  }

  if (estaPresente(final.distanciaKm) || estaPresente(final.duracionSegundos)) {
    throw new AppError('distanciaKm y duracionSegundos solo se admiten en running', 400);
  }
}

/** Agrega ritmo y velocidad (calculados al consultar, nunca persistidos) a los entrenamientos de running. */
export function serializeWorkout(workout: Workout | null) {
  if (!workout) {
    return null;
  }

  const json = workout.toJSON() as unknown as Record<string, unknown>;

  if (workout.modalidad !== 'running') {
    return json;
  }

  return {
    ...json,
    ritmoSegundosPorKm: calcularRitmoSegundosPorKm(workout.distanciaKm, workout.duracionSegundos),
    velocidadKmH: calcularVelocidadKmH(workout.distanciaKm, workout.duracionSegundos)
  };
}

export function getWorkouts(userId: number, query: WorkoutListQuery = {}) {
  return findWorkoutsByUser(userId, resolverModalidad(query.modalidad));
}

export async function getWorkout(userId: number, id: number) {
  const workout = await findWorkoutByIdForUser(id, userId);

  if (!workout) {
    throw new AppError('Entrenamiento no encontrado', 404);
  }

  return workout;
}

export async function createWorkoutService(userId: number, data: CreateWorkoutBody) {
  if (!data.nombre) {
    throw new AppError('El nombre del entrenamiento es obligatorio', 400);
  }

  // Sin modalidad, el alta es de fuerza.
  const modalidad = resolverModalidad(data.modalidad);

  validarReglasDeModalidad(
    modalidad,
    {
      distanciaKm: data.distanciaKm,
      duracionSegundos: data.duracionSegundos,
      workoutTemplateId: data.workoutTemplateId,
      scheduledWorkoutId: data.scheduledWorkoutId
    },
    data.series
  );

  if (modalidad === 'running') {
    return createWorkoutForUser(userId, { ...data, modalidad });
  }

  await validarEjerciciosDeSeries(userId, data.series);
  const workoutData = await normalizarPlanificacionWorkout(userId, data);

  return createWorkoutForUser(userId, { ...workoutData, modalidad });
}

export async function updateWorkoutService(userId: number, id: number, data: UpdateWorkoutBody) {
  const workout = await getWorkout(userId, id);

  if (data.modalidad !== undefined && data.modalidad !== workout.modalidad) {
    throw new AppError('La modalidad de un entrenamiento no se puede cambiar', 400);
  }

  // La modalidad se conserva al editar; los campos omitidos mantienen su valor.
  const modalidad = workout.modalidad;

  validarReglasDeModalidad(
    modalidad,
    {
      distanciaKm: data.distanciaKm !== undefined ? data.distanciaKm : workout.distanciaKm,
      duracionSegundos: data.duracionSegundos !== undefined ? data.duracionSegundos : workout.duracionSegundos,
      workoutTemplateId: data.workoutTemplateId !== undefined ? data.workoutTemplateId : workout.workoutTemplateId,
      scheduledWorkoutId: data.scheduledWorkoutId !== undefined ? data.scheduledWorkoutId : workout.scheduledWorkoutId
    },
    data.series
  );

  if (modalidad === 'running') {
    return updateWorkoutForUser(workout, userId, { ...data, modalidad });
  }

  await validarEjerciciosDeSeries(userId, data.series);
  const workoutData = await normalizarPlanificacionWorkout(userId, data);
  return updateWorkoutForUser(workout, userId, workoutData);
}

export async function deleteWorkoutService(userId: number, id: number) {
  const workout = await getWorkout(userId, id);
  await deleteWorkout(workout);
}