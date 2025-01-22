import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';

export interface IMetric {
  id: string;
  companyId: string;
  revenue: number;
  employees: number;
  customers: number;
  churnRate: number;
  growthRate: number;
  category: string;
  industry: string;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class Metric extends Model<IMetric> implements IMetric {
  public id!: string;
  public companyId!: string;
  public revenue!: number;
  public employees!: number;
  public customers!: number;
  public churnRate!: number;
  public growthRate!: number;
  public category!: string;
  public industry!: string;
  public date!: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Metric.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    companyId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    revenue: {
      type: DataTypes.DECIMAL(20, 2),
      allowNull: false,
    },
    employees: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    customers: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    churnRate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
    growthRate: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: false,
    },
    category: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    industry: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    }
  },
  {
    sequelize,
    tableName: 'metrics',
    timestamps: true,
  }
);