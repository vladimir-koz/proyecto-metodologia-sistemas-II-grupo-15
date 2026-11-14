export const MODALIDADES = ['fuerza', 'running'] as const;

export type Modalidad = typeof MODALIDADES[number];

export interface WorkoutSetInput {
  repeticiones: number;
  peso: number;
  rir?: number | null;
  rpe?: number | null;
  exerciseId: number;
}

export interface CreateWorkoutBody {
  timestamp?: string;
  nombre: string;
  modalidad?: Modalidad;
  distanciaKm?: number | null;
  duracionSegundos?: number | null;
  grupoMuscularEtiqueta?: string;
  workoutTemplateId?: number | null;
  scheduledWorkoutId?: number | null;
  series?: WorkoutSetInput[];
}

export interface UpdateWorkoutBody {
  timestamp?: string;
  nombre?: string;
  modalidad?: Modalidad;
  distanciaKm?: number | null;
  duracionSegundos?: number | null;
  grupoMuscularEtiqueta?: string;
  workoutTemplateId?: number | null;
  scheduledWorkoutId?: number | null;
  series?: WorkoutSetInput[];
}