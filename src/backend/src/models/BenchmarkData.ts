import { Model, DataTypes, Sequelize } from 'sequelize'; // v6.31.0
import { Table, Column, Index } from 'sequelize-typescript'; // v2.1.0
import { IBenchmarkData } from '../interfaces/IBenchmarkData';
import { RevenueRange } from '../types/metric';

// Model constants
const MODEL_NAME = 'BenchmarkData';
const TABLE_NAME = 'benchmark_data';
const MIN_SAMPLE_SIZE = 30;
const MIN_CONFIDENCE_LEVEL = 0.95;

/**
 * Sequelize model for storing benchmark data with comprehensive validation,
 * indexing, and security features. Implements enterprise-grade storage of
 * industry standard metrics.
 */
@Table({
  tableName: TABLE_NAME,
  timestamps: true,
  paranoid: true,
  indexes: [
    { fields: ['metric_id', 'revenue_range'], name: 'idx_benchmark_metric_revenue' },
    { fields: ['report_date'], name: 'idx_benchmark_report_date' },
    { fields: ['source_id'], name: 'idx_benchmark_source' }
  ]
})
export class BenchmarkData extends Model<IBenchmarkData> implements IBenchmarkData {
  @Column({
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  })
  id!: string;

  @Column({
    type: DataTypes.UUID,
    allowNull: false,
    field: 'metric_id',
    references: {
      model: 'metrics',
      key: 'id'
    }
  })
  metricId!: string;

  @Column({
    type: DataTypes.UUID,
    allowNull: false,
    field: 'source_id',
    references: {
      model: 'data_sources',
      key: 'id'
    }
  })
  sourceId!: string;

  @Column({
    type: DataTypes.ENUM,
    values: ['0-1M', '1M-5M', '5M-20M', '20M-50M', '50M+'],
    allowNull: false,
    field: 'revenue_range',
    validate: {
      isIn: [['0-1M', '1M-5M', '5M-20M', '20M-50M', '50M+']]
    }
  })
  revenueRange!: RevenueRange;

  @Column({
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  })
  p10!: number;

  @Column({
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  })
  p25!: number;

  @Column({
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  })
  p50!: number;

  @Column({
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  })
  p75!: number;

  @Column({
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  })
  p90!: number;

  @Column({
    type: DataTypes.DATE,
    allowNull: false,
    field: 'report_date'
  })
  reportDate!: Date;

  @Column({
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'sample_size',
    validate: {
      min: MIN_SAMPLE_SIZE
    }
  })
  sampleSize!: number;

  @Column({
    type: DataTypes.DECIMAL(4, 3),
    allowNull: false,
    field: 'confidence_level',
    validate: {
      min: MIN_CONFIDENCE_LEVEL,
      max: 1
    }
  })
  confidenceLevel!: number;

  @Column({
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_statistically_significant'
  })
  isStatisticallySignificant!: boolean;

  @Column({
    type: DataTypes.DATE,
    allowNull: false
  })
  createdAt!: Date;

  @Column({
    type: DataTypes.DATE,
    allowNull: false
  })
  updatedAt!: Date;

  @Column({
    type: DataTypes.DATE,
    allowNull: true
  })
  deletedAt!: Date | null;

  /**
   * Initializes the BenchmarkData model with Sequelize including validation and indexing
   * @param sequelize - Sequelize instance
   */
  public static init(sequelize: Sequelize): void {
    super.init(
      {
        // Model attributes are defined in the class decorators
      },
      {
        sequelize,
        modelName: MODEL_NAME,
        tableName: TABLE_NAME,
        timestamps: true,
        paranoid: true,
        hooks: {
          beforeValidate: (instance: BenchmarkData) => {
            instance.validatePercentiles();
          },
          beforeSave: (instance: BenchmarkData) => {
            instance.isStatisticallySignificant = 
              instance.sampleSize >= MIN_SAMPLE_SIZE && 
              instance.confidenceLevel >= MIN_CONFIDENCE_LEVEL;
          }
        }
      }
    );
  }

  /**
   * Validates that percentile values are in correct order and range
   * @throws Error if validation fails
   */
  private validatePercentiles(): void {
    // Ensure percentiles are in ascending order
    if (!(this.p10 <= this.p25 && 
          this.p25 <= this.p50 && 
          this.p50 <= this.p75 && 
          this.p75 <= this.p90)) {
      throw new Error('Percentile values must be in ascending order');
    }

    // Ensure all percentiles are non-negative
    const percentiles = [this.p10, this.p25, this.p50, this.p75, this.p90];
    if (percentiles.some(p => p < 0)) {
      throw new Error('Percentile values must be non-negative');
    }
  }
}