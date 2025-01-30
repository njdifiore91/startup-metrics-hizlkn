import { Model } from 'sequelize';
import DataSource from '../models/DataSource';
import { IDataSource } from '../interfaces/IDataSource';
import { logger } from '../utils/logger';

/**
 * Service class for managing data sources
 */
export class DataSourcesService {
  /**
   * Get all active data sources
   * @returns Promise<IDataSource[]>
   */
  async getActiveSources(): Promise<IDataSource[]> {
    try {
      const sources = await DataSource.findAll({
        where: { isActive: true },
        attributes: ['id', 'name', 'description', 'dataFormat'],
        order: [['name', 'ASC']]
      }) as Model<IDataSource>[];

      return sources.map(source => source.toJSON() as IDataSource);
    } catch (error) {
      logger.error('Error fetching data sources:', { error });
      throw error;
    }
  }
}

// Export singleton instance
export const dataSourcesService = new DataSourcesService(); 
