import {
  MetricsStrategy,
  MetricWorkout,
  RunningActivityDay,
  RunningMetrics,
  RunningProgressItem,
  RunningSummary
} from '../../types/metrics.types';
import { calcularRitmoSegundosPorKm, calcularVelocidadKmH } from '../../utils/runningMath';
import { round, toDateKey } from './metrics.helpers';

function distanceOf(workout: MetricWorkout): number {
  return workout.distanciaKm ?? 0;
}

function durationOf(workout: MetricWorkout): number {
  return workout.duracionSegundos ?? 0;
}

function calculateSummary(workouts: MetricWorkout[]): RunningSummary {
  const totalDistance = workouts.reduce((total, workout) => total + distanceOf(workout), 0);
  const totalDuration = workouts.reduce((total, workout) => total + durationOf(workout), 0);

  return {
    workouts: workouts.length,
    totalDistanceKm: round(totalDistance),
    totalDurationSeconds: totalDuration,
    // Ritmo agregado: duracion total / distancia total (no el promedio de ritmos).
    averagePaceSecondsPerKm: calcularRitmoSegundosPorKm(totalDistance, totalDuration),
    averageSpeedKmH: calcularVelocidadKmH(totalDistance, totalDuration)
  };
}

function calculateActivity(workouts: MetricWorkout[]): RunningActivityDay[] {
  const days = new Map<string, Omit<RunningActivityDay, 'intensityLevel'>>();

  for (const workout of workouts) {
    const date = toDateKey(workout.timestamp);
    const current = days.get(date) ?? {
      date,
      workoutCount: 0,
      totalDistanceKm: 0,
      totalDurationSeconds: 0
    };

    current.workoutCount += 1;
    current.totalDistanceKm += distanceOf(workout);
    current.totalDurationSeconds += durationOf(workout);
    days.set(date, current);
  }

  const activity = Array.from(days.values());
  const maxDistance = Math.max(0, ...activity.map((day) => day.totalDistanceKm));

  return activity.map((day) => ({
    ...day,
    totalDistanceKm: round(day.totalDistanceKm),
    intensityLevel: maxDistance > 0
      ? Math.max(1, Math.ceil((day.totalDistanceKm / maxDistance) * 4))
      : Math.min(day.workoutCount, 4)
  }));
}

function calculateProgress(workouts: MetricWorkout[]): RunningProgressItem[] {
  return workouts.map((workout) => ({
    date: workout.timestamp.toISOString(),
    workoutId: workout.id,
    workoutName: workout.nombre,
    distanceKm: round(distanceOf(workout)),
    durationSeconds: durationOf(workout),
    paceSecondsPerKm: calcularRitmoSegundosPorKm(workout.distanciaKm, workout.duracionSegundos),
    speedKmH: calcularVelocidadKmH(workout.distanciaKm, workout.duracionSegundos)
  }));
}

export const runningStrategy: MetricsStrategy<RunningMetrics> = {
  modalidad: 'running',
  calculate(workouts: MetricWorkout[]): RunningMetrics {
    return {
      summary: calculateSummary(workouts),
      activity: calculateActivity(workouts),
      progress: calculateProgress(workouts)
    };
  }
};