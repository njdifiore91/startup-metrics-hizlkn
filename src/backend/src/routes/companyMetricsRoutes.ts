/**
 * Express router configuration for company metrics endpoints.
 * Implements secure CRUD operations with comprehensive validation,
 * rate limiting, and role-based access control.
 * @version 1.0.0
 */

import express, { Router } from 'express'; // ^4.18.2
import rateLimit from 'express-rate-limit'; // ^6.7.0
import correlationId from 'express-correlation-id'; // ^2.0.0
import cacheControl from 'express-cache-controller'; // ^1.1.0

import CompanyMetricsController from '../controllers/companyMetricsController';
import { authenticate, authorize } from '../middleware/auth';
import validateRequest from '../middleware/validator';
import { companyMetricSchema } from '../validators/companyMetricsValidator';
import { logger } from '../utils/logger';
import { USER_ROLES } from '../constants/roles';

// Rate limiting configurations
const CREATE_LIMIT = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many metric creation requests, please try again later'
};

const READ_LIMIT = {
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: 'Too many metric read requests, please try again later'
};

const UPDATE_LIMIT = {
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many metric update requests, please try again later'
};

const DELETE_LIMIT = {
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: 'Too many metric deletion requests, please try again later'
};

/**
 * Initializes company metrics routes with security middleware
 * @param controller Instance of CompanyMetricsController
 * @returns Configured Express router
 */
const initializeRoutes = (controller: CompanyMetricsController): Router => {
  const router = express.Router();

  // Apply correlation ID tracking to all routes
  router.use(correlationId());

  // Create company metric route
  router.post('/',
    rateLimit(CREATE_LIMIT),
    authenticate,
    authorize([USER_ROLES.USER, USER_ROLES.ADMIN], 'companyData', 'create'),
    validateRequest(companyMetricSchema),
    async (req, res, next) => {
      try {
        logger.info('Creating company metric', {
          userId: req.user?.id,
          correlationId: req.correlationId
        });

        const result = await controller.createMetric(req, res);
        res.status(201).json(result);
      } catch (error) {
        next(error);
      }
    }
  );

  // Get company metrics route
  router.get('/',
    rateLimit(READ_LIMIT),
    authenticate,
    authorize([USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.ANALYST], 'companyData', 'read'),
    cacheControl({ maxAge: 300 }), // 5 minutes cache
    async (req, res, next) => {
      try {
        logger.info('Retrieving company metrics', {
          userId: req.user?.id,
          correlationId: req.correlationId,
          filters: req.query
        });

        const result = await controller.getMetrics(req, res);
        res.status(200).json(result);
      } catch (error) {
        next(error);
      }
    }
  );

  // Update company metric route
  router.put('/:id',
    rateLimit(UPDATE_LIMIT),
    authenticate,
    authorize([USER_ROLES.USER, USER_ROLES.ADMIN], 'companyData', 'update'),
    validateRequest(companyMetricSchema),
    async (req, res, next) => {
      try {
        logger.info('Updating company metric', {
          userId: req.user?.id,
          correlationId: req.correlationId,
          metricId: req.params.id
        });

        const result = await controller.updateMetric(req, res);
        res.status(200).json(result);
      } catch (error) {
        next(error);
      }
    }
  );

  // Delete company metric route
  router.delete('/:id',
    rateLimit(DELETE_LIMIT),
    authenticate,
    authorize([USER_ROLES.USER, USER_ROLES.ADMIN], 'companyData', 'update'),
    async (req, res, next) => {
      try {
        logger.info('Deleting company metric', {
          userId: req.user?.id,
          correlationId: req.correlationId,
          metricId: req.params.id
        });

        await controller.deleteMetric(req, res);
        res.status(204).send();
      } catch (error) {
        next(error);
      }
    }
  );

  // Apply error handling middleware
  router.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error('Error in company metrics route', {
      error,
      correlationId: req.correlationId,
      path: req.path,
      method: req.method
    });
    next(error);
  });

  return router;
};

export default initializeRoutes;