const { v4: uuidv4 } = require('uuid');

// Define metric types directly in seeder for self-containment
const MetricType = {
  REVENUE: 'REVENUE',
  EXPENSES: 'EXPENSES',
  PROFIT: 'PROFIT',
  USERS: 'USERS',
  GROWTH: 'GROWTH',
  CHURN: 'CHURN',
  ENGAGEMENT: 'ENGAGEMENT',
  CONVERSION: 'CONVERSION',
};

const ValueType = {
  NUMBER: 'NUMBER',
  CURRENCY: 'CURRENCY',
  PERCENTAGE: 'PERCENTAGE',
  RATIO: 'RATIO',
};

const Frequency = {
  DAILY: 'DAILY',
  WEEKLY: 'WEEKLY',
  MONTHLY: 'MONTHLY',
  QUARTERLY: 'QUARTERLY',
  YEARLY: 'YEARLY',
};

// Initial base metrics with comprehensive validation rules
const BASE_METRICS = [
  {
    id: uuidv4(),
    name: 'monthly_recurring_revenue',
    display_name: 'Monthly Recurring Revenue',
    description: 'Total revenue that a company expects to receive on a monthly basis',
    type: MetricType.REVENUE,
    value_type: ValueType.CURRENCY,
    frequency: Frequency.MONTHLY,
    unit: 'USD',
    precision: 2,
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
  },
  {
    id: uuidv4(),
    name: 'active_users',
    display_name: 'Active Users',
    description: 'Number of unique users who engaged with the product in the last 30 days',
    type: MetricType.USERS,
    value_type: ValueType.NUMBER,
    frequency: Frequency.MONTHLY,
    unit: 'Users',
    precision: 0,
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
  },
  {
    id: uuidv4(),
    name: 'customer_churn_rate',
    display_name: 'Customer Churn Rate',
    description: 'Percentage of customers who stopped using the product in the last 30 days',
    type: MetricType.CHURN,
    value_type: ValueType.PERCENTAGE,
    frequency: Frequency.MONTHLY,
    unit: '%',
    precision: 2,
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
  },
  {
    id: uuidv4(),
    name: 'customer_acquisition_cost',
    display_name: 'Customer Acquisition Cost',
    description: 'Average cost to acquire a new customer',
    type: MetricType.EXPENSES,
    value_type: ValueType.CURRENCY,
    frequency: Frequency.MONTHLY,
    unit: 'USD',
    precision: 2,
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
  },
  {
    id: uuidv4(),
    name: 'conversion_rate',
    display_name: 'Conversion Rate',
    description: 'Percentage of visitors who become customers',
    type: MetricType.CONVERSION,
    value_type: ValueType.PERCENTAGE,
    frequency: Frequency.MONTHLY,
    unit: '%',
    precision: 2,
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
  },
];

/**
 * Enterprise-grade database seeder for base metrics
 */
module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // First delete any dependent benchmark data
      await queryInterface.bulkDelete('benchmark_data', null, { transaction });

      // Then delete existing metrics
      await queryInterface.bulkDelete('metrics', null, { transaction });

      // Finally insert new metrics
      await queryInterface.bulkInsert('metrics', BASE_METRICS, { transaction });

      await transaction.commit();
      console.log(`Successfully seeded ${BASE_METRICS.length} base metrics`);
    } catch (error) {
      await transaction.rollback();
      console.error('Error seeding base metrics:', error);
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // First delete any dependent benchmark data
      await queryInterface.bulkDelete('benchmark_data', null, { transaction });

      // Then remove all base metrics with transaction support
      await queryInterface.bulkDelete(
        'metrics',
        {
          name: BASE_METRICS.map((metric) => metric.name),
        },
        { transaction }
      );

      await transaction.commit();
      console.log('Successfully reverted base metrics seeding');
    } catch (error) {
      await transaction.rollback();
      console.error('Error removing base metrics:', error);
      throw error;
    }
  },
};
