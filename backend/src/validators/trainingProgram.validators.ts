import { optionalIsoDateBody, optionalTextBody, requiredTextBody } from './common.validators';

const trainingProgramCommonRules = [
  optionalTextBody('descripcion', 'descripcion'),
  optionalTextBody('objetivo', 'objetivo'),
  optionalTextBody('estado', 'estado'),
  optionalIsoDateBody('fechaInicio'),
  optionalIsoDateBody('fechaFin')
];

export const createTrainingProgramValidator = [
  requiredTextBody('nombre', 'El nombre del programa'),
  ...trainingProgramCommonRules
];

export const updateTrainingProgramValidator = [
  optionalTextBody('nombre', 'El nombre del programa')
    .isLength({ min: 2 })
    .withMessage('El nombre del programa debe tener al menos 2 caracteres'),
  ...trainingProgramCommonRules
];
