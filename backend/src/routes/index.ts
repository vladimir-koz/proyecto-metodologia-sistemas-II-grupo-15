import { Router } from 'express';
import authRoutes from './auth.routes';
import exerciseRoutes from './exercise.routes';
import muscleGroupRoutes from './muscleGroup.routes';
import workoutTemplateRoutes from './workoutTemplate.routes';
import workoutTemplateExerciseRoutes from './workoutTemplateExercise.routes';
import trainingProgramRoutes from './trainingProgram.routes';
import programWeekRoutes from './programWeek.routes';
import scheduledWorkoutRoutes from './scheduledWorkout.routes';
import workoutRoutes from './workout.routes';
import metricsRoutes from './metrics.routes';

const router = Router();

router.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'API funcionando correctamente',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

router.use('/auth', authRoutes);
router.use('/exercises', exerciseRoutes);
router.use('/muscle-groups', muscleGroupRoutes);
router.use('/workout-templates', workoutTemplateRoutes);
router.use('/workout-template-exercises', workoutTemplateExerciseRoutes);
router.use('/training-programs', trainingProgramRoutes);
router.use('/program-weeks', programWeekRoutes);
router.use('/scheduled-workouts', scheduledWorkoutRoutes);
router.use('/workouts', workoutRoutes);
router.use('/metrics', metricsRoutes);


export default router;
