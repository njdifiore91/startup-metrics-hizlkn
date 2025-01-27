const { DataTypes } = require('sequelize');

const METRIC_TYPES = {
  REVENUE: 'REVENUE',
  EXPENSES: 'EXPENSES',
  PROFIT: 'PROFIT',
  USERS: 'USERS',
  GROWTH: 'GROWTH',
  CHURN: 'CHURN',
  ENGAGEMENT: 'ENGAGEMENT',
  CONVERSION: 'CONVERSION'
};

const VALUE_TYPES = {
  NUMBER: 'NUMBER',
  CURRENCY: 'CURRENCY',
  PERCENTAGE: 'PERCENTAGE',
  RATIO: 'RATIO'
};

const FREQUENCIES = {
  DAILY: 'DAILY',
  WEEKLY: 'WEEKLY',
  MONTHLY: 'MONTHLY',
  QUARTERLY: 'QUARTERLY',
  YEARLY: 'YEARLY'
};

module.exports = {
  async up(queryInterface) {
    // 1. Drop foreign key constraints first
    await queryInterface.removeConstraint('company_metrics', 'company_metrics_metricId_fkey');
    await queryInterface.removeConstraint('benchmark_data', 'benchmark_data_metricId_fkey');

    // 2. Drop existing tables
    await queryInterface.dropTable('company_metrics');
    await queryInterface.dropTable('metrics');

    // 3. Create new metrics table
    await queryInterface.createTable('metrics', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true
      },
      displayName: {
        type: DataTypes.STRING(100),
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      type: {
        type: DataTypes.ENUM(...Object.values(METRIC_TYPES)),
        allowNull: false
      },
      valueType: {
        type: DataTypes.ENUM(...Object.values(VALUE_TYPES)),
        allowNull: false
      },
      frequency: {
        type: DataTypes.ENUM(...Object.values(FREQUENCIES)),
        allowNull: false
      },
      unit: {
        type: DataTypes.STRING(50),
        allowNull: true
      },
      precision: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 2
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

    // 4. Create new company_metrics table
    await queryInterface.createTable('company_metrics', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      companyId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
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
      value: {
        type: DataTypes.DECIMAL(20, 4),
        allowNull: false
      },
      date: {
        type: DataTypes.DATEONLY,
        allowNull: false
      },
      source: {
        type: DataTypes.STRING(100),
        allowNull: false,
        defaultValue: 'manual'
      },
      isVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      verifiedBy: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      verifiedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true
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

    // 5. Add indexes for better performance
    await queryInterface.addIndex('metrics', ['type', 'valueType'], {
      name: 'idx_metrics_type_value_type'
    });

    await queryInterface.addIndex('company_metrics', ['companyId', 'metricId', 'date'], {
      name: 'idx_company_metrics_lookup'
    });

    await queryInterface.addIndex('company_metrics', ['date'], {
      name: 'idx_company_metrics_date'
    });
  },

  async down(queryInterface) {
    // Drop in reverse order
    await queryInterface.dropTable('company_metrics');
    await queryInterface.dropTable('metrics');
  }
}; 