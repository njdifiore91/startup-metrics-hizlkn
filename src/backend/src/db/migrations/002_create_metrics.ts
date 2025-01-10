import { QueryInterface, DataTypes } from 'sequelize';
import { METRIC_CATEGORIES, METRIC_VALUE_TYPES } from '../../constants/metricTypes';

const TABLE_NAME = 'metrics';

/**
 * Migration to create the metrics table for storing startup performance metrics
 * Implements comprehensive schema with categories, value types, and validation rules
 * @param queryInterface - Sequelize QueryInterface for executing migrations
 * @param Sequelize - Sequelize DataTypes for column definitions
 */
export async function up(queryInterface: QueryInterface, Sequelize: typeof DataTypes): Promise<void> {
  // Enable UUID generation if not already enabled
  await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

  await queryInterface.createTable(TABLE_NAME, {
    id: {
      type: DataTypes.UUID,
      defaultValue: Sequelize.literal('uuid_generate_v4()'),
      primaryKey: true,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    category: {
      type: DataTypes.ENUM(...Object.values(METRIC_CATEGORIES)),
      allowNull: false,
      validate: {
        isIn: [Object.values(METRIC_CATEGORIES)]
      }
    },
    valueType: {
      type: DataTypes.ENUM(...Object.values(METRIC_VALUE_TYPES)),
      allowNull: false,
      validate: {
        isIn: [Object.values(METRIC_VALUE_TYPES)]
      }
    },
    validationRules: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Flexible validation rules in JSON format for metric-specific validation'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    }
  });

  // Create indexes for optimized querying
  await queryInterface.addIndex(TABLE_NAME, ['category'], {
    name: 'idx_metrics_category',
    using: 'BTREE'
  });

  await queryInterface.addIndex(TABLE_NAME, ['valueType'], {
    name: 'idx_metrics_value_type',
    using: 'BTREE'
  });

  await queryInterface.addIndex(TABLE_NAME, ['isActive'], {
    name: 'idx_metrics_is_active',
    using: 'BTREE'
  });

  // Add trigger for updating updatedAt timestamp
  await queryInterface.sequelize.query(`
    CREATE TRIGGER update_metrics_timestamp
    BEFORE UPDATE ON ${TABLE_NAME}
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();
  `);
}

/**
 * Rollback migration by dropping the metrics table and related objects
 * @param queryInterface - Sequelize QueryInterface for executing migrations
 */
export async function down(queryInterface: QueryInterface): Promise<void> {
  // Drop indexes first
  await queryInterface.removeIndex(TABLE_NAME, 'idx_metrics_category');
  await queryInterface.removeIndex(TABLE_NAME, 'idx_metrics_value_type');
  await queryInterface.removeIndex(TABLE_NAME, 'idx_metrics_is_active');

  // Drop trigger
  await queryInterface.sequelize.query(`
    DROP TRIGGER IF EXISTS update_metrics_timestamp ON ${TABLE_NAME};
  `);

  // Drop the table
  await queryInterface.dropTable(TABLE_NAME);

  // Clean up ENUM types
  await queryInterface.sequelize.query(`
    DROP TYPE IF EXISTS enum_${TABLE_NAME}_category;
    DROP TYPE IF EXISTS enum_${TABLE_NAME}_value_type;
  `);
}