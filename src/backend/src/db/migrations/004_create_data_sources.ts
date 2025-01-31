const { DataTypes } = require('sequelize');

const TABLE_NAME = 'data_sources';

module.exports = {
  async up(queryInterface) {
    await queryInterface.createTable(TABLE_NAME, {
      // Primary identifier
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false
      },

      // Basic source information
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: {
          notEmpty: true
        }
      },

      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },

      url: {
        type: DataTypes.STRING(2048),
        allowNull: false,
        validate: {
          isUrl: true,
          notEmpty: true
        }
      },

      // Data format and update specifications
      dataFormat: {
        type: DataTypes.ENUM(
          'JSON',
          'CSV',
          'XML',
          'API'
        ),
        allowNull: false
      },

      updateFrequency: {
        type: DataTypes.ENUM(
          'DAILY',
          'WEEKLY',
          'MONTHLY',
          'QUARTERLY',
          'ANNUALLY'
        ),
        allowNull: false
      },

      // Validation and categorization
      validationRules: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {}
      },

      metricCategories: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: false,
        defaultValue: []
      },

      // Status tracking
      lastUpdated: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },

      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },

      // Timestamps
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },

      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    });

    // Create indexes
    await queryInterface.addIndex(TABLE_NAME, ['name'], {
      name: 'data_sources_name_idx',
      unique: true
    });

    await queryInterface.addIndex(TABLE_NAME, ['isActive'], {
      name: 'data_sources_active_idx'
    });

    await queryInterface.addIndex(TABLE_NAME, ['dataFormat'], {
      name: 'data_sources_format_idx'
    });

    await queryInterface.addIndex(TABLE_NAME, ['updateFrequency'], {
      name: 'data_sources_frequency_idx'
    });

    await queryInterface.addIndex(TABLE_NAME, ['lastUpdated'], {
      name: 'data_sources_last_updated_idx'
    });

    // GiST index for array operations on metric categories
    await queryInterface.sequelize.query(`
      CREATE INDEX data_sources_categories_idx ON ${TABLE_NAME} USING gin ("metricCategories")
    `);
  },

  async down(queryInterface) {
    await queryInterface.dropTable(TABLE_NAME);
  }
};