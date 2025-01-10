import { QueryInterface, DataTypes } from 'sequelize';
import { IDataSource } from '../../interfaces/IDataSource';

/**
 * Migration file to create the data_sources table for managing benchmark data providers
 * with comprehensive metadata including data format, update frequency, and validation rules.
 */
export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.createTable<IDataSource>('data_sources', {
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
      data_format: {
        type: DataTypes.STRING(50),
        allowNull: false,
        validate: {
          isIn: [['JSON', 'CSV', 'XML', 'API']],
        },
      },
      update_frequency: {
        type: DataTypes.STRING(50),
        allowNull: false,
        validate: {
          isIn: [['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUALLY']],
        },
      },

      // Validation and categorization
      validation_rules: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      metric_categories: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: false,
        defaultValue: [],
      },

      // Status tracking
      last_updated: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },

      // Timestamps
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
    }, {
      timestamps: true,
      indexes: [
        // Optimize lookups by name
        {
          name: 'idx_data_sources_name',
          unique: true,
          fields: ['name'],
        },
        // Filter by active status
        {
          name: 'idx_data_sources_is_active',
          fields: ['is_active'],
        },
        // Filter by data format
        {
          name: 'idx_data_sources_data_format',
          fields: ['data_format'],
        },
        // Filter by update frequency
        {
          name: 'idx_data_sources_update_frequency',
          fields: ['update_frequency'],
        },
        // Optimize last updated queries
        {
          name: 'idx_data_sources_last_updated',
          fields: ['last_updated'],
        },
        // GiST index for array operations on metric categories
        {
          name: 'idx_data_sources_metric_categories',
          fields: ['metric_categories'],
          using: 'gin',
        },
      ],
    });

    // Add comment to table for documentation
    await queryInterface.sequelize.query(`
      COMMENT ON TABLE data_sources IS 'Stores metadata and configuration for benchmark data providers including validation rules and update frequencies'
    `);
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    // Drop indexes first
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_data_sources_name;
      DROP INDEX IF EXISTS idx_data_sources_is_active;
      DROP INDEX IF EXISTS idx_data_sources_data_format;
      DROP INDEX IF EXISTS idx_data_sources_update_frequency;
      DROP INDEX IF EXISTS idx_data_sources_last_updated;
      DROP INDEX IF EXISTS idx_data_sources_metric_categories;
    `);

    // Drop the table
    await queryInterface.dropTable('data_sources');
  },
};