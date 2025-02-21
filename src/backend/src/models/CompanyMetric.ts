import { Model, DataTypes } from 'sequelize';
import { ICompanyMetric } from '../interfaces/ICompanyMetric';
import sequelize from '../config/database';
import { Metric } from './Metric';

export class CompanyMetric extends Model<ICompanyMetric> {
  public id!: string;
  public companyId!: string;
  public metricId!: string;
  public value!: number;
  public date!: Date;
  public source!: string;
  public isVerified!: boolean;
  public verifiedBy?: string;
  public verifiedAt?: Date;
  public notes?: string;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly metric?: Metric;
}

CompanyMetric.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    companyId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'company_id',
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    metricId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'metric_id',
      references: {
        model: 'metrics',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    },
    value: {
      type: DataTypes.DECIMAL(20, 4),
      allowNull: false,
      get() {
        const rawValue = this.getDataValue('value');
        return rawValue === null ? 0 : Number(rawValue);
      },
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    source: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: 'manual',
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_verified',
    },
    verifiedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'verified_by',
      references: {
        model: 'users',
        key: 'id',
      },
    },
    verifiedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'verified_at',
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
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
    tableName: 'company_metrics',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['company_id', 'metric_id', 'date'],
        name: 'idx_company_metrics_lookup',
      },
      {
        fields: ['date'],
        name: 'idx_company_metrics_date',
      },
    ],
  }
);

// Define associations
CompanyMetric.belongsTo(Metric, {
  foreignKey: {
    name: 'metricId',
    field: 'metric_id',
  },
  targetKey: 'id',
  as: 'metric',
  onUpdate: 'CASCADE',
  onDelete: 'RESTRICT',
});
