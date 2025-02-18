'use strict';

import { QueryInterface } from 'sequelize';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface: QueryInterface) {
    try {
      // Drop existing indexes that might cause conflicts
      const dropIndexes = [
        'data_sources_name_idx',
        'data_sources_active_idx',
        'data_sources_type_idx',
        'idx_benchmark_metric_revenue',
        'idx_benchmark_report_date',
        'idx_benchmark_source',
        'metrics_name_idx',
        'metrics_category_idx',
        'metrics_active_idx',
        'users_email_idx',
        'users_role_idx',
      ];

      for (const indexName of dropIndexes) {
        await queryInterface.sequelize
          .query(
            `
          DROP INDEX IF EXISTS ${indexName};
        `
          )
          .catch(() => {
            // Ignore error if index doesn't exist
            console.log(`Note: Index ${indexName} might not exist, skipping...`);
          });
      }
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  },

  async down(queryInterface: QueryInterface) {
    // Nothing to do in down migration since this is just cleanup
  },
};
