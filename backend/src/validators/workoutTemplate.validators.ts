import { body } from 'express-validator';
import { optionalTextBody, requiredTextBody } from './common.validators';

const workoutTemplateCommonRules = [
  optionalTextBody('descripcion', 'descripcion'),
  optionalTextBody('tipo', 'tipo'),
  optionalTextBody('grupoMuscularEtiqueta', 'grupoMuscularEtiqueta'),
  optionalTextBody('dificultad', 'dificultad'),

  body('tiempoEstimado')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('tiempoEstimado debe ser un entero positivo')
    .toInt()
];

export const createWorkoutTemplateValidator = [
  requiredTextBody('nombre', 'El nombre de la plantilla de entrenamiento'),
  ...workoutTemplateCommonRules
];

export const updateWorkoutTemplateValidator = [
  optionalTextBody('nombre', 'El nombre de la plantilla de entrenamiento')
    .isLength({ min: 2 })
    .withMessage('El nombre de la plantilla de entrenamiento debe tener al menos 2 caracteres'),
  ...workoutTemplateCommonRules
];
