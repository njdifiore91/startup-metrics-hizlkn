'use strict';

import { QueryInterface, DataTypes } from 'sequelize';

const TABLE_NAME = 'audit_logs';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface: QueryInterface) {
    // Drop existing indexes if they exist
    const dropIndexes = [
      'audit_logs_user_id_idx',
      'audit_logs_action_idx',
      'audit_logs_entity_idx',
      'audit_logs_timestamp_idx',
    ];

    for (const indexName of dropIndexes) {
      await queryInterface.sequelize
        .query(
          `
        DROP INDEX IF EXISTS ${indexName}
      `
        )
        .catch(() => {
          // Ignore error if index doesn't exist
        });
    }

    await queryInterface.createTable('audit_logs', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      user_id: {
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
      entity_type: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      entity_id: {
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
      ip_address: {
        type: DataTypes.STRING,
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

    // Create indexes using Sequelize's addIndex
    const createIndex = async (fields: string[], name: string) => {
      try {
        await queryInterface.addIndex(TABLE_NAME, fields, { name });
      } catch (error) {
        console.error('Error creating index:', error);
        // Don't throw error, continue with other indexes
      }
    };

    // Wait for table to be fully created
    await queryInterface.sequelize.query('SELECT pg_sleep(1)');

    // Create indexes
    await createIndex(['user_id'], 'audit_logs_user_id_idx');
    await createIndex(['action'], 'audit_logs_action_idx');
    await createIndex(['entity_type', 'entity_id'], 'audit_logs_entity_idx');
    await createIndex(['timestamp'], 'audit_logs_timestamp_idx');
  },

  async down(queryInterface: QueryInterface) {
    await queryInterface.dropTable('audit_logs');
  },
};
