import { findExerciseById } from '../repositories/exercise.repository';
import { findMetricWorkouts } from '../repositories/metrics.repository';
import { MetricsQuery } from '../types/metrics.types';
import { AppError } from '../utils/AppError';
import { Workout, WorkoutSet } from '../models';

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

function round(value: number, decimals = 2): number {
  return Number(value.toFixed(decimals));
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getWorkoutSets(workout: Workout): WorkoutSet[] {
  return (workout.get('series') as WorkoutSet[] | undefined) ?? [];
}

function getSetVolume(set: WorkoutSet): number {
  return set.repeticiones * set.peso;
}

function getAverage(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  return round(values.reduce((total, value) => total + value, 0) / values.length);
}

function getEstimatedOneRepMax(set: WorkoutSet): number {
  return set.peso * (1 + set.repeticiones / 30);
}

export async function getMetricsSummary(userId: number, query: MetricsQuery) {
  const range = parseRange(query);
  const workouts = await findMetricWorkouts(userId, range);
  const sets = workouts.flatMap(getWorkoutSets);
  const totalVolume = sets.reduce((total, set) => total + getSetVolume(set), 0);
  const totalRepetitions = sets.reduce((total, set) => total + set.repeticiones, 0);
  const rpeValues = sets.map((set) => set.rpe).filter((value): value is number => value !== null && value !== undefined);
  const rirValues = sets.map((set) => set.rir).filter((value): value is number => value !== null && value !== undefined);

  return {
    summary: {
      workouts: workouts.length,
      completedScheduledWorkouts: workouts.filter((workout) => workout.scheduledWorkoutId !== null).length,
      freeWorkouts: workouts.filter((workout) => workout.scheduledWorkoutId === null).length,
      totalSets: sets.length,
      totalRepetitions,
      totalVolume: round(totalVolume),
      averageSetsPerWorkout: workouts.length > 0 ? round(sets.length / workouts.length) : 0,
      averageRpe: getAverage(rpeValues),
      averageRir: getAverage(rirValues),
      range: {
        from: range.from?.toISOString() ?? null,
        to: range.to?.toISOString() ?? null
      }
    }
  };
}

export async function getActivityHeatmap(userId: number, query: MetricsQuery) {
  const range = parseRange(query);
  const workouts = await findMetricWorkouts(userId, range);
  const days = new Map<string, {
    date: string;
    workoutCount: number;
    completedScheduledWorkouts: number;
    setCount: number;
    totalVolume: number;
  }>();

  for (const workout of workouts) {
    const date = toDateKey(workout.timestamp);
    const sets = getWorkoutSets(workout);
    const current = days.get(date) ?? {
      date,
      workoutCount: 0,
      completedScheduledWorkouts: 0,
      setCount: 0,
      totalVolume: 0
    };

    current.workoutCount += 1;
    current.completedScheduledWorkouts += workout.scheduledWorkoutId !== null ? 1 : 0;
    current.setCount += sets.length;
    current.totalVolume += sets.reduce((total, set) => total + getSetVolume(set), 0);
    days.set(date, current);
  }

  const activity = Array.from(days.values());
  const maxVolume = Math.max(0, ...activity.map((day) => day.totalVolume));

  return {
    activity: activity.map((day) => ({
      ...day,
      totalVolume: round(day.totalVolume),
      intensityLevel: maxVolume > 0 ? Math.max(1, Math.ceil((day.totalVolume / maxVolume) * 4)) : Math.min(day.workoutCount, 4)
    }))
  };
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
