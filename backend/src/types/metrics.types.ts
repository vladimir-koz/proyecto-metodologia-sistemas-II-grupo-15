import { Modalidad } from './workout.types';

export interface MetricsQuery {
  from?: string;
  to?: string;
}

export interface ExerciseProgressQuery extends MetricsQuery {
  exerciseId: number;
}

export interface ParsedMetricsRange {
  from?: Date;
  to?: Date;
}

/** Datos planos que reciben las estrategias. No dependen de Sequelize ni de la base. */
export interface MetricSet {
  exerciseId: number;
  repeticiones: number;
  peso: number;
  rir: number | null;
  rpe: number | null;
}

export interface MetricWorkout {
  id: number;
  nombre: string;
  timestamp: Date;
  scheduledWorkoutId: number | null;
  distanciaKm: number | null;
  duracionSegundos: number | null;
  series: MetricSet[];
}

/* ---------- Fuerza ---------- */

export interface StrengthSummary {
  workouts: number;
  completedScheduledWorkouts: number;
  freeWorkouts: number;
  totalSets: number;
  totalRepetitions: number;
  totalVolume: number;
  averageSetsPerWorkout: number;
  averageRpe: number | null;
  averageRir: number | null;
}

export interface StrengthActivityDay {
  date: string;
  workoutCount: number;
  completedScheduledWorkouts: number;
  setCount: number;
  totalVolume: number;
  intensityLevel: number;
}

/* ---------- Running ---------- */

export interface RunningSummary {
  workouts: number;
  totalDistanceKm: number;
  totalDurationSeconds: number;
  averagePaceSecondsPerKm: number | null;
  averageSpeedKmH: number | null;
}

export interface RunningActivityDay {
  date: string;
  workoutCount: number;
  totalDistanceKm: number;
  totalDurationSeconds: number;
  intensityLevel: number;
}

export interface RunningProgressItem {
  date: string;
  workoutId: number;
  workoutName: string;
  distanceKm: number;
  durationSeconds: number;
  paceSecondsPerKm: number | null;
  speedKmH: number | null;
}

/* ---------- Contrato Strategy ---------- */

export interface ModalityMetrics<TSummary = unknown, TDay = unknown> {
  summary: TSummary;
  activity: TDay[];
}

export type StrengthMetrics = ModalityMetrics<StrengthSummary, StrengthActivityDay>;

export interface RunningMetrics extends ModalityMetrics<RunningSummary, RunningActivityDay> {
  progress: RunningProgressItem[];
}

/**
 * Cada modalidad implementa su propio calculo. La estrategia solo recibe datos
 * ya autorizados: no consulta la base ni gestiona permisos.
 */
export interface MetricsStrategy<TMetrics extends ModalityMetrics = ModalityMetrics> {
  readonly modalidad: Modalidad;
  calculate(workouts: MetricWorkout[]): TMetrics;
}