import { AppError } from './AppError';

export function getUniquePositiveIntegerIds(
  ids: number[] | undefined,
  fieldName: string
): number[] {
  if (ids === undefined) {
    return [];
  }

  if (!Array.isArray(ids)) {
    throw new AppError(`${fieldName} debe ser un arreglo`, 400);
  }

  const invalidId = ids.find((id) => !Number.isInteger(id) || id <= 0);

  if (invalidId !== undefined) {
    throw new AppError(`${fieldName} debe contener IDs numericos positivos`, 400);
  }

  return [...new Set(ids)];
}
