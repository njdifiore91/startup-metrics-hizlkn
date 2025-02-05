const { v4: uuidv4 } = require('uuid');

// Constants for revenue ranges and data quality thresholds
const REVENUE_RANGES = ['0-1M', '1M-5M', '5M-20M', '20M-50M', '50M+'];
const MIN_SAMPLE_SIZE = 100;
const MIN_CONFIDENCE_LEVEL = 0.95;
const MIN_DATA_QUALITY_SCORE = 0.9;

// Function to generate benchmark values based on metric type
function generateBenchmarkValues(metricName) {
  switch (metricName) {
    case 'monthly_recurring_revenue':
      return {
        '0-1M': { p10: 10000, p25: 15000, p50: 25000, p75: 35000, p90: 45000 },
        '1M-5M': { p10: 50000, p25: 75000, p50: 100000, p75: 150000, p90: 200000 },
        '5M-20M': { p10: 200000, p25: 300000, p50: 400000, p75: 500000, p90: 600000 },
        '20M-50M': { p10: 600000, p25: 800000, p50: 1000000, p75: 1200000, p90: 1500000 },
        '50M+': { p10: 1500000, p25: 2000000, p50: 2500000, p75: 3000000, p90: 3500000 },
      };
    case 'active_users':
      return {
        '0-1M': { p10: 100, p25: 250, p50: 500, p75: 750, p90: 1000 },
        '1M-5M': { p10: 1000, p25: 2500, p50: 5000, p75: 7500, p90: 10000 },
        '5M-20M': { p10: 10000, p25: 25000, p50: 50000, p75: 75000, p90: 100000 },
        '20M-50M': { p10: 100000, p25: 150000, p50: 200000, p75: 250000, p90: 300000 },
        '50M+': { p10: 300000, p25: 400000, p50: 500000, p75: 750000, p90: 1000000 },
      };
    case 'customer_churn_rate':
      return {
        '0-1M': { p10: 0.01, p25: 0.02, p50: 0.03, p75: 0.04, p90: 0.05 },
        '1M-5M': { p10: 0.008, p25: 0.015, p50: 0.025, p75: 0.035, p90: 0.045 },
        '5M-20M': { p10: 0.006, p25: 0.012, p50: 0.02, p75: 0.03, p90: 0.04 },
        '20M-50M': { p10: 0.004, p25: 0.01, p50: 0.015, p75: 0.025, p90: 0.035 },
        '50M+': { p10: 0.002, p25: 0.008, p50: 0.012, p75: 0.02, p90: 0.03 },
      };
    case 'customer_acquisition_cost':
      return {
        '0-1M': { p10: 50, p25: 100, p50: 200, p75: 300, p90: 400 },
        '1M-5M': { p10: 100, p25: 200, p50: 400, p75: 600, p90: 800 },
        '5M-20M': { p10: 200, p25: 400, p50: 800, p75: 1200, p90: 1600 },
        '20M-50M': { p10: 400, p25: 800, p50: 1600, p75: 2400, p90: 3200 },
        '50M+': { p10: 800, p25: 1600, p50: 3200, p75: 4800, p90: 6400 },
      };
    case 'conversion_rate':
      return {
        '0-1M': { p10: 0.01, p25: 0.02, p50: 0.03, p75: 0.04, p90: 0.05 },
        '1M-5M': { p10: 0.015, p25: 0.025, p50: 0.035, p75: 0.045, p90: 0.055 },
        '5M-20M': { p10: 0.02, p25: 0.03, p50: 0.04, p75: 0.05, p90: 0.06 },
        '20M-50M': { p10: 0.025, p25: 0.035, p50: 0.045, p75: 0.055, p90: 0.065 },
        '50M+': { p10: 0.03, p25: 0.04, p50: 0.05, p75: 0.06, p90: 0.07 },
      };
    default:
      return {
        '0-1M': { p10: 0.1, p25: 0.2, p50: 0.3, p75: 0.4, p90: 0.5 },
        '1M-5M': { p10: 0.2, p25: 0.3, p50: 0.4, p75: 0.5, p90: 0.6 },
        '5M-20M': { p10: 0.3, p25: 0.4, p50: 0.5, p75: 0.6, p90: 0.7 },
        '20M-50M': { p10: 0.4, p25: 0.5, p50: 0.6, p75: 0.7, p90: 0.8 },
        '50M+': { p10: 0.5, p25: 0.6, p50: 0.7, p75: 0.8, p90: 0.9 },
      };
  }
}

