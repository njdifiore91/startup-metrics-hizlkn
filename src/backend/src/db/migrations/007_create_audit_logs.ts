'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Drop existing indexes if they exist
    const dropIndexes = [
      'audit_logs_user_id',
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
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      action: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      entity_type: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      entity_id: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      changes: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      timestamp: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      ip_address: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Create indexes using Sequelize's addIndex
    const createIndex = async (fields, options) => {
      try {
        await queryInterface.addIndex('audit_logs', fields, options);
      } catch (error) {
        console.error('Error creating index:', error);
        // Don't throw error, continue with other indexes
      }
    };

    // Wait for table to be fully created
    await queryInterface.sequelize.query('SELECT pg_sleep(1)');

    // Create indexes
    await createIndex(['user_id'], {
      name: 'audit_logs_user_id_idx',
    });

    await createIndex(['action'], {
      name: 'audit_logs_action_idx',
    });

    await createIndex(['entity_type', 'entity_id'], {
      name: 'audit_logs_entity_idx',
    });

    await createIndex(['timestamp'], {
      name: 'audit_logs_timestamp_idx',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('audit_logs');
  },
};
