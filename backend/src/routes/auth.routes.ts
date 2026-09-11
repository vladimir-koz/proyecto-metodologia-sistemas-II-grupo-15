import { Router } from 'express';
import { login, perfil, register } from '../controllers/auth.controller';
import { verificarToken } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validateRequest.middleware';
import { loginValidator, registerValidator } from '../validators/auth.validators';

const router = Router();

router.post('/register', registerValidator, validateRequest, register);
router.post('/login', loginValidator, validateRequest, login);
router.get('/perfil', verificarToken, perfil);

export default router;
