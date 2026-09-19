import { Router } from 'express';
import { authorize, authenticate } from '../../middleware/auth.js';
import { adminTest, getCurrentUser, login, register } from './auth.controller.js';

export const authRouter = Router();

authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.get('/me', authenticate, getCurrentUser);
authRouter.get('/admin-test', authenticate, authorize('ADMIN'), adminTest);