import { Model, DataTypes, ModelStatic, Optional, ModelAttributes, ModelAttributeColumnOptions } from 'sequelize';
import { ICompanyMetric } from '../interfaces/ICompanyMetric';
import { encrypt, decrypt, EncryptionResult } from '../utils/encryption';
import { isValidMetricValue } from '../interfaces/ICompanyMetric';
import { IMetric } from '../interfaces/IMetric';

// Constants for model configuration
const MODEL_NAME = 'CompanyMetric';
const TABLE_NAME = 'company_metrics';
const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY || '', 'base64');
const VALUE_PRECISION = 20;
const VALUE_SCALE = 4;

// Define attributes that are optional during creation
type CompanyMetricCreationAttributes = Optional<ICompanyMetric, 'id' | 'createdAt' | 'updatedAt' | 'valueIV' | 'valueTag'>;

// Define column options type
type CompanyMetricColumnOptions = ModelAttributeColumnOptions<CompanyMetric>;

// Define model attributes type
type CompanyMetricAttributes = Required<ModelAttributes<CompanyMetric, CompanyMetricCreationAttributes>>;

/**
 * CompanyMetric model class with enhanced security and validation features
 * Implements secure storage of company-specific metric data with field-level encryption
 */
class CompanyMetric extends Model<ICompanyMetric, CompanyMetricCreationAttributes> {
  public id!: string;
  public userId!: string;
  public metricId!: string;
  public value!: number;
  public valueIV!: string;
  public valueTag!: string;
  public timestamp!: Date;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  /**
   * Initialize the CompanyMetric model with enhanced security features
   * @param sequelize - Sequelize instance
   */
  public static initialize(sequelize: any): void {
    const attributes: CompanyMetricAttributes = {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      } as CompanyMetricColumnOptions,
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      } as CompanyMetricColumnOptions,
      metricId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'metrics',
          key: 'id',
        },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      } as CompanyMetricColumnOptions,
      value: {
        type: DataTypes.DECIMAL(VALUE_PRECISION, VALUE_SCALE),
        allowNull: false,
        get() {
          const rawValue = this.getDataValue('value');
          return rawValue === null ? 0 : Number(rawValue);
        },
        set(val: unknown) {
          if (val === null || val === undefined) {
            this.setDataValue('value', 0);
          } else {
            this.setDataValue('value', Number(val));
          }
        },
      } as CompanyMetricColumnOptions,
      valueIV: {
        type: DataTypes.TEXT,
        allowNull: true,
      } as CompanyMetricColumnOptions,
      valueTag: {
        type: DataTypes.TEXT,
        allowNull: true,
      } as CompanyMetricColumnOptions,
      timestamp: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      } as CompanyMetricColumnOptions,
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      } as CompanyMetricColumnOptions,
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
      } as CompanyMetricColumnOptions,
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
      } as CompanyMetricColumnOptions
    };

    super.init(attributes, {
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
            const value = instance.getDataValue('value');
            const valueStr = value.toString();
            const result = await encrypt(valueStr, ENCRYPTION_KEY);
            instance.setDataValue('value', Number(result.encryptedData));
            instance.setDataValue('valueIV', result.iv);
            instance.setDataValue('valueTag', result.tag);
          }
        },
        // Decrypt value after retrieval
        afterFind: async (instances: CompanyMetric | CompanyMetric[]) => {
          const decryptInstance = async (instance: CompanyMetric) => {
            const encryptedValue = instance.getDataValue('value');
            const iv = instance.getDataValue('valueIV');
            const tag = instance.getDataValue('valueTag');
            
            if (encryptedValue !== null && iv && tag) {
              const decryptedValue = await decrypt(
                encryptedValue.toString(),
                ENCRYPTION_KEY,
                iv.toString(),
                tag.toString()
              );
              instance.setDataValue('value', Number(decryptedValue));
            }
          };

          if (Array.isArray(instances)) {
            await Promise.all(instances.map(decryptInstance));
          } else if (instances) {
            await decryptInstance(instances);
          }
        },
      },
    });
  }

  /**
   * Define model associations with enhanced loading options
   * @param models - Object containing all models
   */
  public static associate(models: { [key: string]: ModelStatic<Model> }): void {
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