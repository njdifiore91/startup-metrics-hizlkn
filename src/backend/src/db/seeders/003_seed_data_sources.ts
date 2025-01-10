import { QueryInterface, Transaction } from 'sequelize';
import { IDataSource } from '../../interfaces/IDataSource';

/**
 * Default data sources for the platform's benchmark data aggregation
 * Each source includes comprehensive metadata, validation rules, and audit trails
 */
const DEFAULT_DATA_SOURCES: Omit<IDataSource, 'id'>[] = [
  {
    name: 'OpenView Partners SaaS Benchmarks',
    description: 'Annual SaaS benchmarking report from OpenView Partners with comprehensive metrics across growth stages',
    url: 'https://openviewpartners.com/saas-benchmarks',
    isActive: true,
    dataFormat: 'JSON',
    updateFrequency: 'ANNUAL',
    validationRules: {
      requiredFields: ['ARR', 'Growth_Rate', 'CAC', 'NDR'],
      valueRanges: {
        ARR: { min: 0, max: null },
        Growth_Rate: { min: -100, max: 1000 }
      }
    },
    metricCategories: ['Financial', 'Growth', 'Sales_Efficiency'],
    lastUpdated: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: 'SaaS Capital Benchmarking',
    description: 'SaaS metrics and benchmarking data from SaaS Capital with detailed operational metrics',
    url: 'https://www.saas-capital.com/benchmarking',
    isActive: true,
    dataFormat: 'CSV',
    updateFrequency: 'QUARTERLY',
    validationRules: {
      requiredFields: ['Revenue', 'Churn_Rate', 'CAC_Payback'],
      valueRanges: {
        Revenue: { min: 0, max: null },
        Churn_Rate: { min: 0, max: 100 }
      }
    },
    metricCategories: ['Financial', 'Customer_Success', 'Unit_Economics'],
    lastUpdated: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

export default {
  /**
   * Seeds the data_sources table with initial benchmark data sources
   * Implements transaction support for data consistency
   * 
   * @param queryInterface - Sequelize QueryInterface for database operations
   * @returns Promise resolving when seeding is complete
   */
  async up(queryInterface: QueryInterface): Promise<void> {
    let transaction: Transaction | undefined;
    
    try {
      // Start transaction for atomic operation
      transaction = await queryInterface.sequelize.transaction();

      // Insert data sources with transaction support
      await queryInterface.bulkInsert(
        'data_sources',
        DEFAULT_DATA_SOURCES,
        { transaction }
      );

      // Commit transaction if successful
      await transaction.commit();
    } catch (error) {
      // Rollback transaction on error
      if (transaction) {
        await transaction.rollback();
      }
      console.error('Error seeding data sources:', error);
      throw error;
    }
  },

  /**
   * Removes seeded data sources from the database
   * Implements transaction support for data consistency
   * 
   * @param queryInterface - Sequelize QueryInterface for database operations
   * @returns Promise resolving when cleanup is complete
   */
  async down(queryInterface: QueryInterface): Promise<void> {
    let transaction: Transaction | undefined;

    try {
      // Start transaction for atomic operation
      transaction = await queryInterface.sequelize.transaction();

      // Remove seeded data sources
      await queryInterface.bulkDelete(
        'data_sources',
        {
          name: DEFAULT_DATA_SOURCES.map(source => source.name)
        },
        { transaction }
      );

      // Commit transaction if successful
      await transaction.commit();
    } catch (error) {
      // Rollback transaction on error
      if (transaction) {
        await transaction.rollback();
      }
      console.error('Error removing data sources:', error);
      throw error;
    }
  }
};