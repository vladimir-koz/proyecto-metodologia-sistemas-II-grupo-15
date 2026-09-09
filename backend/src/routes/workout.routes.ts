import { Router } from 'express';
import {
  createWorkout,
  deleteWorkout,
  getWorkoutById,
  listWorkouts,
  updateWorkout
} from '../controllers/workout.controller';
import { verificarToken } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validateRequest.middleware';
import { idParamValidator } from '../validators/common.validators';
import { createWorkoutValidator, updateWorkoutValidator } from '../validators/workout.validators';

const router = Router();

router.use(verificarToken);

router.get('/', listWorkouts);
router.get('/:id', idParamValidator, validateRequest, getWorkoutById);
router.post('/', createWorkoutValidator, validateRequest, createWorkout);
router.put('/:id', idParamValidator, updateWorkoutValidator, validateRequest, updateWorkout);
router.delete('/:id', idParamValidator, validateRequest, deleteWorkout);

export default router;
