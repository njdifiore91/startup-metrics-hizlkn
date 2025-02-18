import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';
import { IBenchmarkData } from '../interfaces/IBenchmarkData';
import { RevenueRange } from '../constants/revenueRanges';

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
export class BenchmarkData extends Model<IBenchmarkData> {
  public id!: string;
  public metricId!: string;
  public sourceId!: string;
  public revenueRange!: RevenueRange;
  public p10!: number;
  public p25!: number;
  public p50!: number;
  public p75!: number;
  public p90!: number;
  public reportDate!: Date;
  public sampleSize!: number;
  public confidenceLevel!: number;
  public isSeasonallyAdjusted!: boolean;
  public dataQualityScore!: number;
  public isStatisticallySignificant!: boolean;
  public createdAt!: Date;
  public updatedAt!: Date;

  /**
   * Validates that percentile values are in correct order and range
   * @throws Error if validation fails
   */
  public validatePercentiles(): void {
    // Ensure percentiles are in ascending order
    if (
      !(
        this.p10 <= this.p25 &&
        this.p25 <= this.p50 &&
        this.p50 <= this.p75 &&
        this.p75 <= this.p90
      )
    ) {
      throw new Error('Percentile values must be in ascending order');
    }

    // Ensure all percentiles are non-negative
    const percentiles = [this.p10, this.p25, this.p50, this.p75, this.p90];
    if (percentiles.some((p) => p < 0)) {
      throw new Error('Percentile values must be non-negative');
    }
  }
}

BenchmarkData.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    metricId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'metric_id',
      references: {
        model: 'metrics',
        key: 'id',
      },
    },
    sourceId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'source_id',
      references: {
        model: 'data_sources',
        key: 'id',
      },
    },
    revenueRange: {
      type: DataTypes.ENUM('0-1M', '1M-5M', '5M-20M', '20M-50M', '50M+'),
      allowNull: false,
      field: 'revenue_range',
      validate: {
        isIn: [['0-1M', '1M-5M', '5M-20M', '20M-50M', '50M+']],
      },
    },
    p10: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0,
      },
    },
    p25: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0,
      },
    },
    p50: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0,
      },
    },
    p75: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0,
      },
    },
    p90: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0,
      },
    },
    reportDate: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'report_date',
    },
    sampleSize: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'sample_size',
      validate: {
        min: MIN_SAMPLE_SIZE,
      },
    },
    confidenceLevel: {
      type: DataTypes.DECIMAL(4, 3),
      allowNull: false,
      field: 'confidence_level',
      validate: {
        min: MIN_CONFIDENCE_LEVEL,
        max: 1,
      },
    },
    isStatisticallySignificant: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_statistically_significant',
    },
    isSeasonallyAdjusted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_seasonally_adjusted',
    },
    dataQualityScore: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: false,
      defaultValue: 1.0,
      field: 'data_quality_score',
      validate: {
        min: 0,
        max: 1,
      },
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'updated_at',
    },
  },
  {
    sequelize,
    modelName: MODEL_NAME,
    tableName: TABLE_NAME,
    timestamps: true,
    paranoid: true,
    underscored: true,
    hooks: {
      beforeValidate: (instance: BenchmarkData) => {
        instance.validatePercentiles();
      },
      beforeSave: (instance: BenchmarkData) => {
        instance.isStatisticallySignificant =
          instance.sampleSize >= MIN_SAMPLE_SIZE &&
          instance.confidenceLevel >= MIN_CONFIDENCE_LEVEL;
      },
    },
    indexes: [
      { fields: ['metric_id', 'revenue_range'], name: 'idx_benchmark_metric_revenue' },
      { fields: ['report_date'], name: 'idx_benchmark_report_date' },
      { fields: ['source_id'], name: 'idx_benchmark_source' },
    ],
  }
);
