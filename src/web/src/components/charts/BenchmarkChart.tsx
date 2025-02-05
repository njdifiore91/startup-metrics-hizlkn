import React, { useRef, useEffect, useMemo } from 'react';
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
import { IBenchmark } from '../../interfaces/IBenchmark';
import { formatMetricValue } from '../../utils/chartHelpers';
import { MetricValueType } from '../../interfaces/IMetric';

// Register required Chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

/**
 * Props interface for the BenchmarkChart component with comprehensive validation
 */
interface BenchmarkChartProps {
  /** Benchmark data to visualize */
  benchmark: IBenchmark;
  /** Optional company metric for comparison */
  companyMetric?: number;
  /** Optional height override (default: 400px) */
  height?: string;
  /** Optional CSS class name */
  className?: string;
  /** Optional ARIA label for accessibility */
  ariaLabel?: string;
}

const formatValue = (value: number, valueType: MetricValueType): string => {
  switch (valueType) {
    case 'percentage':
    case 'ratio':
    case 'number':
    case 'currency':
      return formatMetricValue(value, valueType);
    default:
      return value.toString();
  }
};

/**
 * A highly optimized and accessible benchmark comparison chart component
 * Implements WCAG 2.1 compliance and performance best practices
 * @version 1.0.0
 */
const BenchmarkChart: React.FC<BenchmarkChartProps> = ({
  benchmark,
  companyMetric,
  height = '400px',
  className,
  ariaLabel = 'Benchmark comparison chart',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<ChartJS | null>(null);

  const chartData: ChartData<'line'> = useMemo(
    () => ({
      labels: ['10th', '25th', '50th', '75th', '90th'],
      datasets: [
        {
          label: 'Industry Benchmark',
          data: [benchmark.p10, benchmark.p25, benchmark.p50, benchmark.p75, benchmark.p90],
          borderColor: 'rgb(53, 162, 235)',
          backgroundColor: 'rgba(53, 162, 235, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 6,
          pointHoverRadius: 8,
        },
        ...(companyMetric !== undefined
          ? [
              {
                label: 'Your Company',
                data: new Array(5).fill(companyMetric),
                borderColor: 'rgb(255, 99, 132)',
                borderDash: [5, 5],
                backgroundColor: 'rgba(255, 99, 132, 0.1)',
                fill: false,
                tension: 0,
                pointRadius: 0,
              },
            ]
          : []),
      ],
    }),
    [benchmark, companyMetric]
  );

  const options: ChartOptions<'line'> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top' as const,
          labels: {
            padding: 20,
            usePointStyle: true,
          },
        },
        tooltip: {
          mode: 'index' as const,
          intersect: false,
          padding: 12,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: 'white',
          bodyColor: 'white',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          callbacks: {
            label: (context) => {
              const value = context.raw as number;
              return `${context.dataset.label}: ${formatValue(value, benchmark.metric.valueType)}`;
            },
          },
        },
      },
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: 'Percentile',
            padding: { top: 10 },
            font: {
              weight: 'bold',
            },
          },
          grid: {
            display: false,
          },
        },
        y: {
          display: true,
          title: {
            display: true,
            text: benchmark.metric.name,
            padding: { bottom: 10 },
            font: {
              weight: 'bold',
            },
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.1)',
          },
          ticks: {
            callback: (value) => formatValue(value as number, benchmark.metric.valueType),
          },
        },
      },
      interaction: {
        mode: 'nearest' as const,
        axis: 'x' as const,
        intersect: false,
      },
    }),
    [benchmark]
  );

  useEffect(() => {
    if (!canvasRef.current) return;

    if (!chartRef.current) {
      chartRef.current = new ChartJS(canvasRef.current, {
        type: 'line',
        data: chartData,
        options,
      });
    } else {
      chartRef.current.data = chartData;
      chartRef.current.options = options;
      chartRef.current.update();
    }

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [chartData, options]);

  useEffect(() => {
    const chart = chartRef.current;
    const canvas = canvasRef.current;
    if (!chart || !canvas) return;

    const resizeObserver = new ResizeObserver(() => {
      chart.resize();
    });

    resizeObserver.observe(canvas);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div style={{ height }} className={className} role="region" aria-label={ariaLabel}>
      <canvas ref={canvasRef} />
    </div>
  );
};

// Display name for debugging
BenchmarkChart.displayName = 'BenchmarkChart';

export default React.memo(BenchmarkChart);
