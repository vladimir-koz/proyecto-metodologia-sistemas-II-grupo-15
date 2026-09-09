import { body, param, query } from 'express-validator';

export const idParamValidator = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('id debe ser un entero positivo')
    .toInt()
];

export const requiredPositiveIntBody = (field: string) => body(field)
  .isInt({ min: 1 })
  .withMessage(`${field} debe ser un entero positivo`)
  .toInt();

export const optionalPositiveIntBody = (field: string) => body(field)
  .optional({ nullable: true })
  .isInt({ min: 1 })
  .withMessage(`${field} debe ser un entero positivo`)
  .toInt();

export const requiredPositiveIntQuery = (field: string) => query(field)
  .isInt({ min: 1 })
  .withMessage(`${field} debe ser un entero positivo`)
  .toInt();

export const optionalPositiveIntQuery = (field: string) => query(field)
  .optional()
  .isInt({ min: 1 })
  .withMessage(`${field} debe ser un entero positivo`)
  .toInt();

export const requiredTextBody = (field: string, label = field) => body(field)
  .isString()
  .withMessage(`${label} debe ser texto`)
  .trim()
  .notEmpty()
  .withMessage(`${label} es obligatorio`)
  .isLength({ min: 2 })
  .withMessage(`${label} debe tener al menos 2 caracteres`);

export const optionalTextBody = (field: string, label = field) => body(field)
  .optional({ nullable: true })
  .isString()
  .withMessage(`${label} debe ser texto`)
  .trim();

export const optionalIsoDateBody = (field: string) => body(field)
  .optional({ nullable: true })
  .isISO8601()
  .withMessage(`${field} debe ser una fecha valida`);
