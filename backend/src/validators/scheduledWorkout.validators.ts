import { body } from 'express-validator';
import {
  optionalIsoDateBody,
  optionalPositiveIntBody,
  optionalTextBody,
  requiredPositiveIntBody,
  requiredPositiveIntQuery,
  requiredTextBody
} from './common.validators';

const scheduledWorkoutCommonRules = [
  body('diaSemana')
    .optional({ nullable: true })
    .isInt({ min: 1, max: 7 })
    .withMessage('diaSemana debe ser un entero entre 1 y 7')
    .toInt(),
  optionalIsoDateBody('fechaProgramada'),
  optionalTextBody('notas', 'notas')
];

export const listScheduledWorkoutsValidator = [
  requiredPositiveIntQuery('programWeekId')
];

export const createScheduledWorkoutValidator = [
  requiredPositiveIntBody('programWeekId'),
  requiredPositiveIntBody('workoutTemplateId'),
  requiredTextBody('nombre', 'El nombre del entrenamiento programado'),
  requiredPositiveIntBody('orden'),
  ...scheduledWorkoutCommonRules
];

export const updateScheduledWorkoutValidator = [
  optionalPositiveIntBody('programWeekId'),
  optionalPositiveIntBody('workoutTemplateId'),
  optionalTextBody('nombre', 'El nombre del entrenamiento programado')
    .isLength({ min: 2 })
    .withMessage('El nombre del entrenamiento programado debe tener al menos 2 caracteres'),
  optionalPositiveIntBody('orden'),
  ...scheduledWorkoutCommonRules
];
