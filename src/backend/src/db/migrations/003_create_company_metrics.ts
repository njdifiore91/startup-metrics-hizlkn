// sequelize v6.31.0
import { QueryInterface, DataTypes } from 'sequelize';

const TABLE_NAME = 'company_metrics';

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable(TABLE_NAME, {
    // Primary key using UUID
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    
    // Foreign key to users table
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    
    // Foreign key to metrics table
    metric_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'metrics',
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    
    // Metric value with high precision
    value: {
      type: DataTypes.DECIMAL(20, 5),
      allowNull: false,
      validate: {
        min: 0,
      },
    },
    
    // Timestamp for when metric was recorded
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    
    // Soft deletion support
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    
    // Audit trail timestamps
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
    // Table configuration
    timestamps: true,
    underscored: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
  });

  // Create indexes for efficient querying
  await queryInterface.addIndex(TABLE_NAME, ['user_id'], {
    name: 'idx_company_metrics_user_id',
  });

  await queryInterface.addIndex(TABLE_NAME, ['metric_id'], {
    name: 'idx_company_metrics_metric_id',
  });

  await queryInterface.addIndex(TABLE_NAME, ['user_id', 'metric_id', 'timestamp'], {
    name: 'idx_company_metrics_user_metric_time',
  });

  // Add check constraint for non-negative values
  await queryInterface.sequelize.query(
    `ALTER TABLE ${TABLE_NAME} ADD CONSTRAINT chk_company_metrics_value_positive CHECK (value >= 0)`
  );
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  // Drop indexes first
  await queryInterface.removeIndex(TABLE_NAME, 'idx_company_metrics_user_id');
  await queryInterface.removeIndex(TABLE_NAME, 'idx_company_metrics_metric_id');
  await queryInterface.removeIndex(TABLE_NAME, 'idx_company_metrics_user_metric_time');

  // Drop check constraint
  await queryInterface.sequelize.query(
    `ALTER TABLE ${TABLE_NAME} DROP CONSTRAINT chk_company_metrics_value_positive`
  );

  // Drop the table
  await queryInterface.dropTable(TABLE_NAME);
}