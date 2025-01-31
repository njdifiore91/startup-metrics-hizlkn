const { DataTypes } = require('sequelize');

const TABLE_NAME = 'benchmark_data';

module.exports = {
  async up(queryInterface) {
    await queryInterface.createTable(TABLE_NAME, {
      // Primary identifier
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false
      },

      // Foreign key references
      metricId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'metrics',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },

      sourceId: {
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
      revenueRange: {
        type: DataTypes.ENUM(
          '0-1M',
          '1M-5M',
          '5M-20M',
          '20M-50M',
          '50M+'
        ),
        allowNull: false
      },

      // Percentile values
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
      sampleSize: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 1
        }
      },

      confidenceLevel: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        validate: {
          min: 0,
          max: 100
        }
      },

      isSeasonallyAdjusted: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },

      dataQualityScore: {
        type: DataTypes.DECIMAL(3, 2),
        allowNull: false,
        validate: {
          min: 0,
          max: 5
        }
      },

      // Temporal tracking
      reportDate: {
        type: DataTypes.DATE,
        allowNull: false
      },

      // Audit timestamps
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },

      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    });

    // Create indexes for common query patterns
    await queryInterface.addIndex(TABLE_NAME, ['metricId', 'revenueRange', 'reportDate'], {
      name: 'benchmark_metric_revenue_date_idx'
    });

    await queryInterface.addIndex(TABLE_NAME, ['sourceId'], {
      name: 'benchmark_source_idx'
    });

    await queryInterface.addIndex(TABLE_NAME, ['reportDate'], {
      name: 'benchmark_report_date_idx'
    });

    // Create index for high-quality data
    await queryInterface.sequelize.query(`
      CREATE INDEX benchmark_quality_idx ON "${TABLE_NAME}" ("dataQualityScore")
      WHERE "dataQualityScore" >= 4.0
    `);
  },

  async down(queryInterface) {
    await queryInterface.dropTable(TABLE_NAME);
  }
};