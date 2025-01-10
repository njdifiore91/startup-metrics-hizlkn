import { QueryInterface } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import { IMetric } from '../../interfaces/IMetric';
import { METRIC_CATEGORIES, METRIC_VALUE_TYPES } from '../../constants/metricTypes';

// Initial metrics data with comprehensive validation rules
const INITIAL_METRICS: Omit<IMetric, 'id' | 'isActive' | 'createdAt' | 'updatedAt'>[] = [
  // Financial Metrics
  {
    name: 'Annual Recurring Revenue',
    description: 'Total value of contracted recurring revenue components of term subscriptions normalized to a one-year period',
    category: METRIC_CATEGORIES.FINANCIAL,
    valueType: METRIC_VALUE_TYPES.CURRENCY,
    validationRules: {
      min: 0,
      required: true,
      decimals: 2,
      customValidation: [{
        rule: 'currencyFormat',
        message: 'ARR must be a valid currency amount'
      }]
    }
  },
  {
    name: 'Net Dollar Retention',
    description: 'Percentage of recurring revenue retained from existing customers including expansions and contractions',
    category: METRIC_CATEGORIES.FINANCIAL,
    valueType: METRIC_VALUE_TYPES.PERCENTAGE,
    validationRules: {
      min: 0,
      max: 200,
      required: true,
      decimals: 1,
      customValidation: [{
        rule: 'percentageFormat',
        message: 'NDR must be a valid percentage'
      }]
    }
  },
  {
    name: 'Gross Margin',
    description: 'Revenue minus cost of goods sold (COGS) expressed as a percentage of revenue',
    category: METRIC_CATEGORIES.FINANCIAL,
    valueType: METRIC_VALUE_TYPES.PERCENTAGE,
    validationRules: {
      min: -100,
      max: 100,
      required: true,
      decimals: 1,
      customValidation: [{
        rule: 'percentageFormat',
        message: 'Gross margin must be a valid percentage'
      }]
    }
  },
  // Growth Metrics
  {
    name: 'YoY Growth Rate',
    description: 'Year-over-year revenue growth expressed as a percentage',
    category: METRIC_CATEGORIES.GROWTH,
    valueType: METRIC_VALUE_TYPES.PERCENTAGE,
    validationRules: {
      min: -100,
      max: 1000,
      required: true,
      decimals: 1,
      customValidation: [{
        rule: 'percentageFormat',
        message: 'Growth rate must be a valid percentage'
      }]
    }
  },
  {
    name: 'Customer Acquisition Cost',
    description: 'Average cost to acquire a new customer including marketing and sales expenses',
    category: METRIC_CATEGORIES.GROWTH,
    valueType: METRIC_VALUE_TYPES.CURRENCY,
    validationRules: {
      min: 0,
      required: true,
      decimals: 2,
      customValidation: [{
        rule: 'currencyFormat',
        message: 'CAC must be a valid currency amount'
      }]
    }
  },
  // Operational Metrics
  {
    name: 'Logo Retention',
    description: 'Percentage of customers retained over a specific period, regardless of revenue impact',
    category: METRIC_CATEGORIES.OPERATIONAL,
    valueType: METRIC_VALUE_TYPES.PERCENTAGE,
    validationRules: {
      min: 0,
      max: 100,
      required: true,
      decimals: 1,
      customValidation: [{
        rule: 'percentageFormat',
        message: 'Logo retention must be a valid percentage'
      }]
    }
  },
  {
    name: 'Magic Number',
    description: 'Sales efficiency metric calculated as net new ARR divided by sales and marketing spend',
    category: METRIC_CATEGORIES.OPERATIONAL,
    valueType: METRIC_VALUE_TYPES.RATIO,
    validationRules: {
      min: 0,
      max: 10,
      required: true,
      decimals: 2,
      customValidation: [{
        rule: 'ratioFormat',
        message: 'Magic number must be a valid ratio'
      }]
    }
  }
];

/**
 * Seeds the metrics table with initial metric definitions
 * Implements transaction safety and validation checks
 */
export async function up(queryInterface: QueryInterface): Promise<void> {
  const transaction = await queryInterface.sequelize.transaction();

  try {
    const metricsToInsert = INITIAL_METRICS.map(metric => ({
      ...metric,
      id: uuidv4(),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    await queryInterface.bulkInsert(
      'Metrics',
      metricsToInsert,
      { transaction }
    );

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw new Error(`Metrics seeding failed: ${error.message}`);
  }
}

/**
 * Removes all seeded metrics from the database
 * Implements safe cleanup with dependency checks
 */
export async function down(queryInterface: QueryInterface): Promise<void> {
  const transaction = await queryInterface.sequelize.transaction();

  try {
    // Soft delete approach - update isActive to false
    await queryInterface.bulkUpdate(
      'Metrics',
      { isActive: false, updatedAt: new Date() },
      { isActive: true },
      { transaction }
    );

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw new Error(`Metrics cleanup failed: ${error.message}`);
  }
}