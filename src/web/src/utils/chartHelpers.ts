import { ChartType, ChartOptions } from 'chart.js'; // chart.js@4.0.0
import { chartColors } from '../config/chart';
import { IBenchmark, BenchmarkPercentile } from '../interfaces/IBenchmark';
import memoize from 'lodash/memoize';

// Enhanced interface for chart datasets with accessibility properties
export interface IChartDataset {
  label: string;
  data: number[];
  backgroundColor: string;
  borderColor: string;
  fill: boolean;
  'aria-label': string;
  role: string;
}

// Enhanced interface for complete chart data with accessibility metadata
export interface IChartData {
  labels: string[];
  datasets: IChartDataset[];
  metadata: {
    'aria-label': string;
    description: string;
  };
}

// Enhanced default chart configuration with accessibility support
export const DEFAULT_CHART_OPTIONS: ChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        font: {
          size: 14,
          family: 'Inter'
        },
        usePointStyle: true
      }
    },
    tooltip: {
      enabled: true,
      mode: 'index',
      intersect: false,
      backgroundColor: chartColors.primary,
      titleFont: {
        family: 'Inter',
        size: 14
      },
      bodyFont: {
        family: 'Inter',
        size: 13
      },
      callbacks: {
        label: (context) => {
          return `${context.dataset.label}: ${formatMetricValue(context.raw as number, 'percentage')}`;
        }
      }
    }
  },
  interaction: {
    mode: 'nearest',
    axis: 'xy',
    intersect: false
  }
};

// Enhanced metric formatters with localization support
export const METRIC_FORMATTERS = {
  percentage: {
    suffix: '%',
    decimals: 1,
    localeOptions: { style: 'percent', minimumFractionDigits: 1 }
  },
  currency: {
    prefix: '$',
    decimals: 2,
    localeOptions: { style: 'currency', currency: 'USD' }
  },
  number: {
    decimals: 0,
    localeOptions: { style: 'decimal' }
  }
} as const;

/**
 * Prepares benchmark data for visualization with accessibility support
 * @param benchmarkData - Raw benchmark data
 * @param accessibilityOptions - Additional accessibility configuration
 * @returns Formatted chart data with accessibility metadata
 */
export const prepareBenchmarkData = memoize((
  benchmarkData: IBenchmark,
  accessibilityOptions: { description?: string } = {}
): IChartData => {
  const percentiles: BenchmarkPercentile[] = ['p10', 'p25', 'p50', 'p75', 'p90'];
  const percentileLabels = ['10th', '25th', '50th', '75th', '90th'];
  
  const datasets: IChartDataset[] = [{
    label: 'Benchmark Percentiles',
    data: percentiles.map(p => benchmarkData[p]),
    backgroundColor: chartColors.secondary + '40',
    borderColor: chartColors.secondary,
    fill: true,
    'aria-label': `Benchmark percentiles for ${benchmarkData.metric.name}`,
    role: 'graphics-symbol'
  }];

  return {
    labels: percentileLabels.map(p => `${p} Percentile`),
    datasets,
    metadata: {
      'aria-label': `Benchmark chart for ${benchmarkData.metric.name}`,
      description: accessibilityOptions.description || 
        `Benchmark comparison showing percentile distribution for ${benchmarkData.metric.name} in ${benchmarkData.revenueRange} revenue range`
    }
  };
});

/**
 * Generates enhanced chart options with accessibility features
 * @param chartType - Type of chart to configure
 * @param customOptions - Additional chart options
 * @param accessibilityConfig - Accessibility-specific configuration
 * @returns Enhanced Chart.js configuration
 */
export const generateChartOptions = (
  chartType: ChartType,
  customOptions: Partial<ChartOptions> = {},
  accessibilityConfig: { announceOnRender?: boolean; description?: string } = {}
): ChartOptions => {
  const baseOptions: ChartOptions = {
    ...DEFAULT_CHART_OPTIONS,
    plugins: {
      ...DEFAULT_CHART_OPTIONS.plugins,
      accessibility: {
        enabled: true,
        announceOnRender: accessibilityConfig.announceOnRender ?? true,
        description: accessibilityConfig.description
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: chartColors.secondary + '20',
          border: {
            display: false
          }
        },
        ticks: {
          font: {
            family: 'Inter',
            size: 12
          }
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: {
            family: 'Inter',
            size: 12
          }
        }
      }
    }
  };

  return {
    ...baseOptions,
    ...customOptions
  };
};

/**
 * Formats metric values with localization support
 * @param value - Numeric value to format
 * @param metricType - Type of metric for formatting
 * @param localeOptions - Optional locale configuration
 * @returns Formatted string value
 */
export const formatMetricValue = (
  value: number,
  metricType: keyof typeof METRIC_FORMATTERS,
  localeOptions: Intl.NumberFormatOptions = {}
): string => {
  if (typeof value !== 'number' || isNaN(value)) {
    return 'N/A';
  }

  const formatter = METRIC_FORMATTERS[metricType];
  const options = {
    ...formatter.localeOptions,
    ...localeOptions,
    maximumFractionDigits: formatter.decimals
  };

  let formattedValue = new Intl.NumberFormat('en-US', options).format(
    metricType === 'percentage' ? value / 100 : value
  );

  if (metricType === 'percentage' && !options.style && 'suffix' in formatter) {
    formattedValue = `${formattedValue}${formatter.suffix}`;
  }

  return formattedValue;
};