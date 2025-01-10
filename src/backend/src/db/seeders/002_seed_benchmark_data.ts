import { QueryInterface } from 'sequelize';
import { v4 as uuidv4 } from 'uuid'; // v9.0.0
import { IBenchmarkData } from '../../interfaces/IBenchmarkData';
import { METRIC_CATEGORIES } from '../../constants/metricTypes';

// Revenue ranges supported by the platform
const REVENUE_RANGES = ['0-1M', '1M-5M', '5M-20M', '20M-50M', '50M+'] as const;

// Data quality thresholds for statistical validation
const DATA_QUALITY_THRESHOLDS = {
  MIN_SAMPLE_SIZE: 30,
  MIN_CONFIDENCE_LEVEL: 0.95,
  MIN_QUALITY_SCORE: 0.8,
} as const;

// Initial benchmark data with comprehensive statistical validation
const INITIAL_BENCHMARK_DATA: Partial<IBenchmarkData>[] = [
  // Financial Metrics
  {
    metricId: uuidv4(),
    sourceId: uuidv4(),
    revenueRange: '0-1M',
    p10: 0.10,
    p25: 0.15,
    p50: 0.20,
    p75: 0.25,
    p90: 0.30,
    sampleSize: 150,
    confidenceLevel: 0.98,
    isSeasonallyAdjusted: true,
    dataQualityScore: 0.95,
    reportDate: new Date('2023-12-01'),
  },
  // Growth Metrics
  {
    metricId: uuidv4(),
    sourceId: uuidv4(),
    revenueRange: '1M-5M',
    p10: 0.40,
    p25: 0.55,
    p50: 0.70,
    p75: 0.85,
    p90: 1.00,
    sampleSize: 200,
    confidenceLevel: 0.99,
    isSeasonallyAdjusted: true,
    dataQualityScore: 0.97,
    reportDate: new Date('2023-12-01'),
  },
  // Operational Metrics
  {
    metricId: uuidv4(),
    sourceId: uuidv4(),
    revenueRange: '5M-20M',
    p10: 0.15,
    p25: 0.25,
    p50: 0.35,
    p75: 0.45,
    p90: 0.55,
    sampleSize: 175,
    confidenceLevel: 0.97,
    isSeasonallyAdjusted: true,
    dataQualityScore: 0.93,
    reportDate: new Date('2023-12-01'),
  },
];

/**
 * Validates the statistical significance and data quality of benchmark data
 * @param data Benchmark data to validate
 * @returns boolean indicating if data meets quality thresholds
 */
const validateDataQuality = (data: Partial<IBenchmarkData>): boolean => {
  return (
    (data.sampleSize ?? 0) >= DATA_QUALITY_THRESHOLDS.MIN_SAMPLE_SIZE &&
    (data.confidenceLevel ?? 0) >= DATA_QUALITY_THRESHOLDS.MIN_CONFIDENCE_LEVEL &&
    (data.dataQualityScore ?? 0) >= DATA_QUALITY_THRESHOLDS.MIN_QUALITY_SCORE
  );
};

/**
 * Enterprise-grade database seeder for benchmark data with comprehensive validation
 */
export default {
  async up(queryInterface: QueryInterface): Promise<void> {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Validate all benchmark data before insertion
      const validData = INITIAL_BENCHMARK_DATA.filter(validateDataQuality);

      if (validData.length !== INITIAL_BENCHMARK_DATA.length) {
        throw new Error('Some benchmark data failed quality validation');
      }

      // Prepare benchmark data with audit fields
      const benchmarkData = validData.map(data => ({
        id: uuidv4(),
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      // Perform batch insert with transaction support
      await queryInterface.bulkInsert(
        'benchmark_data',
        benchmarkData,
        { transaction }
      );

      await transaction.commit();

      console.log(`Successfully seeded ${benchmarkData.length} benchmark records`);
    } catch (error) {
      await transaction.rollback();
      console.error('Error seeding benchmark data:', error);
      throw error;
    }
  },

  async down(queryInterface: QueryInterface): Promise<void> {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Remove all benchmark data with transaction support
      await queryInterface.bulkDelete('benchmark_data', {}, { transaction });
      await transaction.commit();

      console.log('Successfully reverted benchmark data seeding');
    } catch (error) {
      await transaction.rollback();
      console.error('Error reverting benchmark data:', error);
      throw error;
    }
  }
};