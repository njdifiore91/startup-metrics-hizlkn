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
   * Timestamp when the data source was created
   */
  createdAt: Date;

  /**
   * Timestamp when the data source was last modified
   */
  updatedAt: Date;

  /**
   * Format of the data provided by the source (e.g., 'JSON', 'CSV', 'API')
   */
  dataFormat: string;

  /**
   * Frequency at which the data source is updated (e.g., 'daily', 'weekly', 'monthly')
   */
  updateFrequency: string;

  /**
   * Object containing validation rules for the data source
   * This can include schema validation, data type checks, and range validations
   */
  validationRules: {
    [key: string]: any;
  };

  /**
   * Array of metric categories provided by this data source
   */
  metricCategories: string[];
}