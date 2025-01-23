import { Router } from 'express';
import { createAuthMiddleware } from '../middleware/auth';
import BenchmarkController from '../controllers/benchmarkController';
import { UserRole } from '../types/auth';
import correlator from 'express-correlation-id';
import { validateRequest } from '../middleware/validator';
import { 
  validateBenchmarkGet,
  validateBenchmarkCreate,
  validateBenchmarkUpdate 
} from '../validators/benchmarkValidator';
import { GoogleAuthProvider } from '../services/googleAuthProvider';

const router = Router();
const benchmarkController = new BenchmarkController();

// Initialize auth middleware with Google auth provider
const { authenticate, authorize } = createAuthMiddleware(new GoogleAuthProvider());

// Add correlation ID middleware for request tracking
router.use(correlator());

// Public routes
router.get('/public', benchmarkController.getPublicBenchmarks);

// Protected routes
router.get('/', 
  authenticate, 
  authorize([UserRole.USER, UserRole.ADMIN]),
  validateRequest(validateBenchmarkGet),
  benchmarkController.getBenchmarks
);

router.post('/', 
  authenticate, 
  authorize([UserRole.USER, UserRole.ADMIN]),
  validateRequest(validateBenchmarkCreate),
  benchmarkController.createBenchmark
);

router.put('/:id', 
  authenticate, 
  authorize([UserRole.USER, UserRole.ADMIN]),
  validateRequest(validateBenchmarkUpdate),
  benchmarkController.updateBenchmark
);

router.delete('/:id', 
  authenticate, 
  authorize(UserRole.ADMIN),
  benchmarkController.deleteBenchmark
);

export default router;