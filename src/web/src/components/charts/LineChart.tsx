import React, { useRef, useCallback, useEffect, useMemo } from 'react';
import {
  Chart as ChartJS,
  ChartOptions,
  ChartData,
  LinearScale,
  CategoryScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2'; // react-chartjs-2@5.0.0
import { MetricValueType } from '../../interfaces/IMetric';
import { generateChartOptions, formatMetricValue } from '../../utils/chartHelpers';

// Register required Chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

// Default chart height in pixels
const DEFAULT_HEIGHT = 300;

// Interface for chart data points
export interface DataPoint {
  value: number;
  label: string;
}

// Props interface with comprehensive accessibility and customization options
interface ILineChartProps {
  data: DataPoint[];
  metricType: MetricValueType;
  height?: string;
  title?: string;
  className?: string;
  ariaLabel?: string;
  locale?: string;
}

/**
 * A reusable, accessible line chart component for metric visualization
 * Built with Chart.js and optimized for performance and accessibility
 */
const LineChart: React.FC<ILineChartProps> = React.memo(
  ({
    data,
    metricType,
    height = '400px',
    title,
    className,
    ariaLabel = 'Line chart',
    locale = 'en-US',
  }) => {
    const chartData: ChartData<'line'> = useMemo(
      () => ({
        labels: data.map((point) => point.label),
        datasets: [
          {
            label: title || 'Data',
            data: data.map((point) => point.value),
            borderColor: '#151e2d',
            backgroundColor: 'rgba(21, 30, 45, 0.1)',
            fill: false,
            tension: 0.4,
            pointRadius: 4,
            pointHoverRadius: 6,
          },
        ],
      }),
      [data, title]
    );

    const options: ChartOptions<'line'> = useMemo(
      () => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: !!title,
            position: 'top' as const,
          },
          tooltip: {
            mode: 'index' as const,
            intersect: false,
            callbacks: {
              label: (context) => {
                const value = context.raw as number;
                return `${context.dataset.label}: ${formatMetricValue(value, metricType, locale)}`;
              },
            },
          },
        },
        scales: {
          x: {
            display: true,
            grid: {
              display: false,
            },
          },
          y: {
            display: true,
            beginAtZero: true,
            ticks: {
              callback: (value) => formatMetricValue(value as number, metricType, locale),
            },
          },
        },
        interaction: {
          mode: 'nearest' as const,
          axis: 'x' as const,
          intersect: false,
        },
      }),
      [metricType, title, locale]
    );

    return (
      <div style={{ height }} className={className} role="region" aria-label={ariaLabel}>
        <Line data={chartData} options={options} />
      </div>
    );
  }
);

// Display name for debugging
LineChart.displayName = 'LineChart';

export default LineChart;
