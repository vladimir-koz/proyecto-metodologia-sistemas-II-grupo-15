import { Router } from 'express';
import { destroy, index, show, store, update } from '../controllers/trainingProgram.controller';
import { verificarToken } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validateRequest.middleware';
import { idParamValidator } from '../validators/common.validators';
import { createTrainingProgramValidator, updateTrainingProgramValidator } from '../validators/trainingProgram.validators';

const router = Router();

router.use(verificarToken);

router.get('/', index);
router.get('/:id', idParamValidator, validateRequest, show);
router.post('/', createTrainingProgramValidator, validateRequest, store);
router.put('/:id', idParamValidator, updateTrainingProgramValidator, validateRequest, update);
router.delete('/:id', idParamValidator, validateRequest, destroy);

export default router;
