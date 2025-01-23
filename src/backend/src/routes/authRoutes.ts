/**
 * Authentication routes configuration implementing secure OAuth flows,
 * session management, and token operations with comprehensive security controls.
 * @version 1.0.0
 */

import { Router } from 'express';
import { authController, validateSession } from '../controllers/authController';
import { authRateLimiter } from '../middleware/authRateLimiter';

const router = Router();

// Google OAuth routes
router.post('/google', authRateLimiter, authController.authenticate);
router.get('/google/callback', authController.handleGoogleCallback);
router.post('/refresh', authRateLimiter, authController.refresh);
router.post('/logout', authController.logout);
router.post('/session/validate', authRateLimiter, validateSession);

export default router;