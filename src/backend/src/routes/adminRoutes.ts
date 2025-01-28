import express from 'express';
import { getAllUsers } from '../controllers/adminController';
import { createAuthMiddleware } from '../middleware/auth';
import { GoogleAuthProvider } from '../services/googleAuthProvider';

const router = express.Router();
const { authenticate } = createAuthMiddleware(new GoogleAuthProvider());

// Apply authentication middleware to all admin routes
router.use(authenticate);

// GET /api/admin/users - Get all users
router.get('/users', getAllUsers);

export default router;
