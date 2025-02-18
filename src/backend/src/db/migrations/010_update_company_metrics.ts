'use strict';

import { QueryInterface, DataTypes } from 'sequelize';

const TABLE_NAME = 'company_metrics';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface: QueryInterface) {
    try {
      // Drop existing table
      await queryInterface.dropTable(TABLE_NAME);

      // Create table with all columns
      await queryInterface.createTable(TABLE_NAME, {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        metric_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'metrics',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        company_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        value: {
          type: DataTypes.DECIMAL(20, 4),
          allowNull: false,
        },
        date: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        source: {
          type: DataTypes.STRING(100),
          allowNull: false,
          defaultValue: 'manual',
        },
        is_verified: {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
          allowNull: false,
        },
        verified_by: {
          type: DataTypes.UUID,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id',
          },
        },
        verified_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        notes: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        is_active: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        created_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        updated_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      });

      // Add indexes
      await queryInterface.addIndex(TABLE_NAME, ['company_id']);
      await queryInterface.addIndex(TABLE_NAME, ['metric_id']);
      await queryInterface.addIndex(TABLE_NAME, ['date']);
      await queryInterface.addIndex(TABLE_NAME, ['is_active']);
      await queryInterface.addIndex(TABLE_NAME, ['company_id', 'metric_id', 'date'], {
        unique: true,
        name: 'unique_company_metric_date',
      });
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  },

  async down(queryInterface: QueryInterface) {
    try {
      await queryInterface.dropTable(TABLE_NAME);

      // Recreate the table with the original structure
      await queryInterface.createTable(TABLE_NAME, {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        metric_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'metrics',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        company_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        value: {
          type: DataTypes.DECIMAL(20, 4),
          allowNull: false,
        },
        period_start: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        period_end: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        source: {
          type: DataTypes.STRING(100),
          allowNull: false,
        },
        is_verified: {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
          allowNull: false,
        },
        verified_by: {
          type: DataTypes.UUID,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id',
          },
        },
        verified_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        notes: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        created_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        updated_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      });

      // Add back original indexes
      await queryInterface.addIndex(TABLE_NAME, ['metric_id'], {
        name: 'company_metrics_metric_idx',
      });
      await queryInterface.addIndex(TABLE_NAME, ['company_id'], {
        name: 'company_metrics_company_idx',
      });
      await queryInterface.addIndex(TABLE_NAME, ['period_start', 'period_end'], {
        name: 'company_metrics_period_idx',
      });
      await queryInterface.addIndex(TABLE_NAME, ['is_verified'], {
        name: 'company_metrics_verified_idx',
      });
    } catch (error) {
      console.error('Migration rollback failed:', error);
      throw error;
    }
  },
};
