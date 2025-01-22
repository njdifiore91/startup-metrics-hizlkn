import React, { useMemo, useCallback, useRef, useEffect } from 'react';
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
import { Line } from 'react-chartjs-2'; // react-chartjs-2@4.0.0
import { MetricValueType } from '../../interfaces/IMetric';
import { formatMetricValue } from '../../utils/chartHelpers';
import { calculateGrowthRate } from '../../utils/metricCalculators';

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

// Enhanced interface for metric trend data points
interface MetricDataPoint {
  timestamp: Date;
  value: number;
}

// Comprehensive props interface with accessibility and RTL support
interface IMetricTrendChartProps {
  data: MetricDataPoint[];
  metricType: MetricValueType;
  height?: string;
  showGrowthRate?: boolean;
  isRTL?: boolean;
  locale?: string;
  ariaLabel?: string;
}

// Worker for performance-optimized data processing
const dataProcessingWorker = new Worker(
  new URL('../../workers/chartDataProcessor.ts', import.meta.url)
);

/**
 * Prepares metric data for visualization with performance optimizations
 * @param data - Raw metric data points
 * @param locale - Locale for formatting
 * @param isRTL - RTL layout flag
 */
const prepareChartData = (data: MetricDataPoint[], locale: string, isRTL: boolean) => {
  // Sort data chronologically
  const sortedData = [...data].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  // Format dates according to locale
  const labels = sortedData.map((point) =>
    new Intl.DateTimeFormat(locale, {
      month: 'short',
      year: 'numeric',
    }).format(point.timestamp)
  );

  // Reverse arrays for RTL support if needed
  if (isRTL) {
    labels.reverse();
    sortedData.reverse();
  }

  return {
    labels,
    datasets: [
      {
        label: 'Metric Value',
        data: sortedData.map((point) => point.value),
        borderColor: '#151e2d',
        backgroundColor: 'rgba(21, 30, 45, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };
};

/**
 * Accessible and performant metric trend chart component
 */
const MetricTrendChart: React.FC<IMetricTrendChartProps> = ({
  data,
  metricType,
  height = '400px',
  showGrowthRate = false,
  isRTL = false,
  locale = 'en-US',
  ariaLabel = 'Metric trend chart',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<ChartJS | null>(null);

  // Memoized chart data preparation
  const chartData: ChartData<'line'> = useMemo(
    () => prepareChartData(data, locale, isRTL),
    [data, locale, isRTL]
  );

  // Memoized chart options with accessibility enhancements
  const options: ChartOptions<'line'> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top' as const,
        },
        tooltip: {
          mode: 'index' as const,
          intersect: false,
          position: isRTL ? 'nearest' : 'average',
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
          reverse: isRTL,
          grid: {
            display: false,
          },
          ticks: {
            align: isRTL ? 'end' : 'center',
          },
        },
        y: {
          display: true,
          position: isRTL ? 'right' : 'left',
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
    [metricType, isRTL, locale]
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

  // Handle keyboard navigation
  const handleKeyboardNavigation = useCallback(
    (event: KeyboardEvent) => {
      if (!chartRef.current) return;

      const chart = chartRef.current;
      const activeElements = chart.getActiveElements();

      if (activeElements.length === 0) {
        chart.setActiveElements([{ datasetIndex: 0, index: 0 }]);
        return;
      }

      const currentIndex = activeElements[0].index;
      let newIndex = currentIndex;

      switch (event.key) {
        case 'ArrowRight':
          newIndex = isRTL ? currentIndex - 1 : currentIndex + 1;
          break;
        case 'ArrowLeft':
          newIndex = isRTL ? currentIndex + 1 : currentIndex - 1;
          break;
      }

      if (newIndex >= 0 && newIndex < data.length) {
        chart.setActiveElements([{ datasetIndex: 0, index: newIndex }]);
        chart.update();
      }
    },
    [data.length, isRTL]
  );

  // Set up keyboard navigation listeners
  useEffect(() => {
    window.addEventListener('keydown', handleKeyboardNavigation);
    return () => window.removeEventListener('keydown', handleKeyboardNavigation);
  }, [handleKeyboardNavigation]);

  // Calculate and display growth rate if enabled
  const growthRate = useMemo(() => {
    if (!showGrowthRate || data.length < 2) return null;

    const latestValue = data[data.length - 1].value;
    const previousValue = data[data.length - 2].value;

    try {
      const growth = calculateGrowthRate(latestValue, previousValue, {
        valueType: metricType,
        validationRules: { precision: 1 },
      } as any);

      return formatMetricValue(growth, 'percentage', locale);
    } catch {
      return null;
    }
  }, [data, showGrowthRate, metricType, locale]);

  return (
    <div style={{ height, direction: isRTL ? 'rtl' : 'ltr' }} role="region" aria-label={ariaLabel}>
      <canvas ref={canvasRef} />
      {growthRate && (
        <div role="complementary" aria-label="Growth rate">
          {growthRate} growth
        </div>
      )}
    </div>
  );
};

export default React.memo(MetricTrendChart);
