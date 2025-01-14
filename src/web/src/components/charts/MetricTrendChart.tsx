import React, { useMemo, useCallback, useRef, useEffect } from 'react';
import { Line } from 'react-chartjs-2'; // react-chartjs-2@4.0.0
import { Chart as ChartJS } from 'chart.js/auto'; // chart.js@4.0.0
import { metricTrendOptions } from '../../config/chart';
import { generateChartOptions, formatMetricValue } from '../../utils/chartHelpers';
import { calculateGrowthRate } from '../../utils/metricCalculators';
import { MetricValueType } from '../../interfaces/IMetric';

// Enhanced interface for metric trend data points
interface MetricDataPoint {
  timestamp: Date;
  value: number;
}

// Comprehensive props interface with accessibility and RTL support
interface IMetricTrendChartProps {
  data: MetricDataPoint[];
  metricType: MetricValueType;
  height?: number;
  showGrowthRate?: boolean;
  isRTL?: boolean;
  locale?: string;
  accessibilityLabel?: string;
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
const prepareChartData = (
  data: MetricDataPoint[],
  locale: string,
  isRTL: boolean
) => {
  // Sort data chronologically
  const sortedData = [...data].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  // Format dates according to locale
  const labels = sortedData.map(point => 
    new Intl.DateTimeFormat(locale, {
      month: 'short',
      year: 'numeric'
    }).format(point.timestamp)
  );

  // Reverse arrays for RTL support if needed
  if (isRTL) {
    labels.reverse();
    sortedData.reverse();
  }

  return {
    labels,
    datasets: [{
      label: 'Metric Value',
      data: sortedData.map(point => point.value),
      borderColor: '#151e2d',
      backgroundColor: 'rgba(21, 30, 45, 0.1)',
      fill: true,
      tension: 0.4,
      pointRadius: 4,
      pointHoverRadius: 6,
      'aria-label': 'Metric trend line',
      role: 'graphics-symbol'
    }]
  };
};

/**
 * Accessible and performant metric trend chart component
 */
const MetricTrendChart: React.FC<IMetricTrendChartProps> = ({
  data,
  metricType,
  height = 300,
  showGrowthRate = false,
  isRTL = false,
  locale = 'en-US',
  accessibilityLabel
}) => {
  const chartRef = useRef<ChartJS>(null);

  // Memoized chart data preparation
  const chartData = useMemo(() => 
    prepareChartData(data, locale, isRTL),
    [data, locale, isRTL]
  );

  // Memoized chart options with accessibility enhancements
  const chartOptions = useMemo(() => {
    const options = generateChartOptions('line', metricTrendOptions, {
      announceOnRender: true,
      description: accessibilityLabel || 'Metric trend visualization'
    });

    // Configure RTL-aware tooltips
    options.plugins = {
      ...options.plugins,
      tooltip: {
        ...options.plugins?.tooltip,
        position: isRTL ? 'nearest' : 'average',
        callbacks: {
          label: (context) => {
            const value = context.raw as number;
            return `${context.dataset.label}: ${formatMetricValue(value, 'number')}`;
          }
        }
      }
    };

    // Configure RTL-aware scales
    options.scales = {
      ...options.scales,
      x: {
        ...options.scales?.x,
        reverse: isRTL,
        ticks: {
          ...options.scales?.x?.ticks,
          align: isRTL ? 'end' : 'center'
        }
      }
    };

    return options;
  }, [metricType, isRTL, accessibilityLabel]);

  // Handle keyboard navigation
  const handleKeyboardNavigation = useCallback((event: KeyboardEvent) => {
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
  }, [data.length, isRTL]);

  // Set up keyboard navigation listeners
  useEffect(() => {
    window.addEventListener('keydown', handleKeyboardNavigation);
    return () => window.removeEventListener('keydown', handleKeyboardNavigation);
  }, [handleKeyboardNavigation]);

  // Calculate and display growth rate if enabled
  const growthRateDisplay = useMemo(() => {
    if (!showGrowthRate || data.length < 2) return null;

    const latestValue = data[data.length - 1].value;
    const previousValue = data[data.length - 2].value;
    
    try {
      const growth = calculateGrowthRate(latestValue, previousValue, {
        valueType: metricType,
        validationRules: { precision: 1 }
      } as any);

      return (
        <div className="growth-rate" role="complementary" aria-label="Growth rate">
          {formatMetricValue(growth, 'percentage')} growth
        </div>
      );
    } catch {
      return null;
    }
  }, [data, showGrowthRate, metricType]);

  return (
    <div 
      style={{ height, direction: isRTL ? 'rtl' : 'ltr' }}
      role="region"
      aria-label={accessibilityLabel || 'Metric trend chart'}
    >
      <Line
        ref={chartRef}
        data={chartData}
        options={chartOptions}
        plugins={[{
          id: 'accessibility',
          afterDraw: (chart) => {
            const ctx = chart.ctx;
            ctx.save();
            ctx.textAlign = isRTL ? 'right' : 'left';
            ctx.restore();
          }
        }]}
      />
      {growthRateDisplay}
    </div>
  );
};

export default MetricTrendChart;