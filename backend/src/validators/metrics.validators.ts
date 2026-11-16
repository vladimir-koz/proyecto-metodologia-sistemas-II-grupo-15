import { query } from 'express-validator';
import { MODALIDADES } from '../types/workout.types';

export const metricsRangeValidator = [
  query('from')
    .optional()
    .isISO8601()
    .withMessage('from debe ser una fecha valida'),
  query('to')
    .optional()
    .isISO8601()
    .withMessage('to debe ser una fecha valida')
];

/** Resumen y calendario: rango opcional y modalidad opcional (fuerza por defecto). */
export const metricsQueryValidator = [
  ...metricsRangeValidator,
  query('modalidad')
    .optional()
    .custom((value) => typeof value === 'string')
    .withMessage('modalidad debe ser texto')
    .isIn([...MODALIDADES])
    .withMessage(`modalidad debe ser una de: ${MODALIDADES.join(', ')}`)
];

export const exerciseProgressValidator = [
  ...metricsRangeValidator,
  query('exerciseId')
    .isInt({ min: 1 })
    .withMessage('exerciseId debe ser un entero positivo')
    .toInt()
];