import { body, query } from 'express-validator';
import { MODALIDADES } from '../types/workout.types';

const optionalPositiveId = (field: string) => body(field)
  .optional({ nullable: true })
  .isInt({ min: 1 })
  .withMessage(`${field} debe ser un entero positivo`)
  .toInt();

const commonWorkoutRules = [
  body('modalidad')
    .optional()
    .isString()
    .withMessage('modalidad debe ser texto')
    .isIn([...MODALIDADES])
    .withMessage(`modalidad debe ser una de: ${MODALIDADES.join(', ')}`),

  body('distanciaKm')
    .optional({ nullable: true })
    .isFloat({ gt: 0 })
    .withMessage('distanciaKm debe ser un numero positivo')
    .toFloat(),

  body('duracionSegundos')
    .optional({ nullable: true })
    .isInt({ min: 1, max: 2147483647 })
    .withMessage('duracionSegundos debe ser un entero entre 1 y 2147483647')
    .toInt(),

  body('timestamp')
    .optional()
    .isISO8601()
    .withMessage('timestamp debe ser una fecha valida'),

  body('grupoMuscularEtiqueta')
    .optional({ nullable: true })
    .isString()
    .withMessage('grupoMuscularEtiqueta debe ser texto')
    .trim(),

  optionalPositiveId('workoutTemplateId'),
  optionalPositiveId('scheduledWorkoutId'),

  body('series')
    .optional()
    .isArray()
    .withMessage('series debe ser un arreglo'),

  body('series.*.exerciseId')
    .if(body('series').exists())
    .isInt({ min: 1 })
    .withMessage('series.exerciseId debe ser un entero positivo')
    .toInt(),

  body('series.*.repeticiones')
    .if(body('series').exists())
    .isInt({ min: 1 })
    .withMessage('series.repeticiones debe ser un entero positivo')
    .toInt(),

  body('series.*.peso')
    .if(body('series').exists())
    .isFloat({ min: 0 })
    .withMessage('series.peso debe ser un numero positivo')
    .toFloat(),

  body('series.*.rir')
    .optional({ nullable: true })
    .isInt({ min: 0, max: 10 })
    .withMessage('series.rir debe ser un entero entre 0 y 10')
    .toInt(),

  body('series.*.rpe')
    .optional({ nullable: true })
    .isFloat({ min: 1, max: 10 })
    .withMessage('series.rpe debe estar entre 1 y 10')
    .toFloat()
];

export const createWorkoutValidator = [
  body('nombre')
    .isString()
    .withMessage('El nombre debe ser texto')
    .trim()
    .notEmpty()
    .withMessage('El nombre del entrenamiento es obligatorio')
    .isLength({ min: 2 })
    .withMessage('El nombre debe tener al menos 2 caracteres'),
  ...commonWorkoutRules
];

export const updateWorkoutValidator = [
  body('nombre')
    .optional()
    .isString()
    .withMessage('El nombre debe ser texto')
    .trim()
    .isLength({ min: 2 })
    .withMessage('El nombre debe tener al menos 2 caracteres'),
  ...commonWorkoutRules
];

export const listWorkoutsValidator = [
  query('modalidad')
    .optional()
    .custom((value) => typeof value === 'string')
    .withMessage('modalidad debe ser texto')
    .isIn([...MODALIDADES])
    .withMessage(`modalidad debe ser una de: ${MODALIDADES.join(', ')}`)
];