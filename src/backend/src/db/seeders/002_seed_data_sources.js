const { v4: uuidv4 } = require('uuid');

const DATA_SOURCES = [
  {
    id: uuidv4(),
    name: 'Internal Analytics',
    description: 'Data collected from internal analytics systems',
    url: 'https://analytics.internal.com',
    is_active: true,
    data_format: 'JSON',
    update_frequency: 'DAILY',
    validation_rules: JSON.stringify({
      required: ['timestamp', 'value'],
      types: {
        timestamp: 'date',
        value: 'number',
      },
    }),
    metric_categories: ['REVENUE', 'USERS'],
    last_updated: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: uuidv4(),
    name: 'Market Research',
    description: 'Third-party market research data',
    url: 'https://market-research.example.com',
    is_active: true,
    data_format: 'CSV',
    update_frequency: 'MONTHLY',
    validation_rules: JSON.stringify({
      required: ['date', 'metric', 'value'],
      types: {
        date: 'date',
        metric: 'string',
        value: 'number',
      },
    }),
    metric_categories: ['MARKET', 'COMPETITION'],
    last_updated: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: uuidv4(),
    name: 'Industry Benchmarks',
    description: 'Industry-wide benchmark data',
    url: 'https://benchmarks.example.com',
    is_active: true,
    data_format: 'JSON',
    update_frequency: 'QUARTERLY',
    validation_rules: JSON.stringify({
      required: ['industry', 'metric', 'value', 'period'],
      types: {
        industry: 'string',
        metric: 'string',
        value: 'number',
        period: 'date',
      },
    }),
    metric_categories: ['BENCHMARKS', 'INDUSTRY'],
    last_updated: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
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
