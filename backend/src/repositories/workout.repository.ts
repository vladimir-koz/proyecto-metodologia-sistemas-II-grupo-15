import { Exercise, ScheduledWorkout, Workout, WorkoutSet, WorkoutTemplate, sequelize } from '../models';
import { CreateWorkoutBody, Modalidad, UpdateWorkoutBody } from '../types/workout.types';

const workoutInclude = [
  {
    model: WorkoutSet,
    as: 'series',
    include: [{ model: Exercise, as: 'exercise' }]
  },
  {
    model: WorkoutTemplate,
    as: 'workoutTemplate'
  },
  {
    model: ScheduledWorkout,
    as: 'scheduledWorkout',
    include: [{ model: WorkoutTemplate, as: 'workoutTemplate' }]
  }
];

/**
 * Solo estos campos se toman del body. Propiedad (userId), identificadores y
 * fechas internas nunca se aceptan como campos editables.
 */
const EDITABLE_FIELDS = [
  'nombre',
  'modalidad',
  'distanciaKm',
  'duracionSegundos',
  'grupoMuscularEtiqueta',
  'workoutTemplateId',
  'scheduledWorkoutId'
] as const;

function pickEditableFields(data: CreateWorkoutBody | UpdateWorkoutBody): Record<string, unknown> {
  const picked: Record<string, unknown> = {};

  for (const field of EDITABLE_FIELDS) {
    if (data[field] !== undefined) {
      picked[field] = data[field];
    }
  }

  return picked;
}

export function findWorkoutsByUser(userId: number, modalidad: Modalidad): Promise<Workout[]> {
  return Workout.findAll({
    where: { userId, modalidad },
    include: workoutInclude,
    order: [['timestamp', 'DESC']]
  });
}

export function findWorkoutByIdForUser(id: number, userId: number): Promise<Workout | null> {
  return Workout.findOne({
    where: { id, userId },
    include: workoutInclude
  });
}

export async function createWorkoutForUser(
  userId: number,
  data: CreateWorkoutBody
): Promise<Workout | null> {
  const { series = [], timestamp } = data;
  const workoutData = pickEditableFields(data);

  const workout = await sequelize.transaction(async (transaction) => {
    const createdWorkout = await Workout.create(
      {
        ...(workoutData as { nombre: string }),
        timestamp: timestamp ? new Date(timestamp) : new Date(),
        userId
      },
      { transaction }
    );

    if (series.length > 0) {
      await WorkoutSet.bulkCreate(
        series.map((serie) => ({
          ...serie,
          workoutId: createdWorkout.id
        })),
        { transaction, validate: true }
      );
    }

    return createdWorkout;
  });

  return findWorkoutByIdForUser(workout.id, userId);
}

export async function updateWorkoutForUser(
  workout: Workout,
  userId: number,
  data: UpdateWorkoutBody
): Promise<Workout | null> {
  const { series, timestamp } = data;
  const workoutData = pickEditableFields(data);

  await sequelize.transaction(async (transaction) => {
    await workout.update(
      {
        ...workoutData,
        ...(timestamp ? { timestamp: new Date(timestamp) } : {})
      },
      { transaction }
    );

    if (series) {
      await WorkoutSet.destroy({ where: { workoutId: workout.id }, transaction });

      if (series.length > 0) {
        await WorkoutSet.bulkCreate(
          series.map((serie) => ({
            ...serie,
            workoutId: workout.id
          })),
          { transaction, validate: true }
        );
      }
    }
  });

  return findWorkoutByIdForUser(workout.id, userId);
}

export function deleteWorkout(workout: Workout): Promise<void> {
  return workout.destroy();
}