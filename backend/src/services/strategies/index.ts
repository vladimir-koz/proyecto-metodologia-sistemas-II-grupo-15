import { MetricsStrategy, RunningMetrics, StrengthMetrics } from '../../types/metrics.types';
import { AppError } from '../../utils/AppError';
import { esModalidad } from '../../utils/modalidad';
import { runningStrategy } from './running.strategy';
import { strengthStrategy } from './strength.strategy';

/** Registro explicito de estrategias por modalidad (sin Factory). */
const strategies = {
  fuerza: strengthStrategy,
  running: runningStrategy
};

export function getMetricsStrategy(modalidad: 'fuerza'): MetricsStrategy<StrengthMetrics>;
export function getMetricsStrategy(modalidad: 'running'): MetricsStrategy<RunningMetrics>;
export function getMetricsStrategy(modalidad: string): MetricsStrategy<StrengthMetrics | RunningMetrics>;
export function getMetricsStrategy(modalidad: string): MetricsStrategy<StrengthMetrics | RunningMetrics> {
  if (!esModalidad(modalidad)) {
    throw new AppError(`Modalidad no soportada: ${modalidad}`, 400);
  }

  return strategies[modalidad];
}

export { runningStrategy, strengthStrategy };
