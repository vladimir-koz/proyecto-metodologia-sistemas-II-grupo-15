import { query } from 'express-validator';

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

export const exerciseProgressValidator = [
  ...metricsRangeValidator,
  query('exerciseId')
    .isInt({ min: 1 })
    .withMessage('exerciseId debe ser un entero positivo')
    .toInt()
];
