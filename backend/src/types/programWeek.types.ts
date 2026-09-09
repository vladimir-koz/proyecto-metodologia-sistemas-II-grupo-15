export interface ProgramWeekRequestBody {
  trainingProgramId: number;
  numeroSemana: number;
  nombre?: string;
  objetivo?: string;
  notas?: string;
  esDescarga?: boolean;
}
