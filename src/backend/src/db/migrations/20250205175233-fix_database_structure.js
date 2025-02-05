'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // Drop the benchmark_data table and recreate it
      await queryInterface.dropTable('benchmark_data', { cascade: true });

      // Create ENUM type for revenue range
      await queryInterface.sequelize.query(`
        DO $$ 
        BEGIN 
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_benchmark_data_revenue_range') THEN
            CREATE TYPE enum_benchmark_data_revenue_range AS ENUM ('0-1M', '1M-5M', '5M-20M', '20M-50M', '50M+');
          END IF;
        END
        $$;
      `);

      // Create the benchmark_data table
      await queryInterface.createTable('benchmark_data', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        metric_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'metrics',
            key: 'id',
          },
        },
        source_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'data_sources',
            key: 'id',
          },
        },
        revenue_range: {
          type: Sequelize.ENUM('0-1M', '1M-5M', '5M-20M', '20M-50M', '50M+'),
          allowNull: false,
        },
        p10: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          validate: {
            min: 0,
          },
        },
        p25: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          validate: {
            min: 0,
          },
        },
        p50: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          validate: {
            min: 0,
          },
        },
        p75: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          validate: {
            min: 0,
          },
        },
        p90: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          validate: {
            min: 0,
          },
        },
        report_date: {
          type: Sequelize.DATE,
          allowNull: false,
        },
        sample_size: {
          type: Sequelize.INTEGER,
          allowNull: false,
          validate: {
            min: 30,
          },
        },
        confidence_level: {
          type: Sequelize.DECIMAL(4, 3),
          allowNull: false,
          validate: {
            min: 0.95,
            max: 1,
          },
        },
        is_statistically_significant: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        is_seasonally_adjusted: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        data_quality_score: {
          type: Sequelize.DECIMAL(3, 2),
          allowNull: false,
          defaultValue: 1.0,
          validate: {
            min: 0,
            max: 1,
          },
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW,
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW,
        },
        deleted_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
      });

      // Create indexes
      await queryInterface.addIndex('benchmark_data', ['metric_id', 'revenue_range'], {
        name: 'idx_benchmark_metric_revenue',
        using: 'BTREE',
      });

      await queryInterface.addIndex('benchmark_data', ['report_date'], {
        name: 'idx_benchmark_report_date',
        using: 'BTREE',
      });

      await queryInterface.addIndex('benchmark_data', ['source_id'], {
        name: 'idx_benchmark_source',
        using: 'BTREE',
      });

      await queryInterface.addIndex(
        'benchmark_data',
        ['metric_id', 'revenue_range', 'report_date'],
        {
          name: 'benchmark_metric_revenue_date_idx',
          using: 'BTREE',
        }
      );
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      await queryInterface.dropTable('benchmark_data', { cascade: true });
      await queryInterface.sequelize.query(
        `DROP TYPE IF EXISTS enum_benchmark_data_revenue_range;`
      );
    } catch (error) {
      console.error('Migration rollback failed:', error);
      throw error;
    }
  },
};
