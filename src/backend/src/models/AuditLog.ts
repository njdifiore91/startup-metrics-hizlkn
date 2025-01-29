import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../config/database';
import User, { IUser } from './User';

interface AuditLogAttributes {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  changes?: Record<string, any>;
  timestamp: Date;
  ipAddress?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface AuditLogCreationAttributes
  extends Optional<AuditLogAttributes, 'id' | 'timestamp' | 'createdAt' | 'updatedAt'> {}

class AuditLog
  extends Model<AuditLogAttributes, AuditLogCreationAttributes>
  implements AuditLogAttributes
{
  public id!: string;
  public userId!: string;
  public action!: string;
  public entityType!: string;
  public entityId!: string;
  public changes!: Record<string, any>;
  public timestamp!: Date;
  public ipAddress!: string;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Define association with User
  public readonly user?: User;
}

AuditLog.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    action: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    entityType: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    entityId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    changes: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    ipAddress: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'audit_logs',
    indexes: [
      {
        fields: ['userId'],
      },
      {
        fields: ['action'],
      },
      {
        fields: ['entityType'],
      },
      {
        fields: ['timestamp'],
      },
    ],
  }
);

// Define association with User model
AuditLog.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

export { AuditLog };
export type { AuditLogAttributes, AuditLogCreationAttributes };
