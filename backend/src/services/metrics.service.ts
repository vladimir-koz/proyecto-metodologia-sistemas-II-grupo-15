import { findExerciseById } from '../repositories/exercise.repository';
import { findMetricWorkouts } from '../repositories/metrics.repository';
import { MetricsQuery, MetricsStrategy, MetricWorkout, ModalityMetrics } from '../types/metrics.types';
import { AppError } from '../utils/AppError';
import { resolverModalidad } from '../utils/modalidad';
import { Workout, WorkoutSet } from '../models';
import { getMetricsStrategy } from './strategies';
import { getAverage, getEstimatedOneRepMax, getSetVolume, round } from './strategies/metrics.helpers';

function parseOptionalDate(value: string | undefined, fieldName: string): Date | undefined {
  if (value === undefined) {
    return undefined;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new AppError(`${fieldName} debe ser una fecha valida`, 400);
  }

  return date;
}

function parseRange(query: MetricsQuery) {
  const from = parseOptionalDate(query.from, 'from');
  const to = parseOptionalDate(query.to, 'to');

  if (from && to && from.getTime() > to.getTime()) {
    throw new AppError('from no puede ser posterior a to', 400);
  }

  return { from, to };
}

function getWorkoutSets(workout: Workout): WorkoutSet[] {
  return (workout.get('series') as WorkoutSet[] | undefined) ?? [];
}

/** Convierte los modelos Sequelize en datos planos para las estrategias. */
function toMetricWorkout(workout: Workout): MetricWorkout {
  return {
    id: workout.id,
    nombre: workout.nombre,
    timestamp: workout.timestamp,
    scheduledWorkoutId: workout.scheduledWorkoutId,
    distanciaKm: workout.distanciaKm ?? null,
    duracionSegundos: workout.duracionSegundos ?? null,
    series: getWorkoutSets(workout).map((set) => ({
      exerciseId: set.exerciseId,
      repeticiones: set.repeticiones,
      peso: set.peso,
      rir: set.rir ?? null,
      rpe: set.rpe ?? null
    }))
  };
}

/**
 * Consulta los datos autorizados del usuario para la modalidad indicada
 * y delega el calculo en la estrategia correspondiente.
 */
async function calcularMetricas<TMetrics extends ModalityMetrics>(
  userId: number,
  query: MetricsQuery,
  strategy: MetricsStrategy<TMetrics>
) {
  const range = parseRange(query);
  const workouts = await findMetricWorkouts(userId, range, strategy.modalidad);

  return { range, metrics: strategy.calculate(workouts.map(toMetricWorkout)) };
}

export async function getMetricsSummary(userId: number, query: MetricsQuery) {
  const strategy = getMetricsStrategy(resolverModalidad(query.modalidad));
  const { range, metrics } = await calcularMetricas(userId, query, strategy);

  return {
    summary: {
      ...metrics.summary,
      range: {
        from: range.from?.toISOString() ?? null,
        to: range.to?.toISOString() ?? null
      }
    }
  };
}

export async function getActivityHeatmap(userId: number, query: MetricsQuery) {
  const strategy = getMetricsStrategy(resolverModalidad(query.modalidad));
  const { metrics } = await calcularMetricas(userId, query, strategy);

  return { activity: metrics.activity };
}

export async function getRunningProgress(userId: number, query: MetricsQuery) {
  const { metrics } = await calcularMetricas(userId, query, getMetricsStrategy('running'));

  return { progress: metrics.progress };
}

export async function getExerciseProgress(userId: number, exerciseId: number, query: MetricsQuery) {
  const exercise = await findExerciseById(exerciseId, userId);

  if (!exercise) {
    throw new AppError('Ejercicio no encontrado', 404);
  }

  const range = parseRange(query);
  const workouts = await findMetricWorkouts(userId, range);
  const progress = workouts
    .map((workout) => {
      const sets = getWorkoutSets(workout).filter((set) => set.exerciseId === exerciseId);

      if (sets.length === 0) {
        return null;
      }

      const totalVolume = sets.reduce((total, set) => total + getSetVolume(set), 0);
      const rpeValues = sets.map((set) => set.rpe).filter((value): value is number => value !== null && value !== undefined);
      const rirValues = sets.map((set) => set.rir).filter((value): value is number => value !== null && value !== undefined);

      return {
        date: workout.timestamp.toISOString(),
        workoutId: workout.id,
        workoutName: workout.nombre,
        setCount: sets.length,
        maxWeight: round(Math.max(...sets.map((set) => set.peso))),
        maxRepetitions: Math.max(...sets.map((set) => set.repeticiones)),
        totalVolume: round(totalVolume),
        estimatedOneRepMax: round(Math.max(...sets.map(getEstimatedOneRepMax))),
        averageRpe: getAverage(rpeValues),
        averageRir: getAverage(rirValues)
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  return {
    exercise,
    progress
  };
}