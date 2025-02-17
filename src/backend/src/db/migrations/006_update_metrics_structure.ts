import { DataTypes, QueryInterface } from 'sequelize';

const METRIC_TYPES = {
  REVENUE: 'REVENUE',
  EXPENSES: 'EXPENSES',
  PROFIT: 'PROFIT',
  USERS: 'USERS',
  GROWTH: 'GROWTH',
  CHURN: 'CHURN',
  ENGAGEMENT: 'ENGAGEMENT',
  CONVERSION: 'CONVERSION',
} as const;

const VALUE_TYPES = {
  NUMBER: 'NUMBER',
  CURRENCY: 'CURRENCY',
  PERCENTAGE: 'PERCENTAGE',
  RATIO: 'RATIO',
} as const;

const FREQUENCIES = {
  DAILY: 'DAILY',
  WEEKLY: 'WEEKLY',
  MONTHLY: 'MONTHLY',
  QUARTERLY: 'QUARTERLY',
  YEARLY: 'YEARLY',
} as const;

module.exports = {
  async up(queryInterface: QueryInterface) {
    try {
      // 1. Drop foreign key constraints if they exist
      await queryInterface.sequelize.query(`
        DO $$ 
        BEGIN 
          IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'company_metrics_metricId_fkey'
          ) THEN
            ALTER TABLE company_metrics DROP CONSTRAINT company_metrics_metricId_fkey;
          END IF;

          IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'benchmark_data_metric_id_fkey'
          ) THEN
            ALTER TABLE benchmark_data DROP CONSTRAINT benchmark_data_metric_id_fkey;
          END IF;
        END
        $$;
      `);

      // 2. Drop existing tables if they exist
      await queryInterface.sequelize.query(`
        DROP TABLE IF EXISTS company_metrics CASCADE;
        DROP TABLE IF EXISTS metrics CASCADE;
      `);

      // 3. Create ENUM types if they don't exist
      await queryInterface.sequelize.query(`
        DO $$ 
        BEGIN 
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_metrics_type') THEN
            CREATE TYPE enum_metrics_type AS ENUM (${Object.values(METRIC_TYPES)
              .map((v) => `'${v}'`)
              .join(', ')});
          END IF;

          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_metrics_value_type') THEN
            CREATE TYPE enum_metrics_value_type AS ENUM (${Object.values(VALUE_TYPES)
              .map((v) => `'${v}'`)
              .join(', ')});
          END IF;

          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_metrics_frequency') THEN
            CREATE TYPE enum_metrics_frequency AS ENUM (${Object.values(FREQUENCIES)
              .map((v) => `'${v}'`)
              .join(', ')});
          END IF;
        END
        $$;
      `);

      // 4. Create new metrics table
      await queryInterface.createTable('metrics', {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        name: {
          type: DataTypes.STRING(100),
          allowNull: false,
          unique: true,
        },
        display_name: {
          type: DataTypes.STRING(100),
          allowNull: false,
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        type: {
          type: DataTypes.ENUM(...Object.values(METRIC_TYPES)),
          allowNull: false,
        },
        value_type: {
          type: DataTypes.ENUM(...Object.values(VALUE_TYPES)),
          allowNull: false,
        },
        frequency: {
          type: DataTypes.ENUM(...Object.values(FREQUENCIES)),
          allowNull: false,
        },
        unit: {
          type: DataTypes.STRING(50),
          allowNull: true,
        },
        precision: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 2,
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

      // 5. Create indexes
      await queryInterface.addIndex('metrics', ['name'], {
        name: 'idx_metrics_name',
        unique: true,
      });

      await queryInterface.addIndex('metrics', ['type'], {
        name: 'idx_metrics_type',
      });

      await queryInterface.addIndex('metrics', ['value_type'], {
        name: 'idx_metrics_value_type',
      });

      // 6. Recreate foreign key constraint for benchmark_data
      await queryInterface.sequelize.query(`
        DO $$ 
        BEGIN 
          IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'benchmark_data') THEN
            ALTER TABLE benchmark_data
            ADD CONSTRAINT benchmark_data_metric_id_fkey 
            FOREIGN KEY (metric_id) 
            REFERENCES metrics(id)
            ON DELETE CASCADE;
          END IF;
        END
        $$;
      `);
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  },

  async down(queryInterface: QueryInterface) {
    try {
      // Drop foreign key constraint first
      await queryInterface.sequelize.query(`
        DO $$ 
        BEGIN 
          IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'benchmark_data_metric_id_fkey'
          ) THEN
            ALTER TABLE benchmark_data DROP CONSTRAINT benchmark_data_metric_id_fkey;
          END IF;
        END
        $$;
      `);

      // Drop tables
      await queryInterface.sequelize.query(`
        DROP TABLE IF EXISTS metrics CASCADE;
      `);

      // Drop ENUM types
      await queryInterface.sequelize.query(`
        DROP TYPE IF EXISTS enum_metrics_type;
        DROP TYPE IF EXISTS enum_metrics_value_type;
        DROP TYPE IF EXISTS enum_metrics_frequency;
      `);
    } catch (error) {
      console.error('Migration rollback failed:', error);
      throw error;
    }
  },
};
