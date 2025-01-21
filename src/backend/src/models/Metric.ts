import { Model, DataTypes } from 'sequelize';
import { IMetric } from '../interfaces/IMetric';
import { METRIC_CATEGORIES, METRIC_VALUE_TYPES } from '../constants/metricTypes';

/**
 * Sequelize model class for the Metric entity.
 * Implements comprehensive validation and associations for startup performance metrics.
 * @extends Model<IMetric>
 */
export class Metric extends Model<IMetric> {
  declare id: string;
  declare name: string;
  declare description: string;
  declare category: typeof METRIC_CATEGORIES[keyof typeof METRIC_CATEGORIES];
  declare valueType: typeof METRIC_VALUE_TYPES[keyof typeof METRIC_VALUE_TYPES];
  declare validationRules: object;
  declare isActive: boolean;
  declare createdAt: Date;
  declare updatedAt: Date;

  /**
   * Define model associations with related entities
   * @param models - Object containing all model definitions
   */
  static associate(models: any): void {
    // Associate with BenchmarkData - one metric can have many benchmark data points
    Metric.hasMany(models.BenchmarkData, {
      foreignKey: {
        name: 'metricId',
        allowNull: false
      },
      onDelete: 'CASCADE',
      as: 'benchmarkData'
    });

    // Associate with CompanyMetric - one metric can have many company-specific values
    Metric.hasMany(models.CompanyMetric, {
      foreignKey: {
        name: 'metricId',
        allowNull: false
      },
      onDelete: 'CASCADE',
      as: 'companyMetrics'
    });
  }
}