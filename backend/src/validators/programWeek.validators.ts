import { body } from 'express-validator';
import {
  optionalPositiveIntBody,
  optionalTextBody,
  requiredPositiveIntBody,
  requiredPositiveIntQuery
} from './common.validators';

const programWeekCommonRules = [
  optionalTextBody('nombre', 'nombre'),
  optionalTextBody('objetivo', 'objetivo'),
  optionalTextBody('notas', 'notas'),

  body('esDescarga')
    .optional()
    .isBoolean()
    .withMessage('esDescarga debe ser booleano')
    .toBoolean()
];

export const listProgramWeeksValidator = [
  requiredPositiveIntQuery('trainingProgramId')
];

export const createProgramWeekValidator = [
  requiredPositiveIntBody('trainingProgramId'),
  requiredPositiveIntBody('numeroSemana'),
  ...programWeekCommonRules
];

export const updateProgramWeekValidator = [
  optionalPositiveIntBody('trainingProgramId'),
  optionalPositiveIntBody('numeroSemana'),
  ...programWeekCommonRules
];
