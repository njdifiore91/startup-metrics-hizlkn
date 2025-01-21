import sequelize, { DataTypes } from '../config/database';
import { Metric } from './Metric';
import { IMetric } from '../interfaces/IMetric';
import { METRIC_CATEGORIES, METRIC_VALUE_TYPES } from '../constants/metricTypes';

// Initialize models with Sequelize instance
Metric.init(
  {
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
      allowNull: false,
      defaultValue: {},
      validate: {
        isValidRuleSet(value: any) {
          if (!value) return;

          // Validate min/max constraints
          if (value.min !== undefined && typeof value.min !== 'number') {
            throw new Error('Validation rule min must be a number');
          }
          if (value.max !== undefined && typeof value.max !== 'number') {
            throw new Error('Validation rule max must be a number');
          }
          if (value.min !== undefined && value.max !== undefined && value.min > value.max) {
            throw new Error('Minimum value cannot be greater than maximum value');
          }

          // Validate decimals
          if (value.decimals !== undefined && (!Number.isInteger(value.decimals) || value.decimals < 0)) {
            throw new Error('Decimals must be a non-negative integer');
          }

          // Validate required flag
          if (value.required !== undefined && typeof value.required !== 'boolean') {
            throw new Error('Required flag must be a boolean');
          }

          // Validate custom validation rules
          if (value.customValidation) {
            if (!Array.isArray(value.customValidation)) {
              throw new Error('Custom validation must be an array');
            }
            value.customValidation.forEach((rule: any) => {
              if (!rule.rule || typeof rule.rule !== 'string') {
                throw new Error('Custom validation rule must be a string');
              }
              if (!rule.message || typeof rule.message !== 'string') {
                throw new Error('Custom validation message must be a string');
              }
            });
          }
        }
      }
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
  },
  {
    sequelize,
    tableName: 'metrics',
    timestamps: true,
    indexes: [
      {
        fields: ['category'],
        name: 'metrics_category_idx'
      },
      {
        fields: ['valueType'],
        name: 'metrics_value_type_idx'
      },
      {
        fields: ['isActive'],
        name: 'metrics_is_active_idx'
      }
    ]
  }
);

// Export models
export const models = {
  Metric
};

export default models; 