const { DataTypes } = require('sequelize');

// Define user roles directly in migration for self-containment
const USER_ROLES = {
  USER: 'USER',
  ANALYST: 'ANALYST',
  ADMIN: 'ADMIN',
  SYSTEM: 'SYSTEM'
};

const TABLE_NAME = 'users';

/** @type {import('sequelize').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.createTable(TABLE_NAME, {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
          notEmpty: true
        }
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
          notEmpty: true
        }
      },
      role: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: USER_ROLES.USER
      },
      googleId: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: true
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      lastLoginAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      deletedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      tier: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'free'
      }
    });

    // Add check constraints for role and tier
    await queryInterface.sequelize.query(`
      ALTER TABLE "${TABLE_NAME}"
      ADD CONSTRAINT "users_role_check"
      CHECK (role IN ('USER', 'ANALYST', 'ADMIN', 'SYSTEM'));
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "${TABLE_NAME}"
      ADD CONSTRAINT "users_tier_check"
      CHECK (tier IN ('free', 'pro', 'enterprise'));
    `);

    // Create indexes for optimized queries
    await queryInterface.addIndex(TABLE_NAME, ['email'], {
      name: 'users_email_idx',
      unique: true
    });

    await queryInterface.addIndex(TABLE_NAME, ['googleId'], {
      name: 'users_google_id_idx',
      unique: true
    });

    await queryInterface.addIndex(TABLE_NAME, ['role'], {
      name: 'users_role_idx'
    });

    await queryInterface.addIndex(TABLE_NAME, ['isActive'], {
      name: 'users_is_active_idx'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable(TABLE_NAME);
  }
};