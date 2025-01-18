import React, { useRef, useCallback, useEffect } from 'react';
import { Line } from 'react-chartjs-2'; // react-chartjs-2@5.0.0
import { Chart as ChartJS, ChartOptions } from 'chart.js/auto'; // chart.js@4.0.0
import { CHART_COLORS } from '../../config/chart';
import { generateChartOptions, formatMetricValue } from '../../utils/chartHelpers';

// Default chart height in pixels
const DEFAULT_HEIGHT = 300;

// Interface for chart data points
interface DataPoint {
  x: string | number;
  y: number;
}

// Props interface with comprehensive accessibility and customization options
interface ILineChartProps {
  data: DataPoint[];
  labels: string[];
  metricType: 'percentage' | 'currency' | 'number';
  height?: number;
  options?: Partial<ChartOptions>;
  ariaLabel?: string;
  locale?: string;
  isRTL?: boolean;
  onError?: (error: Error) => void;
}

/**
 * A reusable, accessible line chart component for metric visualization
 * Built with Chart.js and optimized for performance and accessibility
 */
const LineChart: React.FC<ILineChartProps> = React.memo(({
  data,
  labels,
  metricType,
  height = DEFAULT_HEIGHT,
  options = {},
  ariaLabel,
  locale = 'en-US',
  isRTL = false,
  onError
}) => {
  // Chart instance reference for cleanup
  const chartRef = useRef<ChartJS | null>(null);

  // Memoized chart data preparation
  const getChartData = useCallback(() => {
    return {
      labels,
      datasets: [{
        label: ariaLabel || 'Metric trend',
        data: data.map(point => point.y),
        fill: false,
        borderColor: CHART_COLORS.primary,
        backgroundColor: CHART_COLORS.background,
        borderWidth: 2,
        pointBackgroundColor: CHART_COLORS.accent,
        pointHoverBackgroundColor: CHART_COLORS.secondary,
        pointHoverRadius: 6,
        pointHitRadius: 8,
        tension: 0.4,
        'aria-label': `${ariaLabel || 'Metric'} data points`,
        role: 'graphics-symbol'
      }]
    };
  }, [data, labels, ariaLabel]);

  // Memoized chart options with accessibility enhancements
  const getEnhancedOptions = useCallback(() => {
    const baseOptions = generateChartOptions('line', {
      ...options,
      plugins: {
        ...options.plugins,
        tooltip: {
          ...options.plugins?.tooltip,
          callbacks: {
            label: (context: any) => {
              const value = context.raw as number;
              return formatMetricValue(value, metricType, { style: 'decimal' });
            }
          }
        }
      }
    });

    return {
      ...baseOptions,
      layout: {
        ...baseOptions.layout,
        rtl: isRTL,
      },
      scales: {
        ...baseOptions.scales,
        y: {
          ...baseOptions.scales?.y,
          position: isRTL ? 'right' : 'left',
          ticks: {
            ...baseOptions.scales?.y?.ticks,
            callback: function(value: number) {
              return formatMetricValue(value, metricType, { style: 'decimal' });
            }
          }
        }
      }
    };
  }, [options, isRTL, metricType]);

  // Cleanup chart instance on unmount
  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, []);

  // Error boundary handler
  const handleError = (error: Error) => {
    console.error('LineChart error:', error);
    onError?.(error);
  };

  try {
    return (
      <div
        style={{ height: `${height}px` }}
        role="region"
        aria-label={ariaLabel || 'Line chart'}
      >
        <Line
          ref={chartRef}
          data={getChartData()}
          options={getEnhancedOptions()}
          fallbackContent={
            <p role="alert">
              Chart data visualization is not available.
              Please check your browser compatibility or try again later.
            </p>
          }
        />
      </div>
    );
  } catch (error) {
    handleError(error as Error);
    return (
      <div
        role="alert"
        style={{ height: `${height}px`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <p>Unable to display chart. Please try again later.</p>
      </div>
    );
  }
});

// Display name for debugging
LineChart.displayName = 'LineChart';

export default LineChart;