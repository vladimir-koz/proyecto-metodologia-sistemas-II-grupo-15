export interface WorkoutTemplateExerciseRequestBody {
  workoutTemplateId: number;
  exerciseId: number;
  orden: number;
  repeticiones: number;
  peso?: number | null;
  rirObjetivo?: number | null;
  rpeObjetivo?: number | null;
}
