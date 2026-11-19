import {
  MetricsStrategy,
  MetricWorkout,
  StrengthActivityDay,
  StrengthMetrics,
  StrengthSummary
} from '../../types/metrics.types';
import { definedNumbers, getAverage, getSetVolume, round, toDateKey } from './metrics.helpers';

function calculateSummary(workouts: MetricWorkout[]): StrengthSummary {
  const sets = workouts.flatMap((workout) => workout.series);
  const totalVolume = sets.reduce((total, set) => total + getSetVolume(set), 0);
  const totalRepetitions = sets.reduce((total, set) => total + set.repeticiones, 0);

  return {
    workouts: workouts.length,
    completedScheduledWorkouts: workouts.filter((workout) => workout.scheduledWorkoutId !== null).length,
    freeWorkouts: workouts.filter((workout) => workout.scheduledWorkoutId === null).length,
    totalSets: sets.length,
    totalRepetitions,
    totalVolume: round(totalVolume),
    averageSetsPerWorkout: workouts.length > 0 ? round(sets.length / workouts.length) : 0,
    averageRpe: getAverage(definedNumbers(sets.map((set) => set.rpe))),
    averageRir: getAverage(definedNumbers(sets.map((set) => set.rir)))
  };
}

function calculateActivity(workouts: MetricWorkout[]): StrengthActivityDay[] {
  const days = new Map<string, Omit<StrengthActivityDay, 'intensityLevel'>>();

  for (const workout of workouts) {
    const date = toDateKey(workout.timestamp);
    const current = days.get(date) ?? {
      date,
      workoutCount: 0,
      completedScheduledWorkouts: 0,
      setCount: 0,
      totalVolume: 0
    };

    current.workoutCount += 1;
    current.completedScheduledWorkouts += workout.scheduledWorkoutId !== null ? 1 : 0;
    current.setCount += workout.series.length;
    current.totalVolume += workout.series.reduce((total, set) => total + getSetVolume(set), 0);
    days.set(date, current);
  }

  const activity = Array.from(days.values());
  const maxVolume = Math.max(0, ...activity.map((day) => day.totalVolume));

  return activity.map((day) => ({
    ...day,
    totalVolume: round(day.totalVolume),
    intensityLevel: maxVolume > 0
      ? Math.max(1, Math.ceil((day.totalVolume / maxVolume) * 4))
      : Math.min(day.workoutCount, 4)
  }));
}

export const strengthStrategy: MetricsStrategy<StrengthMetrics> = {
  modalidad: 'fuerza',
  calculate(workouts: MetricWorkout[]): StrengthMetrics {
    return {
      summary: calculateSummary(workouts),
      activity: calculateActivity(workouts)
    };
  }
};