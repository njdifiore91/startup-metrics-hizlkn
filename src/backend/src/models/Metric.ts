import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';
import { MetricType, ValueType, Frequency } from '../interfaces/IMetric';

export class Metric extends Model {
  public id!: string;
  public name!: string;
  public displayName!: string;
  public description!: string;
  public type!: MetricType;
  public valueType!: ValueType;
  public frequency!: Frequency;
  public unit?: string;
  public precision!: number;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Metric.init(
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
      unique: true,
    },
    displayName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'display_name',
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM(...Object.values(MetricType)),
      allowNull: false,
    },
    valueType: {
      type: DataTypes.ENUM(...Object.values(ValueType)),
      allowNull: false,
      field: 'value_type',
    },
    frequency: {
      type: DataTypes.ENUM(...Object.values(Frequency)),
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
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at',
    },
  },
  {
    sequelize,
    tableName: 'metrics',
    timestamps: true,
    underscored: true,
  }
);
