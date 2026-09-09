import { optionalTextBody, requiredTextBody } from './common.validators';

export const createMuscleGroupValidator = [
  requiredTextBody('nombre', 'El nombre del grupo muscular')
];

export const updateMuscleGroupValidator = [
  optionalTextBody('nombre', 'El nombre del grupo muscular')
    .isLength({ min: 2 })
    .withMessage('El nombre del grupo muscular debe tener al menos 2 caracteres')
];
