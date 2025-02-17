'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'revenueRange', {
      type: Sequelize.ENUM('0-1M', '1M-5M', '5M-20M', '20M-50M', '50M+'),
      allowNull: true
    });

    await queryInterface.addIndex('users', ['revenueRange'], {
      name: 'idx_users_revenue_range'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'revenueRange');
  }
}; 