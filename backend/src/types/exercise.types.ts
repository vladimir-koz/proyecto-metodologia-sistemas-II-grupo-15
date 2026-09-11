import { ExerciseDifficulty } from '../models/Exercise';

export interface ExerciseRequestBody {
  nombre: string;
  descripcion?: string;
  dificultad?: ExerciseDifficulty;
  imagen?: string;
  muscleGroupIds?: number[];
}
