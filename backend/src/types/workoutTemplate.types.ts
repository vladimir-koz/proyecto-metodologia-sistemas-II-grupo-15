export interface WorkoutTemplateRequestBody {
  nombre: string;
  descripcion?: string | null;
  tipo?: string | null;
  grupoMuscularEtiqueta?: string | null;
  dificultad?: string | null;
  tiempoEstimado?: number;
}
