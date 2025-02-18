'use strict';

import { QueryInterface } from 'sequelize';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  /**
   * @param {import('sequelize').QueryInterface} queryInterface
   */
  async up(queryInterface: QueryInterface) {
    // Check if the old column exists before trying to rename it
    const [results] = await queryInterface.sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'company_metrics' 
      AND column_name = 'isActive';
    `);
    
    if (results.length > 0) {
      await queryInterface.renameColumn('company_metrics', 'isActive', 'is_active');
    }
  },

  /**
   * @param {import('sequelize').QueryInterface} queryInterface
   */
  async down(queryInterface: QueryInterface) {
    // Check if the new column exists before trying to rename it back
    const [results] = await queryInterface.sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'company_metrics' 
      AND column_name = 'is_active';
    `);
    
    if (results.length > 0) {
      await queryInterface.renameColumn('company_metrics', 'is_active', 'isActive');
    }
  },
};
