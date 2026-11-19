import { Router } from 'express';
import { activityHeatmap, exerciseProgress, runningProgress, summary } from '../controllers/metrics.controller';
import { verificarToken } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validateRequest.middleware';
import { exerciseProgressValidator, metricsQueryValidator, metricsRangeValidator } from '../validators/metrics.validators';

const router = Router();

router.use(verificarToken);

router.get('/summary', metricsQueryValidator, validateRequest, summary);
router.get('/activity-heatmap', metricsQueryValidator, validateRequest, activityHeatmap);
router.get('/exercise-progress', exerciseProgressValidator, validateRequest, exerciseProgress);
router.get('/running-progress', metricsRangeValidator, validateRequest, runningProgress);

export default router;