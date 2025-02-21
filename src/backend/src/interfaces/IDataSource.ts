import { DataFormat } from '../models/DataSource';

/**
 * Interface defining the structure and properties of a data source entity
 * that provides benchmark metrics. This interface ensures type safety and
 * consistent data structure for benchmark data sources across the application.
 * 
 * @interface IDataSource
 */
export interface IDataSource {
  /**
   * Unique identifier for the data source
   */
  id: string;

  /**
   * Name of the data source
   */
  name: string;

  /**
   * Detailed description of the data source
   */
  description: string;

  /**
   * URL where the data source can be accessed
   */
  url: string;

  /**
   * Timestamp of the last successful data update
   */
  lastUpdated: Date;

  /**
   * Flag indicating if the data source is currently active
   */
  isActive: boolean;

  /**
   * Format of the data provided by the source (e.g., 'JSON', 'CSV', 'API')
   */
  dataFormat: DataFormat;

  /**
   * Frequency of data updates (e.g., 'daily', 'weekly', 'monthly')
   */
  updateFrequency: string;

  /**
   * Custom validation rules for the data source
   */
  validationRules: { [key: string]: any };

  /**
   * Categories of metrics this source provides
   */
  metricCategories: string[];

  /**
   * Timestamp when the data source was created
   */
  createdAt: Date;

  /**
   * Timestamp when the data source was last modified
   */
  updatedAt: Date;
}