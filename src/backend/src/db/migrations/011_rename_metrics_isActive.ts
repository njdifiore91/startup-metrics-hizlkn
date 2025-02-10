'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  /**
   * @param {import('sequelize').QueryInterface} queryInterface
   */
  async up(queryInterface) {
    await queryInterface.renameColumn('company_metrics', 'isActive', 'is_active');
  },

  /**
   * @param {import('sequelize').QueryInterface} queryInterface
   */
  async down(queryInterface) {
    await queryInterface.renameColumn('company_metrics', 'is_active', 'isActive');
  },
};
