import { Router } from 'express';
import { destroy, index, show, store, update } from '../controllers/programWeek.controller';
import { verificarToken } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validateRequest.middleware';
import { idParamValidator } from '../validators/common.validators';
import {
  createProgramWeekValidator,
  listProgramWeeksValidator,
  updateProgramWeekValidator
} from '../validators/programWeek.validators';

const router = Router();

router.use(verificarToken);

router.get('/', listProgramWeeksValidator, validateRequest, index);
router.get('/:id', idParamValidator, validateRequest, show);
router.post('/', createProgramWeekValidator, validateRequest, store);
router.put('/:id', idParamValidator, updateProgramWeekValidator, validateRequest, update);
router.delete('/:id', idParamValidator, validateRequest, destroy);

export default router;