// Function to validate data quality
function validateDataQuality(data) {
  return (
    data.sample_size >= MIN_SAMPLE_SIZE &&
    data.confidence_level >= MIN_CONFIDENCE_LEVEL &&
    data.data_quality_score >= MIN_DATA_QUALITY_SCORE &&
    REVENUE_RANGES.includes(data.revenue_range)
  );
}

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // Get existing metric IDs and names
      const metrics = await queryInterface.sequelize.query(
        'SELECT id, name FROM metrics WHERE deleted_at IS NULL;',
        { type: Sequelize.QueryTypes.SELECT }
      );

      // Get existing data source IDs
      const sources = await queryInterface.sequelize.query(
        'SELECT id, name FROM data_sources WHERE "isActive" = true;',
        { type: Sequelize.QueryTypes.SELECT }
      );

      if (metrics.length === 0 || sources.length === 0) {
        throw new Error('No active metrics or data sources found');
      }

      console.log(
        'Available data sources:',
        sources.map((s) => s.name)
      );

      // Create benchmark data for each metric and revenue range
      const benchmarkData = [];
      metrics.forEach((metric) => {
        const benchmarkValues = generateBenchmarkValues(metric.name);

        // Select appropriate data source based on metric type
        let sourceId;
        switch (metric.name) {
          case 'monthly_recurring_revenue':
          case 'customer_acquisition_cost':
            // Internal Analytics for financial metrics
            sourceId = sources.find((s) => s.name === 'Internal Analytics')?.id;
            console.log(
              `Looking for Internal Analytics source for ${metric.name}, found:`,
              sourceId
            );
            break;
          case 'active_users':
          case 'conversion_rate':
            // Market Research for user metrics
            sourceId = sources.find((s) => s.name === 'Market Research')?.id;
            console.log(`Looking for Market Research source for ${metric.name}, found:`, sourceId);
            break;
          case 'customer_churn_rate':
            // Industry Benchmarks for comparative metrics
            sourceId = sources.find((s) => s.name === 'Industry Benchmarks')?.id;
            console.log(
              `Looking for Industry Benchmarks source for ${metric.name}, found:`,
              sourceId
            );
            break;
          default:
            // Fallback to first source
            sourceId = sources[0].id;
            console.log(`Using default source for ${metric.name}:`, sourceId);
        }

        if (!sourceId) {
          throw new Error(
            `No appropriate data source found for metric ${
              metric.name
            }. Available sources: ${sources.map((s) => s.name).join(', ')}`
          );
        }

        REVENUE_RANGES.forEach((range) => {
          const values = benchmarkValues[range];
          benchmarkData.push({
            id: uuidv4(),
            metric_id: metric.id,
            source_id: sourceId,
            revenue_range: range,
            p10: values.p10,
            p25: values.p25,
            p50: values.p50,
            p75: values.p75,
            p90: values.p90,
            sample_size: 200,
            confidence_level: 0.98,
            is_seasonally_adjusted: true,
            is_statistically_significant: true,
            data_quality_score: 0.95,
            report_date: new Date('2023-12-01'),
            created_at: new Date(),
            updated_at: new Date(),
          });
        });
      });

      // Validate data quality
      benchmarkData.forEach((data) => {
        if (!validateDataQuality(data)) {
          throw new Error(`Invalid benchmark data for revenue range ${data.revenue_range}`);
        }
      });

      await queryInterface.bulkInsert('benchmark_data', benchmarkData);
      console.log(`Successfully seeded ${benchmarkData.length} benchmark data entries`);
    } catch (error) {
      console.error('Error seeding benchmark data:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      await queryInterface.bulkDelete('benchmark_data', null, {});
      console.log('Successfully reverted benchmark data seeding');
    } catch (error) {
      console.error('Error reverting benchmark data seeding:', error);
      throw error;
    }
  },
};
