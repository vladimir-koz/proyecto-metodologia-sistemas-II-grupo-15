import { AppError } from './AppError';

export function parseId(id: string): number {
  const parsedId = Number(id);

  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    throw new AppError('El id debe ser un numero entero positivo', 400);
  }

  return parsedId;
}
