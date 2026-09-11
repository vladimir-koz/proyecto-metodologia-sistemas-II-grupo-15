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
