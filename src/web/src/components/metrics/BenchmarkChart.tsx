import React, { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  ChartData,
  TimeScale,
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import { Chart } from 'react-chartjs-2';
import styled from '@emotion/styled';
import { BenchmarkData } from '../../hooks/useBenchmarks';
import { IUserMetric } from '../../interfaces/IUser';
import { IMetric } from '../../interfaces/IMetric';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchCompanyMetrics, selectAllMetrics } from '../../store/companyMetricsSlice';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

const ChartContainer = styled.div`
  width: 100%;
  margin: var(--spacing-md) 0;
  padding: var(--spacing-md);
  background-color: var(--color-background);
  border-radius: var(--border-radius-md);
  box-shadow: var(--shadow-sm);
`;

const ChartTitle = styled.h3`
  font-size: var(--font-size-lg);
  color: var(--color-text);
  margin-bottom: var(--spacing-md);
  text-align: center;
`;

interface BenchmarkChartProps {
  benchmark: BenchmarkData;
  userMetric: IUserMetric;
  metric: IMetric;
}

const formatValue = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
  }).format(value);
};

export const BenchmarkChart: React.FC<BenchmarkChartProps> = ({
  benchmark,
  userMetric,
  metric,
}) => {
  const dispatch = useAppDispatch();
  const companyMetrics = useAppSelector(selectAllMetrics);
  const [isLoading, setIsLoading] = useState(true);

  // Filter metrics for the current metric type and sort by date
  const metricHistory = companyMetrics
    .filter((m) => m.metricId === metric.id)
    .map((m) => ({
      date: new Date(m.createdAt).toISOString(),
      value: m.value,
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  useEffect(() => {
    const loadCompanyMetrics = async () => {
      try {
        setIsLoading(true);
        await dispatch(fetchCompanyMetrics()).unwrap();
      } catch (error) {
        console.error('Error fetching company metrics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCompanyMetrics();
  }, [dispatch, metric.id]);

  // Calculate min and max including historical data
  const allValues = [
    benchmark.p10,
    benchmark.p25,
    benchmark.p50,
    benchmark.p75,
    benchmark.p90,
    userMetric.value,
    ...metricHistory.map((d) => d.value),
  ];

  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);
  const padding = (maxValue - minValue) * 0.1;

  // Create combined chart data
  const chartData: ChartData<'bar' | 'line'> = {
    labels: ['P10', 'P25', 'P50', 'P75', 'P90'],
    datasets: [
      {
        type: 'bar' as const,
        label: 'Benchmarks',
        data: [benchmark.p10, benchmark.p25, benchmark.p50, benchmark.p75, benchmark.p90],
        backgroundColor: 'rgba(136, 132, 216, 0.8)',
        borderColor: 'rgba(136, 132, 216, 1)',
        borderWidth: 1,
        borderRadius: 4,
        order: 3,
        yAxisID: 'y',
      },
      {
        type: 'line' as const,
        label: 'User Company Metrics',
        data: new Array(5).fill(userMetric.value),
        borderColor: '#ff7300',
        borderWidth: 2,
        pointRadius: 4,
        pointStyle: 'circle',
        fill: false,
        order: 1,
        yAxisID: 'y',
      },
      ...(metricHistory.length > 0
        ? [
            {
              type: 'line' as const,
              label: 'Historical Trend',
              data: new Array(5).fill(
                metricHistory.reduce((acc, curr) => acc + curr.value, 0) / metricHistory.length
              ),
              borderColor: '#4CAF50',
              borderWidth: 2,
              borderDash: [5, 5],
              pointRadius: 0,
              fill: false,
              order: 2,
              yAxisID: 'y',
            },
          ]
        : []),
    ],
  };

  const options: ChartOptions<'bar' | 'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.raw as number;
            const label = context.dataset.label || '';
            if (label === 'Historical Trend') {
              return `Average Historical Value: ${formatValue(value)}`;
            }
            return `${label}: ${formatValue(value)}`;
          },
          afterBody: () => {
            if (metricHistory.length > 0) {
              return [
                '',
                'Recent Historical Values:',
                ...metricHistory
                  .slice(-3)
                  .reverse()
                  .map((d) => `${new Date(d.date).toLocaleDateString()}: ${formatValue(d.value)}`),
              ];
            }
            return [];
          },
        },
      },
      legend: {
        position: 'top' as const,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        title: {
          display: true,
          text: 'Percentiles',
        },
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        min: minValue - padding,
        max: maxValue + padding,
        ticks: {
          callback: (tickValue: number | string) => formatValue(Number(tickValue)),
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
    },
  };

  if (isLoading) {
    return <div>Loading company metrics...</div>;
  }

  return (
    <ChartContainer>
      <ChartTitle>{metric.name} Benchmark Distribution</ChartTitle>
      <div style={{ position: 'relative', height: '400px' }}>
        <Chart type="bar" data={chartData} options={options} />
      </div>
    </ChartContainer>
  );
};
