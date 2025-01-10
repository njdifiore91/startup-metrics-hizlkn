import { QueryInterface, DataTypes } from 'sequelize';
import { IBenchmarkData } from '../../interfaces/IBenchmarkData';

/**
 * Migration file to create the benchmark_data table with comprehensive data quality tracking
 * and validation mechanisms. Implements secure storage for benchmark aggregates with
 * appropriate indexing and temporal validity tracking.
 * @version 1.0.0
 */
export default {
  up: async (queryInterface: QueryInterface, Sequelize: typeof DataTypes): Promise<void> => {
    await queryInterface.createTable('benchmark_data', {
      // Primary identifier
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false
      },

      // Foreign key references
      metric_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'metrics',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },

      source_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'data_sources',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },

      // Revenue range classification
      revenue_range: {
        type: DataTypes.ENUM(
          '0-1M',
          '1M-5M',
          '5M-20M',
          '20M-50M',
          '50M+'
        ),
        allowNull: false
      },

      // Percentile values with validation constraints
      p10: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
          min: 0
        }
      },

      p25: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
          min: 0
        }
      },

      p50: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
          min: 0
        }
      },

      p75: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
          min: 0
        }
      },

      p90: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
          min: 0
        }
      },

      // Statistical and quality metrics
      sample_size: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 1
        }
      },

      confidence_level: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        validate: {
          min: 0,
          max: 100
        }
      },

      is_seasonally_adjusted: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },

      data_quality_score: {
        type: DataTypes.DECIMAL(3, 2),
        allowNull: false,
        validate: {
          min: 0,
          max: 5
        }
      },

      // Temporal tracking
      report_date: {
        type: DataTypes.DATE,
        allowNull: false
      },

      // Audit timestamps
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      },

      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      }
    });

    // Create optimized indexes for common query patterns
    await queryInterface.addIndex('benchmark_data', ['metric_id', 'revenue_range', 'report_date'], {
      name: 'idx_benchmark_metric_revenue_date',
      unique: false
    });

    await queryInterface.addIndex('benchmark_data', ['source_id'], {
      name: 'idx_benchmark_source',
      unique: false
    });

    // Partial index for high-quality benchmark data
    await queryInterface.sequelize.query(`
      CREATE INDEX idx_benchmark_quality ON benchmark_data (data_quality_score)
      WHERE data_quality_score >= 4.0
    `);

    // Index for temporal queries
    await queryInterface.addIndex('benchmark_data', ['report_date'], {
      name: 'idx_benchmark_report_date',
      unique: false
    });
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    // Drop indexes first
    await queryInterface.removeIndex('benchmark_data', 'idx_benchmark_metric_revenue_date');
    await queryInterface.removeIndex('benchmark_data', 'idx_benchmark_source');
    await queryInterface.removeIndex('benchmark_data', 'idx_benchmark_quality');
    await queryInterface.removeIndex('benchmark_data', 'idx_benchmark_report_date');

    // Drop the table
    await queryInterface.dropTable('benchmark_data');
  }
};