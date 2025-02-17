const { DataTypes } = require('sequelize');

const TABLE_NAME = 'benchmark_data';

module.exports = {
  async up(queryInterface) {
    // Drop existing indexes if they exist
    const dropIndexes = [
      'benchmark_metric_revenue_date_idx',
      'idx_benchmark_metric_revenue',
      'idx_benchmark_report_date',
      'idx_benchmark_source',
    ];

    for (const indexName of dropIndexes) {
      await queryInterface.sequelize
        .query(
          `
        DROP INDEX IF EXISTS ${indexName}
      `
        )
        .catch(() => {
          // Ignore error if index doesn't exist
        });
    }

    // First create the ENUM type
    await queryInterface.sequelize.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_benchmark_data_revenue_range') THEN
          CREATE TYPE enum_benchmark_data_revenue_range AS ENUM ('0-1M', '1M-5M', '5M-20M', '20M-50M', '50M+');
        END IF;
      END
      $$;
    `);

    // Then create the table
    await queryInterface.createTable(TABLE_NAME, {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      metric_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'metrics',
          key: 'id',
        },
      },
      source_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'data_sources',
          key: 'id',
        },
      },
      revenue_range: {
        type: DataTypes.ENUM('0-1M', '1M-5M', '5M-20M', '20M-50M', '50M+'),
        allowNull: false,
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
      report_date: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      sample_size: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 30,
        },
      },
      confidence_level: {
        type: DataTypes.DECIMAL(4, 3),
        allowNull: false,
        validate: {
          min: 0.95,
          max: 1,
        },
      },
      is_statistically_significant: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      is_seasonally_adjusted: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      data_quality_score: {
        type: DataTypes.DECIMAL(3, 2),
        allowNull: false,
        defaultValue: 1.0,
        validate: {
          min: 0,
          max: 1,
        },
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    });

    // Create indexes using Sequelize's addIndex
    const createIndex = async (fields, options) => {
      try {
        await queryInterface.addIndex(TABLE_NAME, fields, options);
      } catch (error) {
        console.error('Error creating index:', error);
        // Don't throw error, continue with other indexes
      }
    };

    // Wait for table to be fully created
    await queryInterface.sequelize.query('SELECT pg_sleep(1)');

    // Create indexes
    await createIndex(['metric_id', 'revenue_range'], {
      name: 'idx_benchmark_metric_revenue',
      using: 'BTREE',
    });

    await createIndex(['report_date'], {
      name: 'idx_benchmark_report_date',
      using: 'BTREE',
    });

    await createIndex(['source_id'], {
      name: 'idx_benchmark_source',
      using: 'BTREE',
    });

    await createIndex(['metric_id', 'revenue_range', 'report_date'], {
      name: 'benchmark_metric_revenue_date_idx',
      using: 'BTREE',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable(TABLE_NAME);
    // Drop the ENUM type
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS enum_benchmark_data_revenue_range;
    `);
  },
};
