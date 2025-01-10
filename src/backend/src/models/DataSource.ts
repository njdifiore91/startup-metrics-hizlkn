import { Model, DataTypes, Sequelize } from 'sequelize'; // v6.31.0
import { IDataSource } from '../interfaces/IDataSource';

// Constants for model configuration
const MODEL_NAME = 'DataSource';
const TABLE_NAME = 'data_sources';
const URL_REGEX = /^https?:\/\/[\w\-]+(\.[\w\-]+)+[/#?]?.*$/i;

/**
 * Enhanced Sequelize model for managing data sources with comprehensive validation,
 * security features, and efficient querying capabilities.
 * Implements the IDataSource interface for type safety and consistency.
 */
class DataSource extends Model implements IDataSource {
  public id!: string;
  public name!: string;
  public description!: string;
  public url!: string;
  public lastUpdated!: Date;
  public isActive!: boolean;
  public dataFormat!: string;
  public updateFrequency!: string;
  public validationRules!: { [key: string]: any };
  public metricCategories!: string[];
  public createdAt!: Date;
  public updatedAt!: Date;
  public deletedAt!: Date | null;

  /**
   * Initializes the DataSource model with enhanced configuration
   * @param sequelize - Sequelize instance
   */
  public static init(sequelize: Sequelize): void {
    super.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        name: {
          type: DataTypes.STRING(100),
          allowNull: false,
          validate: {
            notEmpty: true,
            len: [2, 100],
          },
          unique: true,
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: false,
          validate: {
            notEmpty: true,
            len: [10, 2000],
          },
        },
        url: {
          type: DataTypes.STRING(500),
          allowNull: false,
          validate: {
            notEmpty: true,
            is: URL_REGEX,
            len: [5, 500],
          },
        },
        lastUpdated: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        isActive: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        dataFormat: {
          type: DataTypes.STRING(20),
          allowNull: false,
          validate: {
            isIn: [['JSON', 'CSV', 'API', 'XML']],
          },
        },
        updateFrequency: {
          type: DataTypes.STRING(20),
          allowNull: false,
          validate: {
            isIn: [['daily', 'weekly', 'monthly', 'quarterly', 'annually']],
          },
        },
        validationRules: {
          type: DataTypes.JSONB,
          allowNull: false,
          defaultValue: {},
          validate: {
            isValidJSON(value: any) {
              try {
                if (typeof value === 'string') {
                  JSON.parse(value);
                }
              } catch (error) {
                throw new Error('Invalid JSON format for validationRules');
              }
            },
          },
        },
        metricCategories: {
          type: DataTypes.ARRAY(DataTypes.STRING),
          allowNull: false,
          defaultValue: [],
          validate: {
            isValidCategories(value: string[]) {
              if (!Array.isArray(value) || value.length === 0) {
                throw new Error('At least one metric category is required');
              }
              const validCategories = [
                'financial',
                'growth',
                'operational',
                'sales',
                'marketing',
              ];
              if (!value.every(category => validCategories.includes(category.toLowerCase()))) {
                throw new Error('Invalid metric category detected');
              }
            },
          },
        },
      },
      {
        sequelize,
        modelName: MODEL_NAME,
        tableName: TABLE_NAME,
        timestamps: true,
        paranoid: true, // Enables soft deletes
        indexes: [
          { fields: ['name'], unique: true },
          { fields: ['isActive'] },
          { fields: ['dataFormat'] },
          { fields: ['updateFrequency'] },
          { fields: ['lastUpdated'] },
        ],
        hooks: {
          beforeValidate: (instance: DataSource) => {
            // Sanitize URL to prevent XSS
            if (instance.url) {
              instance.url = instance.url.trim().toLowerCase();
            }
            // Ensure metric categories are lowercase for consistency
            if (instance.metricCategories) {
              instance.metricCategories = instance.metricCategories.map(category => 
                category.toLowerCase().trim()
              );
            }
          },
          beforeSave: (instance: DataSource) => {
            // Update lastUpdated timestamp on save
            instance.lastUpdated = new Date();
          },
        },
      }
    );
  }

  /**
   * Sets up enhanced model associations with related models
   * @param models - Object containing all models
   */
  public static associate(models: any): void {
    DataSource.hasMany(models.BenchmarkData, {
      foreignKey: {
        name: 'dataSourceId',
        allowNull: false,
      },
      as: 'benchmarkData',
      onDelete: 'CASCADE',
      hooks: true,
    });
  }
}

export default DataSource;