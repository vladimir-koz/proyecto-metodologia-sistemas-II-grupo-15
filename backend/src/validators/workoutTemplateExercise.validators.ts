import { body, query } from 'express-validator';

const optionalPositiveNumber = (field: string) => body(field)
  .optional({ nullable: true })
  .isFloat({ min: 0 })
  .withMessage(`${field} debe ser un numero positivo`)
  .toFloat();

const commonRules = [
  body('workoutTemplateId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('workoutTemplateId debe ser un entero positivo')
    .toInt(),

  body('exerciseId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('exerciseId debe ser un entero positivo')
    .toInt(),

  body('orden')
    .optional()
    .isInt({ min: 1 })
    .withMessage('orden debe ser un entero positivo')
    .toInt(),

  body('repeticiones')
    .optional()
    .isInt({ min: 1 })
    .withMessage('repeticiones debe ser un entero positivo')
    .toInt(),

  optionalPositiveNumber('peso'),

  body('rirObjetivo')
    .optional({ nullable: true })
    .isInt({ min: 0, max: 10 })
    .withMessage('rirObjetivo debe ser un entero entre 0 y 10')
    .toInt(),

  body('rpeObjetivo')
    .optional({ nullable: true })
    .isFloat({ min: 1, max: 10 })
    .withMessage('rpeObjetivo debe estar entre 1 y 10')
    .toFloat()
];

export const listWorkoutTemplateExercisesValidator = [
  query('workoutTemplateId')
    .isInt({ min: 1 })
    .withMessage('workoutTemplateId debe ser un entero positivo')
    .toInt()
];

export const createWorkoutTemplateExerciseValidator = [
  body('workoutTemplateId')
    .isInt({ min: 1 })
    .withMessage('workoutTemplateId debe ser un entero positivo')
    .toInt(),

  body('exerciseId')
    .isInt({ min: 1 })
    .withMessage('exerciseId debe ser un entero positivo')
    .toInt(),

  body('orden')
    .isInt({ min: 1 })
    .withMessage('orden debe ser un entero positivo')
    .toInt(),

  body('repeticiones')
    .isInt({ min: 1 })
    .withMessage('repeticiones debe ser un entero positivo')
    .toInt(),

  optionalPositiveNumber('peso'),

  body('rirObjetivo')
    .optional({ nullable: true })
    .isInt({ min: 0, max: 10 })
    .withMessage('rirObjetivo debe ser un entero entre 0 y 10')
    .toInt(),

  body('rpeObjetivo')
    .optional({ nullable: true })
    .isFloat({ min: 1, max: 10 })
    .withMessage('rpeObjetivo debe estar entre 1 y 10')
    .toFloat()
];

export const updateWorkoutTemplateExerciseValidator = commonRules;
