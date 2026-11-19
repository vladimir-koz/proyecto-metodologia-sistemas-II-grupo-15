import { Modalidad, MODALIDADES } from '../types/workout.types';
import { AppError } from './AppError';

export const MODALIDAD_POR_DEFECTO: Modalidad = 'fuerza';

export function esModalidad(value: unknown): value is Modalidad {
  return typeof value === 'string' && (MODALIDADES as readonly string[]).includes(value);
}

/** Sin modalidad se asume fuerza; un valor desconocido se rechaza con 400. */
export function resolverModalidad(value: unknown): Modalidad {
  if (value === undefined) {
    return MODALIDAD_POR_DEFECTO;
  }

  if (!esModalidad(value)) {
    throw new AppError('modalidad debe ser una de: fuerza, running', 400);
  }

  return value;
}