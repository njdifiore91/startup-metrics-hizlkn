const { DataTypes } = require('sequelize');

const TABLE_NAME = 'data_sources';

module.exports = {
  async up(queryInterface) {
    // Drop existing indexes if they exist
    const dropIndexes = [
      'data_sources_name_idx',
      'data_sources_active_idx',
      'data_sources_format_idx',
      'data_sources_frequency_idx',
      'data_sources_last_updated_idx',
      'data_sources_categories_idx',
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

    await queryInterface.createTable(TABLE_NAME, {
      // Primary identifier
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },

      // Basic source information
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: {
          notEmpty: true,
        },
      },

      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      url: {
        type: DataTypes.STRING(2048),
        allowNull: false,
        validate: {
          isUrl: true,
          notEmpty: true,
        },
      },

      // Data format and update specifications
      dataFormat: {
        type: DataTypes.ENUM('JSON', 'CSV', 'XML', 'API'),
        allowNull: false,
      },

      updateFrequency: {
        type: DataTypes.ENUM('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUALLY'),
        allowNull: false,
      },

      // Validation and categorization
      validationRules: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
      },

      metricCategories: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: false,
        defaultValue: [],
      },

      // Status tracking
      lastUpdated: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },

      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },

      // Timestamps
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },

      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    });

    // Create indexes with IF NOT EXISTS
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS data_sources_name_idx ON ${TABLE_NAME} (name);
      CREATE INDEX IF NOT EXISTS data_sources_active_idx ON ${TABLE_NAME} ("isActive");
      CREATE INDEX IF NOT EXISTS data_sources_format_idx ON ${TABLE_NAME} ("dataFormat");
      CREATE INDEX IF NOT EXISTS data_sources_frequency_idx ON ${TABLE_NAME} ("updateFrequency");
      CREATE INDEX IF NOT EXISTS data_sources_last_updated_idx ON ${TABLE_NAME} ("lastUpdated");
      CREATE INDEX IF NOT EXISTS data_sources_categories_idx ON ${TABLE_NAME} USING gin ("metricCategories");
    `);
  },

  async down(queryInterface) {
    await queryInterface.dropTable(TABLE_NAME);
  },
};
