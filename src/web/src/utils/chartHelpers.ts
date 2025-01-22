import { ChartType, ChartOptions } from 'chart.js'; // chart.js@4.0.0
import { CHART_COLORS } from '../config/chart';
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

interface ExtendedChartOptions extends ChartOptions {
  plugins?: {
    accessibility?: {
      enabled?: boolean;
      announceOnRender?: boolean;
      description?: string;
    };
  } & ChartOptions['plugins'];
}

// Enhanced default chart configuration with accessibility support
export const DEFAULT_CHART_OPTIONS: ExtendedChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        font: {
          size: 14,
          family: 'Inter',
        },
        usePointStyle: true,
      },
    },
    tooltip: {
      enabled: true,
      mode: 'index',
      intersect: false,
      backgroundColor: CHART_COLORS.primary,
      titleFont: {
        family: 'Inter',
        size: 14,
      },
      bodyFont: {
        family: 'Inter',
        size: 13,
      },
      callbacks: {
        label: (context) => {
          return `${context.dataset.label}: ${formatMetricValue(
            context.raw as number,
            'percentage'
          )}`;
        },
      },
    },
  },
  interaction: {
    mode: 'nearest',
    axis: 'xy',
    intersect: false,
  },
};

// Enhanced metric formatters with localization support
export const METRIC_FORMATTERS = {
  percentage: {
    suffix: '%',
    decimals: 1,
    localeOptions: { style: 'percent', minimumFractionDigits: 1 },
  },
  currency: {
    prefix: '$',
    decimals: 2,
    localeOptions: { style: 'currency', currency: 'USD' },
  },
  number: {
    decimals: 0,
    localeOptions: { style: 'decimal' },
  },
} as const;

/**
 * Prepares benchmark data for visualization with accessibility support
 * @param benchmarkData - Raw benchmark data
 * @param accessibilityOptions - Additional accessibility configuration
 * @returns Formatted chart data with accessibility metadata
 */
export const prepareBenchmarkData = memoize(
  (benchmarkData: IBenchmark, accessibilityOptions: { description?: string } = {}): IChartData => {
    const percentiles: BenchmarkPercentile[] = ['p10', 'p25', 'p50', 'p75', 'p90'];
    const percentileLabels = ['10th', '25th', '50th', '75th', '90th'];

    const datasets: IChartDataset[] = [
      {
        label: 'Benchmark Percentiles',
        data: percentiles.map((p) => benchmarkData[p]),
        backgroundColor: CHART_COLORS.secondary + '40',
        borderColor: CHART_COLORS.secondary,
        fill: true,
        'aria-label': `Benchmark percentiles for ${benchmarkData.metric.name}`,
        role: 'graphics-symbol',
      },
    ];

    return {
      labels: percentileLabels.map((p) => `${p} Percentile`),
      datasets,
      metadata: {
        'aria-label': `Benchmark chart for ${benchmarkData.metric.name}`,
        description:
          accessibilityOptions.description ||
          `Benchmark comparison showing percentile distribution for ${benchmarkData.metric.name} in ${benchmarkData.revenueRange} revenue range`,
      },
    };
  }
);

/**
 * Generates enhanced chart options with accessibility features
 * @param chartType - Type of chart to configure
 * @param customOptions - Additional chart options
 * @param accessibilityConfig - Accessibility-specific configuration
 * @returns Enhanced Chart.js configuration
 */
export const generateChartOptions = (
  chartType: ChartType,
  customOptions: Partial<ExtendedChartOptions> = {},
  accessibilityConfig: { announceOnRender?: boolean; description?: string } = {}
): ChartOptions => {
  const baseOptions: ExtendedChartOptions = {
    ...DEFAULT_CHART_OPTIONS,
    plugins: {
      ...DEFAULT_CHART_OPTIONS.plugins,
      accessibility: {
        enabled: true,
        announceOnRender: accessibilityConfig.announceOnRender ?? true,
        description: accessibilityConfig.description,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: CHART_COLORS.secondary + '20',
          drawTicks: false,
        },
        ticks: {
          font: {
            family: 'Inter',
            size: 12,
          },
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            family: 'Inter',
            size: 12,
          },
        },
      },
    },
  };

  return {
    ...baseOptions,
    ...customOptions,
  };
};

/**
 * Formats metric values with localization support
 * @param value - Numeric value to format
 * @param type - Type of metric for formatting
 * @param locale - Optional locale configuration
 * @returns Formatted string value
 */
export const formatMetricValue = (
  value: number,
  type: 'number' | 'percentage' | 'currency' | 'ratio',
  locale: string = 'en-US'
): string => {
  if (typeof value !== 'number' || isNaN(value)) {
    return 'N/A';
  }

  switch (type) {
    case 'percentage':
      return new Intl.NumberFormat(locale, {
        style: 'percent',
        minimumFractionDigits: 1,
        maximumFractionDigits: 2,
      }).format(value / 100);
    case 'currency':
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(value);
    case 'ratio':
      return new Intl.NumberFormat(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);
    case 'number':
    default:
      return new Intl.NumberFormat(locale, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(value);
  }
};
