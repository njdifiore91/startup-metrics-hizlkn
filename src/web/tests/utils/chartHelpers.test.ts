import '@testing-library/jest-dom'; // @testing-library/jest-dom@5.16.5
import { axe, toHaveNoViolations } from 'jest-axe'; // jest-axe@4.7.0
import { performance } from 'jest-performance'; // jest-performance@1.0.0
import { prepareBenchmarkData, generateChartOptions, formatMetricValue } from '../../src/utils/chartHelpers';
import { CHART_COLORS } from '../../src/config/chart';
import type { IBenchmark } from '../../src/interfaces/IBenchmark';
import type { IMetric } from '../../src/interfaces/IMetric';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock data setup
const mockMetric: IMetric = {
  id: 'metric-1',
  name: 'ARR Growth Rate',
  description: 'Annual Recurring Revenue Growth Rate',
  category: 'growth',
  valueType: 'percentage',
  validationRules: {
    min: 0,
    max: 100,
    precision: 1
  },
  isActive: true,
  displayOrder: 1,
  tags: ['growth', 'revenue'],
  metadata: {},
  createdAt: new Date(),
  updatedAt: new Date()
};

const mockBenchmarkData: IBenchmark = {
  id: 'benchmark-1',
  metricId: 'metric-1',
  metric: mockMetric,
  revenueRange: '$1M-$5M',
  p10: 10,
  p25: 25,
  p50: 50,
  p75: 75,
  p90: 90,
  reportDate: new Date(),
  sourceId: 'source-1'
};

describe('prepareBenchmarkData', () => {
  it('should correctly format benchmark data with memoization', () => {
    // Test initial call
    const result1 = prepareBenchmarkData(mockBenchmarkData);
    expect(result1.datasets).toHaveLength(1);
    expect(result1.labels).toHaveLength(5);
    
    // Test memoization
    const result2 = prepareBenchmarkData(mockBenchmarkData);
    expect(result2).toBe(result1); // Should return cached result
    
    // Verify data structure
    expect(result1.datasets[0].data).toEqual([10, 25, 50, 75, 90]);
    expect(result1.datasets[0].backgroundColor).toBe(CHART_COLORS.secondary + '40');
  });

  it('should generate accessible chart metadata', () => {
    const result = prepareBenchmarkData(mockBenchmarkData, {
      description: 'Custom accessibility description'
    });

    expect(result.metadata['aria-label']).toBe('Benchmark chart for ARR Growth Rate');
    expect(result.metadata.description).toBe('Custom accessibility description');
    expect(result.datasets[0]['aria-label']).toBe('Benchmark percentiles for ARR Growth Rate');
    expect(result.datasets[0].role).toBe('graphics-symbol');
  });

  it('should meet performance requirements', async () => {
    const { duration } = await performance.measure(() => {
      for (let i = 0; i < 1000; i++) {
        prepareBenchmarkData(mockBenchmarkData);
      }
    });

    expect(duration).toBeLessThan(50); // 50ms threshold
  });
});

describe('generateChartOptions', () => {
  it('should generate accessible chart configuration', () => {
    const options = generateChartOptions('bar', {}, {
      announceOnRender: true,
      description: 'Accessible chart description'
    });

    expect(options.plugins?.accessibility).toBeDefined();
    expect(options.plugins?.accessibility.enabled).toBe(true);
    expect(options.plugins?.accessibility.description).toBe('Accessible chart description');
  });

  it('should support RTL layout', () => {
    const rtlOptions = generateChartOptions('bar', {
      rtl: true
    });

    expect(rtlOptions.scales?.x?.position).toBe('right');
    expect(rtlOptions.scales?.y?.position).toBe('right');
  });

  it('should merge custom options correctly', () => {
    const customOptions = {
      plugins: {
        tooltip: {
          enabled: false
        }
      }
    };

    const options = generateChartOptions('line', customOptions);
    expect(options.plugins?.tooltip.enabled).toBe(false);
    expect(options.responsive).toBe(true); // Default option preserved
  });

  it('should meet WCAG color contrast requirements', async () => {
    const options = generateChartOptions('bar');
    const { backgroundColor, borderColor } = options.plugins?.tooltip || {};
    
    // Using axe-core to verify color contrast
    const results = await axe.run({
      rules: {
        'color-contrast': { enabled: true }
      }
    });
    
    expect(results).toHaveNoViolations();
  });
});

describe('formatMetricValue', () => {
  it('should format values for different locales', () => {
    // Test percentage formatting
    expect(formatMetricValue(75.5, 'percentage')).toBe('75.5%');
    
    // Test currency formatting
    expect(formatMetricValue(1000000, 'currency')).toBe('$1,000,000.00');
    
    // Test number formatting
    expect(formatMetricValue(1234, 'number')).toBe('1,234');
  });

  it('should handle RTL formatting', () => {
    const rtlOptions = { locale: 'ar-AE' };
    
    expect(formatMetricValue(75.5, 'percentage', rtlOptions))
      .toMatch(/٧٥٫٥٪/); // Arabic numerals and symbols
    
    expect(formatMetricValue(1000000, 'currency', {
      ...rtlOptions,
      currency: 'AED'
    })).toMatch(/١٬٠٠٠٬٠٠٠٫٠٠/);
  });

  it('should handle invalid values gracefully', () => {
    expect(formatMetricValue(NaN, 'percentage')).toBe('N/A');
    expect(formatMetricValue(undefined as any, 'currency')).toBe('N/A');
    expect(formatMetricValue(null as any, 'number')).toBe('N/A');
  });

  it('should generate accessible value descriptions', () => {
    const value = 75.5;
    const formattedValue = formatMetricValue(value, 'percentage');
    
    expect(formattedValue).toMatch(/75\.5%/);
    expect(formattedValue).toMatchSnapshot(); // Verify consistent formatting
  });
});

// Performance test suite
describe('Performance Tests', () => {
  it('should maintain performance under load', async () => {
    const benchmarkData = Array(1000).fill(mockBenchmarkData);
    
    const { duration: prepareDataDuration } = await performance.measure(() => {
      benchmarkData.forEach(data => prepareBenchmarkData(data));
    });
    
    const { duration: formatDuration } = await performance.measure(() => {
      for (let i = 0; i < 1000; i++) {
        formatMetricValue(75.5, 'percentage');
      }
    });

    expect(prepareDataDuration).toBeLessThan(50); // 50ms threshold
    expect(formatDuration).toBeLessThan(10); // 10ms threshold
  });
});

// Accessibility test suite
describe('Accessibility Tests', () => {
  it('should meet WCAG requirements', async () => {
    const chartData = prepareBenchmarkData(mockBenchmarkData);
    const chartOptions = generateChartOptions('bar', {}, {
      announceOnRender: true,
      description: 'Accessible benchmark chart'
    });

    const results = await axe.run({
      rules: {
        'aria-allowed-attr': { enabled: true },
        'aria-hidden-focus': { enabled: true },
        'aria-required-attr': { enabled: true },
        'color-contrast': { enabled: true }
      }
    });

    expect(results).toHaveNoViolations();
    expect(chartData.metadata['aria-label']).toBeDefined();
    expect(chartOptions.plugins?.accessibility?.enabled).toBe(true);
  });
});