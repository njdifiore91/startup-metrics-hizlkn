import { MetricType, MetricCategory } from '../interfaces/IMetric';

/**
 * Maps MetricType to MetricCategory for consistent categorization
 */
export const typeToCategory: Record<MetricType, MetricCategory> = {
  [MetricType.REVENUE]: MetricCategory.FINANCIAL,
  [MetricType.EXPENSES]: MetricCategory.FINANCIAL,
  [MetricType.USERS]: MetricCategory.OPERATIONAL,
  [MetricType.GROWTH]: MetricCategory.OPERATIONAL,
  [MetricType.CHURN]: MetricCategory.CUSTOMER,
  [MetricType.ENGAGEMENT]: MetricCategory.PRODUCT,
  [MetricType.CONVERSION]: MetricCategory.MARKETING,
  [MetricType.RETENTION]: MetricCategory.CUSTOMER,
  [MetricType.PERFORMANCE]: MetricCategory.OPERATIONAL,
  [MetricType.CUSTOM]: MetricCategory.OTHER
};