import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../config/database';
import { IDataSource } from '../interfaces/IDataSource';

// Constants for model configuration
const MODEL_NAME = 'DataSource';
const TABLE_NAME = 'data_sources';
const URL_REGEX = /^https?:\/\/[\w\-]+(\.[\w\-]+)+[/#?]?.*$/i;

export enum DataFormat {
  JSON = 'JSON',
  CSV = 'CSV',
  XML = 'XML',
  API = 'API'
}

type DataSourceCreationAttributes = Optional<IDataSource, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Enhanced Sequelize model for managing data sources with comprehensive validation,
 * security features, and efficient querying capabilities.
 * Implements the IDataSource interface for type safety and consistency.
 */
export class DataSource extends Model<IDataSource, DataSourceCreationAttributes> {
  public id!: string;
  public name!: string;
  public description!: string;
  public url!: string;
  public lastUpdated!: Date;
  public isActive!: boolean;
  public dataFormat!: DataFormat;
  public updateFrequency!: string;
  public validationRules!: { [key: string]: any };
  public metricCategories!: string[];
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

DataSource.init(
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
    },
    url: {
      type: DataTypes.STRING(500),
      allowNull: false,
      validate: {
        is: URL_REGEX,
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
      type: DataTypes.ENUM(...Object.values(DataFormat)),
      allowNull: false,
    },
    updateFrequency: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    validationRules: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    metricCategories: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
      defaultValue: [],
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: TABLE_NAME,
    timestamps: true,
    paranoid: false,
  }
);

export default DataSource;