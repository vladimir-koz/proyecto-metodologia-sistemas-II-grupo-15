import { body } from 'express-validator';
import { optionalTextBody, requiredTextBody } from './common.validators';

const exerciseCommonRules = [
  optionalTextBody('descripcion', 'descripcion'),
  optionalTextBody('imagen', 'imagen'),

  body('dificultad')
    .optional({ nullable: true })
    .isIn(['principiante', 'intermedio', 'avanzado'])
    .withMessage('dificultad debe ser principiante, intermedio o avanzado'),

  body('muscleGroupIds')
    .optional()
    .isArray()
    .withMessage('muscleGroupIds debe ser un arreglo'),

  body('muscleGroupIds.*')
    .optional()
    .isInt({ min: 1 })
    .withMessage('muscleGroupIds debe contener enteros positivos')
    .toInt()
];

export const createExerciseValidator = [
  requiredTextBody('nombre', 'El nombre del ejercicio'),
  ...exerciseCommonRules
];

export const updateExerciseValidator = [
  optionalTextBody('nombre', 'El nombre del ejercicio')
    .isLength({ min: 2 })
    .withMessage('El nombre del ejercicio debe tener al menos 2 caracteres'),
  ...exerciseCommonRules
];
