import { MetricsStrategy, ModalityMetrics } from '../../types/metrics.types';
import { Modalidad } from '../../types/workout.types';
import { AppError } from '../../utils/AppError';
import { runningStrategy } from './running.strategy';
import { strengthStrategy } from './strength.strategy';

/** Registro explicito de estrategias por modalidad (sin Factory). */
const strategies: Record<Modalidad, MetricsStrategy> = {
  fuerza: strengthStrategy as MetricsStrategy,
  running: runningStrategy as MetricsStrategy
};

export function getMetricsStrategy(modalidad: string): MetricsStrategy<ModalityMetrics> {
  if (!Object.prototype.hasOwnProperty.call(strategies, modalidad)) {
    throw new AppError(`Modalidad no soportada: ${modalidad}`, 400);
  }

  return strategies[modalidad as Modalidad];
}

export { runningStrategy, strengthStrategy };