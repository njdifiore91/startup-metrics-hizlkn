import { Model, DataTypes } from '../config/database';
import { ICompanyMetric } from '../interfaces/ICompanyMetric';
import { encryptValue, decryptValue } from '../utils/encryption';
import { isValidMetricValue } from '../interfaces/ICompanyMetric';
import { IMetric } from '../interfaces/IMetric';

// Constants for model configuration
const MODEL_NAME = 'CompanyMetric';
const TABLE_NAME = 'company_metrics';
const ENCRYPTION_KEY_VERSION = 1;
const VALUE_PRECISION = 20;
const VALUE_SCALE = 4;

/**
 * CompanyMetric model class with enhanced security and validation features
 * Implements secure storage of company-specific metric data with field-level encryption
 */
class CompanyMetric extends Model<ICompanyMetric> implements ICompanyMetric {
  public id!: string;
  public userId!: string;
  public metricId!: string;
  public value!: number;
  public timestamp!: Date;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt!: Date | null;

  /**
   * Initialize the CompanyMetric model with enhanced security features
   * @param sequelize - Sequelize instance
   */
  public static init(sequelize: any): typeof CompanyMetric {
    super.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        userId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id',
          },
          onDelete: 'RESTRICT',
          onUpdate: 'CASCADE',
        },
        metricId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'metrics',
            key: 'id',
          },
          onDelete: 'RESTRICT',
          onUpdate: 'CASCADE',
        },
        value: {
          type: DataTypes.DECIMAL(VALUE_PRECISION, VALUE_SCALE),
          allowNull: false,
          validate: {
            async isValidForMetric(value: number) {
              const metric = await (this as any).getMetric() as IMetric;
              if (!isValidMetricValue(value, metric)) {
                throw new Error('Invalid metric value for the specified metric type');
              }
            },
          },
          get() {
            const rawValue = this.getDataValue('value');
            return rawValue ? parseFloat(rawValue.toString()) : null;
          },
        },
        timestamp: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        isActive: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        deletedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: MODEL_NAME,
        tableName: TABLE_NAME,
        timestamps: true,
        paranoid: true, // Enable soft deletes
        indexes: [
          {
            name: 'company_metrics_user_metric_idx',
            fields: ['userId', 'metricId'],
          },
          {
            name: 'company_metrics_timestamp_idx',
            fields: ['timestamp'],
          },
        ],
        hooks: {
          // Encrypt value before saving
          beforeSave: async (instance: CompanyMetric) => {
            if (instance.changed('value')) {
              const encryptedValue = await encryptValue(
                instance.value.toString(),
                ENCRYPTION_KEY_VERSION
              );
              instance.setDataValue('value', encryptedValue);
            }
          },
          // Decrypt value after retrieval
          afterFind: async (instances: CompanyMetric | CompanyMetric[]) => {
            const decryptInstance = async (instance: CompanyMetric) => {
              if (instance.value) {
                const decryptedValue = await decryptValue(
                  instance.value.toString(),
                  ENCRYPTION_KEY_VERSION
                );
                instance.setDataValue('value', decryptedValue);
              }
            };

            if (Array.isArray(instances)) {
              await Promise.all(instances.map(decryptInstance));
            } else if (instances) {
              await decryptInstance(instances);
            }
          },
        },
      }
    );

    return CompanyMetric;
  }

  /**
   * Define model associations with enhanced loading options
   * @param models - Object containing all models
   */
  public static associate(models: any): void {
    CompanyMetric.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
    });

    CompanyMetric.belongsTo(models.Metric, {
      foreignKey: 'metricId',
      as: 'metric',
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
    });
  }
}

export default CompanyMetric;