const { v4: uuidv4 } = require('uuid');

const DATA_SOURCES = [
  {
    id: uuidv4(),
    name: 'Internal Analytics',
    description: 'Data collected from internal analytics systems',
    url: 'https://analytics.internal.com',
    isActive: true,
    dataFormat: 'JSON',
    updateFrequency: 'DAILY',
    validationRules: JSON.stringify({
      required: ['timestamp', 'value'],
      types: {
        timestamp: 'date',
        value: 'number',
      },
    }),
    metricCategories: ['REVENUE', 'USERS'],
    lastUpdated: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: uuidv4(),
    name: 'Market Research',
    description: 'Third-party market research data',
    url: 'https://market-research.example.com',
    isActive: true,
    dataFormat: 'CSV',
    updateFrequency: 'MONTHLY',
    validationRules: JSON.stringify({
      required: ['date', 'metric', 'value'],
      types: {
        date: 'date',
        metric: 'string',
        value: 'number',
      },
    }),
    metricCategories: ['MARKET', 'COMPETITION'],
    lastUpdated: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: uuidv4(),
    name: 'Industry Benchmarks',
    description: 'Industry-wide benchmark data',
    url: 'https://benchmarks.example.com',
    isActive: true,
    dataFormat: 'JSON',
    updateFrequency: 'QUARTERLY',
    validationRules: JSON.stringify({
      required: ['industry', 'metric', 'value', 'period'],
      types: {
        industry: 'string',
        metric: 'string',
        value: 'number',
        period: 'date',
      },
    }),
    metricCategories: ['BENCHMARKS', 'INDUSTRY'],
    lastUpdated: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // First delete any dependent benchmark data
      await queryInterface.bulkDelete('benchmark_data', null, { transaction });

      // Then delete existing data sources
      await queryInterface.bulkDelete('data_sources', null, { transaction });

      // Finally insert new data sources
      await queryInterface.bulkInsert('data_sources', DATA_SOURCES, { transaction });

      await transaction.commit();
      console.log('Successfully seeded data sources');
    } catch (error) {
      await transaction.rollback();
      console.error('Error seeding data sources:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // First delete any dependent benchmark data
      await queryInterface.bulkDelete('benchmark_data', null, { transaction });

      // Then delete data sources
      await queryInterface.bulkDelete('data_sources', null, { transaction });

      await transaction.commit();
      console.log('Successfully reverted data sources seeding');
    } catch (error) {
      await transaction.rollback();
      console.error('Error reverting data sources seeding:', error);
      throw error;
    }
  },
};
