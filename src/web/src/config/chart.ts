import { Chart, ChartType, ChartOptions } from 'chart.js'; // chart.js@4.0.0

// Type-safe interface for chart color palette
export interface IChartColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
}

// Interface for comprehensive chart configuration options
export interface IChartOptions extends ChartOptions {
  scales: object;
  plugins: object;
  animation: object;
  interaction: object;
  responsive: boolean;
  maintainAspectRatio: boolean;
}

// WCAG-compliant brand color palette constants
export const CHART_COLORS: IChartColors = {
  primary: '#151e2d',
  secondary: '#46608C',
  accent: '#168947',
  background: '#DBEAAC',
  text: '#0D3330'
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
export const getDefaultChartOptions = (chartType: ChartType): IChartOptions => {
  const baseOptions: IChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    
    // Configure performance-optimized animations
    animation: {
      duration: 400,
      easing: 'easeOutQuart',
      mode: 'show',
      delay: (context) => context.dataIndex * 10
    },
    
    // Set touch-friendly interaction modes
    interaction: {
      mode: 'nearest',
      axis: 'xy',
      intersect: false,
      includeInvisible: false
    },
    
    // Configure plugins with accessibility features
    plugins: {
      tooltip: {
        enabled: true,
        backgroundColor: CHART_COLORS.primary,
        titleFont: {
          family: FONT_FAMILY,
          size: 14,
          weight: 'bold'
        },
        bodyFont: {
          family: FONT_FAMILY,
          size: 13
        },
        padding: 12,
        cornerRadius: 4,
        usePointStyle: true
      },
      legend: {
        display: true,
        position: 'bottom',
        labels: {
          font: {
            family: FONT_FAMILY,
            size: 13
          },
          usePointStyle: true,
          padding: 20
        }
      }
    },
    
    // Configure WCAG-compliant scales
    scales: {
      x: {
        grid: {
          display: true,
          color: CHART_COLORS.secondary + '20'
        },
        ticks: {
          font: {
            family: FONT_FAMILY,
            size: 12
          }
        }
      },
      y: {
        grid: {
          display: true,
          color: CHART_COLORS.secondary + '20'
        },
        ticks: {
          font: {
            family: FONT_FAMILY,
            size: 12
          }
        }
      }
    }
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
        drawBorder: false
      },
      ticks: {
        callback: (value) => `${value}%`
      }
    }
  },
  plugins: {
    ...getDefaultChartOptions('bar').plugins,
    title: {
      display: true,
      text: 'Benchmark Comparison',
      font: {
        family: FONT_FAMILY,
        size: 16,
        weight: 'bold'
      }
    }
  }
};

// Export performance-optimized configuration for metric trend charts
export const metricTrendOptions: IChartOptions = {
  ...getDefaultChartOptions('line'),
  scales: {
    y: {
      beginAtZero: false,
      grid: {
        drawBorder: false
      }
    }
  },
  plugins: {
    ...getDefaultChartOptions('line').plugins,
    title: {
      display: true,
      text: 'Metric Trends',
      font: {
        family: FONT_FAMILY,
        size: 16,
        weight: 'bold'
      }
    }
  },
  elements: {
    line: {
      tension: 0.4
    },
    point: {
      radius: 4,
      hitRadius: 8,
      hoverRadius: 6
    }
  }
};