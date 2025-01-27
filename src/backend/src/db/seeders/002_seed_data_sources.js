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
        value: 'number'
      }
    }),
    lastUpdated: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
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
        value: 'number'
      }
    }),
    lastUpdated: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
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
        period: 'date'
      }
    }),
    lastUpdated: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      await queryInterface.bulkInsert('data_sources', DATA_SOURCES);
      console.log('Successfully seeded data sources');
    } catch (error) {
      console.error('Error seeding data sources:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      await queryInterface.bulkDelete('data_sources', null, {});
      console.log('Successfully reverted data sources seeding');
    } catch (error) {
      console.error('Error reverting data sources seeding:', error);
      throw error;
    }
  }
}; 