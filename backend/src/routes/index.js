import { Router } from 'express';
import {
  changePassword,
  getParams,
  login,
  register
} from '../controllers/authController.js';

const router = Router();

router.get('/params', getParams);
router.post('/register', register);
router.post('/login', login);
router.post('/password/change', changePassword);

export default router;

