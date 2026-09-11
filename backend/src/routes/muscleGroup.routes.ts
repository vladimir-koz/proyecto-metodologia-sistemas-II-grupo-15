import { Router } from 'express';
import { destroy, index, show, store, update } from '../controllers/muscleGroup.controller';
import { verificarToken } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validateRequest.middleware';
import { idParamValidator } from '../validators/common.validators';
import { createMuscleGroupValidator, updateMuscleGroupValidator } from '../validators/muscleGroup.validators';

const router = Router();

router.use(verificarToken);

router.get('/', index);
router.get('/:id', idParamValidator, validateRequest, show);
router.post('/', createMuscleGroupValidator, validateRequest, store);
router.put('/:id', idParamValidator, updateMuscleGroupValidator, validateRequest, update);
router.delete('/:id', idParamValidator, validateRequest, destroy);

export default router;
