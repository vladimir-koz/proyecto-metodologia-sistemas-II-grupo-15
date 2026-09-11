import { Router } from 'express';
import { activityHeatmap, exerciseProgress, summary } from '../controllers/metrics.controller';
import { verificarToken } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validateRequest.middleware';
import { exerciseProgressValidator, metricsRangeValidator } from '../validators/metrics.validators';

const router = Router();

router.use(verificarToken);

router.get('/summary', metricsRangeValidator, validateRequest, summary);
router.get('/activity-heatmap', metricsRangeValidator, validateRequest, activityHeatmap);
router.get('/exercise-progress', exerciseProgressValidator, validateRequest, exerciseProgress);

export default router;
