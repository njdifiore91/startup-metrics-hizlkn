import { Request, Response, NextFunction } from 'express';
import { ObjectSchema } from 'joi';
import { AppError } from '../utils/AppError';

interface ValidationSchema {
  query?: ObjectSchema;
  params?: ObjectSchema;
  body?: ObjectSchema;
}

/**
 * Middleware to validate request data against a Joi schema
 */
export const validateRequest = (schema: ValidationSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (schema.query) {
        const { error } = schema.query.validate(req.query, {
          abortEarly: false,
          stripUnknown: true,
        });
        if (error) {
          throw new AppError(
            `Query validation error: ${error.details.map((d) => d.message).join(', ')}`,
            400
          );
        }
      }

      if (schema.params) {
        const { error } = schema.params.validate(req.params, {
          abortEarly: false,
          stripUnknown: true,
        });
        if (error) {
          throw new AppError(
            `Params validation error: ${error.details.map((d) => d.message).join(', ')}`,
            400
          );
        }
      }

      if (schema.body) {
        const { error } = schema.body.validate(req.body, {
          abortEarly: false,
          stripUnknown: true,
        });
        if (error) {
          throw new AppError(
            `Body validation error: ${error.details.map((d) => d.message).join(', ')}`,
            400
          );
        }
      }

      next();
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
      } else {
        next(new AppError('Validation error', 400));
      }
    }
  };
};
