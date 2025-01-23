import React, { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
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
  Filler,
} from 'chart.js';
import { CHART_COLORS } from '../../config/chart';
import { generateChartOptions } from '../../utils/chartHelpers';

// Register required Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Default height for the area chart if not specified
const DEFAULT_HEIGHT = 300;

// Interface for the AreaChart component props
interface IAreaChartProps {
  data: number[];
  labels: string[];
  title?: string;
  height?: string;
  loading?: boolean;
  className?: string;
  ariaLabel?: string;
}

/**
 * A reusable area chart component with accessibility features and performance optimizations
 * @param props - Component props of type IAreaChartProps
 * @returns Rendered area chart component
 */
const AreaChart: React.FC<IAreaChartProps> = React.memo(
  ({
    data,
    labels,
    title,
    height = '400px',
    loading = false,
    className,
    ariaLabel = 'Area chart',
  }) => {
    const chartData: ChartData<'line'> = useMemo(
      () => ({
        labels,
        datasets: [
          {
            label: title || 'Data',
            data,
            fill: true,
            backgroundColor: 'rgba(21, 30, 45, 0.1)',
            borderColor: '#151e2d',
            tension: 0.4,
            pointRadius: 4,
            pointHoverRadius: 6,
          },
        ],
      }),
      [data, labels, title]
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
            enabled: true,
            mode: 'index' as const,
            intersect: false,
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
          },
        },
        interaction: {
          mode: 'nearest' as const,
          axis: 'x' as const,
          intersect: false,
        },
      }),
      [title]
    );

    if (loading) {
      return <div>Loading chart...</div>;
    }

    return (
      <div style={{ height }} className={className} role="region" aria-label={ariaLabel}>
        <Line data={chartData} options={options} />
      </div>
    );
  }
);

// Display name for debugging
AreaChart.displayName = 'AreaChart';

export default AreaChart;
