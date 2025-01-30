import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { logger } from '../utils/logger';
import DataSource from '../models/DataSource';
import { AppError } from '../utils/AppError';
import { BUSINESS_ERRORS } from '../constants/errorCodes';

/**
 * Controller for managing data sources
 */
export class DataSourcesController {
  /**
   * Get all active data sources
   * @param req - Express request object
   * @param res - Express response object
   */
  getActiveSources = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const correlationId = `data-sources-${Date.now()}`;
    logger.setCorrelationId(correlationId);

    try {
      const sources = await DataSource.findAll({
        where: { isActive: true },
        attributes: ['id', 'name', 'description', 'dataFormat'],
        order: [['name', 'ASC']]
      });

      res.json(sources);
    } catch (error) {
      logger.error('Error fetching data sources:', { error });
      throw new AppError(
        'Failed to fetch data sources',
        500,
        'DATA_SOURCE_001',
        { error }
      );
    }
  });
}

// Export singleton instance
export const dataSourcesController = new DataSourcesController(); 
