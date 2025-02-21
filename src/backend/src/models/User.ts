import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';
import { USER_ROLES } from '../constants/roles';

export interface IUser {
  id: string;
  email: string;
  googleId?: string;
  name: string;
  role: keyof typeof USER_ROLES;
  tier: 'free' | 'pro' | 'enterprise';
  revenueRange?: '0-1M' | '1M-5M' | '5M-20M' | '20M-50M' | '50M+';
  isActive: boolean;
  lastLoginAt: Date;
  createdAt: Date;
  updatedAt: Date;
  tokenVersion: number;
  isNewUser?: boolean;
  setupCompleted: boolean;
  companyName?: string;
}

class User extends Model<IUser> implements IUser {
  public id!: string;
  public email!: string;
  public googleId?: string;
  public name!: string;
  public role!: keyof typeof USER_ROLES;
  public tier!: 'free' | 'pro' | 'enterprise';
  public revenueRange?: '0-1M' | '1M-5M' | '5M-20M' | '20M-50M' | '50M+';
  public isActive!: boolean;
  public lastLoginAt!: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public tokenVersion!: number;
  public setupCompleted!: boolean;
  public companyName?: string;
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    googleId: {
      type: DataTypes.STRING,
      unique: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM(...Object.keys(USER_ROLES)),
      allowNull: false,
      defaultValue: 'USER',
    },
    tier: {
      type: DataTypes.ENUM('free', 'pro', 'enterprise'),
      allowNull: false,
      defaultValue: 'free',
    },
    revenueRange: {
      type: DataTypes.ENUM('0-1M', '1M-5M', '5M-20M', '20M-50M', '50M+'),
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    lastLoginAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    tokenVersion: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    setupCompleted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    companyName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'users',
    timestamps: true,
  }
);

export default User;