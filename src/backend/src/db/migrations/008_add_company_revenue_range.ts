'use strict';

import { QueryInterface, DataTypes } from 'sequelize';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface: QueryInterface) {
    await queryInterface.addColumn('users', 'revenueRange', {
      type: DataTypes.ENUM('0-1M', '1M-5M', '5M-20M', '20M-50M', '50M+'),
      allowNull: true
    });

    await queryInterface.addIndex('users', ['revenueRange'], {
      name: 'idx_users_revenue_range'
    });
  },

  async down(queryInterface: QueryInterface) {
    await queryInterface.removeColumn('users', 'revenueRange');
  }
}; 