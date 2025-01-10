/**
 * Express router configuration for handling report generation and data export endpoints.
 * Implements secure, scalable routes for PDF and CSV exports with comprehensive validation,
 * rate limiting, and error handling.
 * @version 1.0.0
 */

import { Router } from 'express'; // ^4.18.2
import { container } from 'tsyringe'; // ^4.7.0
import { ExportController } from '../controllers/exportController';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validator';
import { exportRequestSchema } from '../validators/exportValidator';
import { rateLimiter } from '../middleware/rateLimiter';
import { USER_ROLES } from '../constants/roles';

// Create Express router instance
const exportRouter = Router();

// Get ExportController instance from dependency container
const exportController = container.resolve(ExportController);

/**
 * Rate limiting configuration for export endpoints
 */
const exportRateLimit = rateLimiter({
  keyPrefix: 'export:',
  defaultTier: USER_ROLES.USER,
});

/**
 * @route POST /api/v1/exports/generate
 * @desc Generate PDF or CSV report with queue-based processing
 * @access Private
 */
exportRouter.post(
  '/generate',
  authenticate,
  validateRequest(exportRequestSchema),
  exportRateLimit,
  async (req, res, next) => {
    try {
      await exportController.generateReport(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/v1/exports/download/:reportId
 * @desc Download generated report with proper content headers
 * @access Private
 */
exportRouter.get(
  '/download/:reportId',
  authenticate,
  validateRequest(exportRequestSchema),
  async (req, res, next) => {
    try {
      await exportController.downloadReport(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/v1/exports/status/:reportId
 * @desc Check status of report generation
 * @access Private
 */
exportRouter.get(
  '/status/:reportId',
  authenticate,
  validateRequest(exportRequestSchema),
  async (req, res, next) => {
    try {
      await exportController.getReportStatus(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route DELETE /api/v1/exports/:reportId
 * @desc Delete a generated report
 * @access Private
 */
exportRouter.delete(
  '/:reportId',
  authenticate,
  validateRequest(exportRequestSchema),
  async (req, res, next) => {
    try {
      await exportController.deleteReport(req, res);
    } catch (error) {
      next(error);
    }
  }
);

// Apply security headers to all export routes
exportRouter.use((req, res, next) => {
  res.set({
    'Content-Security-Policy': "default-src 'none'",
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'private, no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  next();
});

export default exportRouter;