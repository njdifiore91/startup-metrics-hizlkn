import { QueryInterface, DataTypes } from 'sequelize';
import { USER_ROLES } from '../../constants/roles';

/**
 * Database migration for creating the users table with comprehensive security features
 * and role-based access control integration.
 * 
 * @version 1.0.0
 * @see USER_ROLES for valid role values
 */

const TABLE_NAME = 'users';

export const up = async (queryInterface: QueryInterface): Promise<void> => {
  await queryInterface.createTable(TABLE_NAME, {
    // Primary identifier using UUID for enhanced security
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
      comment: 'Unique identifier for the user'
    },

    // Authentication and identification fields
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
        notEmpty: true
      },
      comment: 'User email address, must be unique'
    },

    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true
      },
      comment: 'User display name'
    },

    // Role-based access control
    role: {
      type: DataTypes.ENUM(
        USER_ROLES.USER,
        USER_ROLES.ANALYST,
        USER_ROLES.ADMIN,
        USER_ROLES.SYSTEM
      ),
      defaultValue: USER_ROLES.USER,
      allowNull: false,
      comment: 'User role for permission management'
    },

    // OAuth integration
    googleId: {
      type: DataTypes.STRING(100),
      allowNull: true,
      unique: true,
      comment: 'Google OAuth unique identifier'
    },

    // Account management
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
      comment: 'Flag indicating if the account is active'
    },

    // Session tracking
    lastLoginAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp of last successful login'
    },

    // Audit and tracking fields
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'Timestamp of record creation'
    },

    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'Timestamp of last record update'
    },

    // Soft deletion support
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Soft deletion timestamp'
    }
  }, {
    // Table configuration
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    comment: 'Stores user account information with security features and RBAC'
  });

  // Create indexes for optimized queries
  await queryInterface.addIndex(TABLE_NAME, ['email'], {
    name: 'users_email_idx',
    unique: true
  });

  await queryInterface.addIndex(TABLE_NAME, ['googleId'], {
    name: 'users_google_id_idx',
    unique: true,
    where: {
      googleId: {
        [DataTypes.Op.ne]: null
      }
    }
  });

  await queryInterface.addIndex(TABLE_NAME, ['role'], {
    name: 'users_role_idx'
  });

  await queryInterface.addIndex(TABLE_NAME, ['isActive'], {
    name: 'users_is_active_idx'
  });
};

export const down = async (queryInterface: QueryInterface): Promise<void> => {
  // Remove indexes first
  await queryInterface.removeIndex(TABLE_NAME, 'users_email_idx');
  await queryInterface.removeIndex(TABLE_NAME, 'users_google_id_idx');
  await queryInterface.removeIndex(TABLE_NAME, 'users_role_idx');
  await queryInterface.removeIndex(TABLE_NAME, 'users_is_active_idx');

  // Drop the table
  await queryInterface.dropTable(TABLE_NAME);
};