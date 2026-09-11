import { Router } from 'express';
import { destroy, index, show, store, update } from '../controllers/workoutTemplateExercise.controller';
import { verificarToken } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validateRequest.middleware';
import { idParamValidator } from '../validators/common.validators';
import {
  createWorkoutTemplateExerciseValidator,
  listWorkoutTemplateExercisesValidator,
  updateWorkoutTemplateExerciseValidator
} from '../validators/workoutTemplateExercise.validators';

const router = Router();

router.use(verificarToken);

router.get('/', listWorkoutTemplateExercisesValidator, validateRequest, index);
router.get('/:id', idParamValidator, validateRequest, show);
router.post('/', createWorkoutTemplateExerciseValidator, validateRequest, store);
router.put('/:id', idParamValidator, updateWorkoutTemplateExerciseValidator, validateRequest, update);
router.delete('/:id', idParamValidator, validateRequest, destroy);

export default router;
