export interface ScheduledWorkoutRequestBody {
  programWeekId: number;
  workoutTemplateId: number;
  nombre: string;
  diaSemana?: number;
  fechaProgramada?: string;
  orden: number;
  notas?: string;
}
