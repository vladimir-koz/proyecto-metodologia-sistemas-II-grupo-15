import { body } from 'express-validator';

export const registerValidator = [
  body('nombre')
    .isString()
    .withMessage('El nombre debe ser texto')
    .trim()
    .notEmpty()
    .withMessage('El nombre es obligatorio')
    .isLength({ min: 2 })
    .withMessage('El nombre debe tener al menos 2 caracteres'),

  body('email')
    .isString()
    .withMessage('El email debe ser texto')
    .trim()
    .notEmpty()
    .withMessage('El email es obligatorio')
    .isEmail()
    .withMessage('El email debe tener un formato valido')
    .normalizeEmail(),

  body('password')
    .isString()
    .withMessage('La password debe ser texto')
    .isLength({ min: 6 })
    .withMessage('La password debe tener al menos 6 caracteres')
];

export const loginValidator = [
  body('email')
    .isString()
    .withMessage('El email debe ser texto')
    .trim()
    .notEmpty()
    .withMessage('El email es obligatorio')
    .isEmail()
    .withMessage('El email debe tener un formato valido')
    .normalizeEmail(),

  body('password')
    .isString()
    .withMessage('La password debe ser texto')
    .notEmpty()
    .withMessage('La password es obligatoria')
];
