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
      labels: benchmark.percentiles.map((p) => `${p}th percentile`),
      datasets: [
        {
          label: 'Industry Benchmark',
          data: benchmark.values,
          borderColor: '#151e2d',
          backgroundColor: 'rgba(21, 30, 45, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
        ...(companyMetric
          ? [
              {
                label: 'Your Company',
                data: new Array(benchmark.percentiles.length).fill(companyMetric),
                borderColor: '#46608C',
                borderDash: [5, 5],
                fill: false,
                tension: 0,
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
        },
        tooltip: {
          mode: 'index' as const,
          intersect: false,
          callbacks: {
            label: (context) => {
              const value = context.raw as number;
              return `${context.dataset.label}: ${formatMetricValue(value, benchmark.valueType)}`;
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
          },
        },
        y: {
          display: true,
          title: {
            display: true,
            text: benchmark.name,
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
