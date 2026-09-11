export interface WorkoutTemplateRequestBody {
  nombre: string;
  descripcion?: string;
  tipo?: string;
  grupoMuscularEtiqueta?: string;
  dificultad?: string;
  tiempoEstimado?: number;
}
