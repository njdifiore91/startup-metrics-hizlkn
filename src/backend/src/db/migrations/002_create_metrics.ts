import { QueryInterface, DataTypes } from 'sequelize';

// Define metric types directly in migration for self-containment
const METRIC_CATEGORIES = {
  FINANCIAL: 'FINANCIAL',
  GROWTH: 'GROWTH',
  OPERATIONAL: 'OPERATIONAL',
  SALES: 'SALES',
  MARKETING: 'MARKETING'
};

const METRIC_VALUE_TYPES = {
  NUMBER: 'NUMBER',
  PERCENTAGE: 'PERCENTAGE',
  CURRENCY: 'CURRENCY',
  RATIO: 'RATIO',
  TIME: 'TIME'
};

const TABLE_NAME = 'metrics';

module.exports = {
  async up(queryInterface: QueryInterface) {
    await queryInterface.createTable(TABLE_NAME, {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        validate: {
          notEmpty: true,
          len: [2, 100]
        }
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
          notEmpty: true
        }
      },
      category: {
        type: DataTypes.ENUM(
          METRIC_CATEGORIES.FINANCIAL,
          METRIC_CATEGORIES.GROWTH,
          METRIC_CATEGORIES.OPERATIONAL,
          METRIC_CATEGORIES.SALES,
          METRIC_CATEGORIES.MARKETING
        ),
        allowNull: false
      },
      valueType: {
        type: DataTypes.ENUM(
          METRIC_VALUE_TYPES.NUMBER,
          METRIC_VALUE_TYPES.PERCENTAGE,
          METRIC_VALUE_TYPES.CURRENCY,
          METRIC_VALUE_TYPES.RATIO,
          METRIC_VALUE_TYPES.TIME
        ),
        allowNull: false
      },
      validationRules: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {}
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
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

    // Create indexes
    await queryInterface.addIndex(TABLE_NAME, ['category'], {
      name: 'metrics_category_idx'
    });

    await queryInterface.addIndex(TABLE_NAME, ['valueType'], {
      name: 'metrics_value_type_idx'
    });

    await queryInterface.addIndex(TABLE_NAME, ['isActive'], {
      name: 'metrics_is_active_idx'
    });
  },

  async down(queryInterface: QueryInterface) {
    await queryInterface.dropTable(TABLE_NAME);
  }
};