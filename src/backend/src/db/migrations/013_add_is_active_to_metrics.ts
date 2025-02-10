const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    await queryInterface.addColumn('metrics', 'is_active', {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });

    // Add index for better query performance
    await queryInterface.addIndex('metrics', ['is_active'], {
      name: 'idx_metrics_is_active',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('metrics', 'idx_metrics_is_active');
    await queryInterface.removeColumn('metrics', 'is_active');
  },
};
