import { Router } from 'express';
import { auditLogController } from '../controllers/auditLogController';
import { createAuthMiddleware } from '../middleware/auth';
import { GoogleAuthProvider } from '../services/googleAuthProvider';
import { USER_ROLES } from '../constants/roles';
import { validateRequest } from '../middleware/validateRequest';
import { auditLogValidation } from '../validations/auditLogValidation';

const router = Router();
const { authenticate, authorize } = createAuthMiddleware(new GoogleAuthProvider());

// Apply authentication and admin role authorization to all routes
router.use(authenticate);
router.use(authorize(USER_ROLES.ADMIN));

// Get audit logs with pagination and filters
router.get(
  '/',
  validateRequest({
    query: auditLogValidation.getAuditLogs.query,
  }),
  auditLogController.getAuditLogs
);

// Get audit log statistics
router.get(
  '/statistics',
  validateRequest({
    query: auditLogValidation.getAuditLogStatistics.query,
  }),
  auditLogController.getAuditLogStatistics
);

// Get specific audit log by ID
router.get(
  '/:id',
  validateRequest({
    params: auditLogValidation.getAuditLogById.params,
  }),
  auditLogController.getAuditLogById
);

// Export audit logs to CSV
router.post(
  '/export',
  validateRequest({
    body: auditLogValidation.exportAuditLogs.body,
  }),
  auditLogController.exportAuditLogs
);

export default router;
