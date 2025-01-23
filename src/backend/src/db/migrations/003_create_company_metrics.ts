// sequelize v6.31.0
const { DataTypes } = require('sequelize');

const TABLE_NAME = 'company_metrics';

module.exports = {
  async up(queryInterface) {
    await queryInterface.createTable(TABLE_NAME, {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false
      },

      // Foreign key to metrics table
      metricId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'metrics',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },

      // Company identifier
      companyId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },

      // Metric value and metadata
      value: {
        type: DataTypes.DECIMAL(20, 4),
        allowNull: false,
        validate: {
          notNull: true
        }
      },

      // Time period
      periodStart: {
        type: DataTypes.DATE,
        allowNull: false
      },

      periodEnd: {
        type: DataTypes.DATE,
        allowNull: false
      },

      // Data quality and verification
      source: {
        type: DataTypes.STRING(100),
        allowNull: false
      },

      isVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },

      verifiedBy: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        }
      },

      verifiedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },

      // Notes and context
      notes: {
        type: DataTypes.TEXT,
        allowNull: true
      },

      // Audit fields
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
      }
    });

    // Create indexes for performance
    await queryInterface.addIndex(TABLE_NAME, ['metricId'], {
      name: 'company_metrics_metric_idx'
    });

    await queryInterface.addIndex(TABLE_NAME, ['companyId'], {
      name: 'company_metrics_company_idx'
    });

    await queryInterface.addIndex(TABLE_NAME, ['periodStart', 'periodEnd'], {
      name: 'company_metrics_period_idx'
    });

    await queryInterface.addIndex(TABLE_NAME, ['isVerified'], {
      name: 'company_metrics_verified_idx'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable(TABLE_NAME);
  }
};