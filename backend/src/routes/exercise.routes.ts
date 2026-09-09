import { Router } from 'express';
import { destroy, index, show, store, update } from '../controllers/exercise.controller';
import { verificarToken } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validateRequest.middleware';
import { idParamValidator, optionalPositiveIntQuery } from '../validators/common.validators';
import { createExerciseValidator, updateExerciseValidator } from '../validators/exercise.validators';

const router = Router();

router.use(verificarToken);

router.get('/', optionalPositiveIntQuery('muscleGroupId'), validateRequest, index);
router.get('/:id', idParamValidator, validateRequest, show);
router.post('/', createExerciseValidator, validateRequest, store);
router.put('/:id', idParamValidator, updateExerciseValidator, validateRequest, update);
router.delete('/:id', idParamValidator, validateRequest, destroy);

export default router;
