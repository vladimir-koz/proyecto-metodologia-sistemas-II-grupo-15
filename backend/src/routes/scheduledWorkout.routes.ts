import { Router } from 'express';
import { destroy, index, show, store, update } from '../controllers/scheduledWorkout.controller';
import { verificarToken } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validateRequest.middleware';
import { idParamValidator } from '../validators/common.validators';
import {
  createScheduledWorkoutValidator,
  listScheduledWorkoutsValidator,
  updateScheduledWorkoutValidator
} from '../validators/scheduledWorkout.validators';

const router = Router();

router.use(verificarToken);

router.get('/', listScheduledWorkoutsValidator, validateRequest, index);
router.get('/:id', idParamValidator, validateRequest, show);
router.post('/', createScheduledWorkoutValidator, validateRequest, store);
router.put('/:id', idParamValidator, updateScheduledWorkoutValidator, validateRequest, update);
router.delete('/:id', idParamValidator, validateRequest, destroy);

export default router;
