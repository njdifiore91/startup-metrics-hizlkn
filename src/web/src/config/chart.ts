import {
  Chart,
  ChartType,
  ChartOptions,
  ScaleOptions,
  TooltipOptions,
  LegendOptions,
  TitleOptions,
  AnimationSpec,
  CoreInteractionOptions,
  ChartTypeRegistry,
  GridLineOptions,
  FontSpec,
  Color,
  ScriptableAndScriptableOptions,
  ScriptableChartContext,
  LegendItem,
} from 'chart.js';

// Type-safe interface for chart color palette
export interface IChartColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
}

// Interface for comprehensive chart configuration options
export interface IChartOptions extends ChartOptions<ChartType> {
  scales: {
    x?: Partial<ScaleOptions<'linear'>>;
    y?: Partial<ScaleOptions<'linear'>>;
  };
  plugins: {
    tooltip?: Partial<TooltipOptions<ChartType>>;
    legend?: Partial<LegendOptions<ChartType>>;
    title?: Partial<TitleOptions>;
  };
  animation?: Partial<AnimationSpec<ChartType>>;
  interaction?: Partial<CoreInteractionOptions>;
  responsive: boolean;
  maintainAspectRatio: boolean;
}

// WCAG-compliant brand color palette constants
export const CHART_COLORS: IChartColors = {
  primary: '#151e2d',
  secondary: '#46608C',
  accent: '#168947',
  background: '#DBEAAC',
  text: '#0D3330',
} as const;

// Typography settings
const FONT_FAMILY = 'Inter, sans-serif';

// Configure global Chart.js defaults for accessibility and performance
Chart.defaults.font.family = FONT_FAMILY;
Chart.defaults.font.size = 14;
Chart.defaults.color = CHART_COLORS.text;
Chart.defaults.responsive = true;
Chart.defaults.maintainAspectRatio = false;

/**
 * Generates optimized chart.js configuration options with accessibility and performance considerations
 * @param chartType - The type of chart being configured
 * @returns Optimized Chart.js configuration object
 */
export const getDefaultChartOptions = (chartType: keyof ChartTypeRegistry): IChartOptions => {
  const baseOptions: IChartOptions = {
    responsive: true,
    maintainAspectRatio: false,

    // Configure performance-optimized animations
    animation: {
      duration: 400,
      easing: 'easeOutQuart',
    },

    // Set touch-friendly interaction modes
    interaction: {
      mode: 'nearest',
      axis: 'xy',
      intersect: false,
    },

    // Configure plugins with accessibility features
    plugins: {
      tooltip: {
        enabled: true,
        backgroundColor: CHART_COLORS.primary,
        titleFont: {
          family: FONT_FAMILY,
          size: 14,
          weight: 'bold',
        } as FontSpec,
        bodyFont: {
          family: FONT_FAMILY,
          size: 13,
        } as FontSpec,
        padding: 12,
        cornerRadius: 4,
        usePointStyle: true,
      },
      legend: {
        display: true,
        position: 'bottom' as const,
        labels: {
          boxWidth: 12,
          boxHeight: 12,
          padding: 20,
          color: CHART_COLORS.text as Color,
          font: {
            family: FONT_FAMILY,
            size: 13,
          } as ScriptableAndScriptableOptions<Partial<FontSpec>, ScriptableChartContext>,
          filter: (item: LegendItem) => true,
          sort: (a: LegendItem, b: LegendItem) => 0,
          pointStyle: 'circle',
          usePointStyle: true,
          pointStyleWidth: 12,
          useBorderRadius: false,
          borderRadius: 0,
          generateLabels: (chart) => {
            const defaultLabels = Chart.defaults.plugins.legend.labels.generateLabels(chart);
            return defaultLabels;
          },
        },
      },
    },

    // Configure WCAG-compliant scales
    scales: {
      x: {
        grid: {
          display: true,
          color: CHART_COLORS.secondary + '20',
        } as Partial<GridLineOptions>,
        ticks: {
          font: {
            family: FONT_FAMILY,
            size: 12,
          } as FontSpec,
        },
      },
      y: {
        grid: {
          display: true,
          color: CHART_COLORS.secondary + '20',
        } as Partial<GridLineOptions>,
        ticks: {
          font: {
            family: FONT_FAMILY,
            size: 12,
          } as FontSpec,
        },
      },
    },
  };

  return baseOptions;
};

// Export optimized configuration for benchmark comparison charts
export const benchmarkChartOptions: IChartOptions = {
  ...getDefaultChartOptions('bar'),
  scales: {
    y: {
      beginAtZero: true,
      grid: {
        display: false,
      } as Partial<GridLineOptions>,
      ticks: {
        callback: (value) => `${value}%`,
      },
    },
  },
  plugins: {
    ...getDefaultChartOptions('bar').plugins,
    title: {
      display: true,
      text: 'Benchmark Comparison',
      font: {
        family: FONT_FAMILY,
        size: 16,
        weight: 'bold',
      } as FontSpec,
      align: 'center',
      position: 'top',
      color: CHART_COLORS.text,
      padding: 20,
    },
  },
};

// Export performance-optimized configuration for metric trend charts
export const metricTrendOptions: IChartOptions = {
  ...getDefaultChartOptions('line'),
  scales: {
    y: {
      beginAtZero: false,
      grid: {
        display: false,
      } as Partial<GridLineOptions>,
    },
  },
  plugins: {
    ...getDefaultChartOptions('line').plugins,
    title: {
      display: true,
      text: 'Metric Trends',
      font: {
        family: FONT_FAMILY,
        size: 16,
        weight: 'bold',
      } as FontSpec,
      align: 'center',
      position: 'top',
      color: CHART_COLORS.text,
      padding: 20,
    },
  },
  elements: {
    line: {
      tension: 0.4,
    },
    point: {
      radius: 4,
      hitRadius: 8,
      hoverRadius: 6,
    },
  },
};
