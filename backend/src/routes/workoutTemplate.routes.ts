import { Router } from 'express';
import { destroy, index, show, store, update } from '../controllers/workoutTemplate.controller';
import { verificarToken } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validateRequest.middleware';
import { idParamValidator } from '../validators/common.validators';
import { createWorkoutTemplateValidator, updateWorkoutTemplateValidator } from '../validators/workoutTemplate.validators';

const router = Router();

router.use(verificarToken);

router.get('/', index);
router.get('/:id', idParamValidator, validateRequest, show);
router.post('/', createWorkoutTemplateValidator, validateRequest, store);
router.put('/:id', idParamValidator, updateWorkoutTemplateValidator, validateRequest, update);
router.delete('/:id', idParamValidator, validateRequest, destroy);

export default router;
