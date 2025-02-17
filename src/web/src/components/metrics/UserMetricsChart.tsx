import React, { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import styled from '@emotion/styled';
import { api } from '../../services/api';

interface MetricType {
  id: string;
  name: string;
  displayName: string;
  description: string;
  type: string;
  valueType: string;
  frequency: string;
  unit: string;
  precision: number;
}

interface UserMetric {
  value: number;
  id: string;
  companyId: string;
  metricId: string;
  date: string;
  source: string;
  isVerified: boolean;
  verifiedBy: string | null;
  verifiedAt: string | null;
  notes: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  metric: MetricType;
}

interface ApiResponse {
  data: UserMetric[];
  meta: {
    responseTime: number;
    correlationId: string;
  };
}

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const ChartContainer = styled.div`
  width: 100%;
  margin: var(--spacing-md) 0;
  padding: var(--spacing-xl);
  background-color: var(--color-background);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-md);
  height: 500px;
  transition: all 0.3s ease;

  &:hover {
    box-shadow: var(--shadow-lg);
  }
`;

const LoadingMessage = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  font-size: var(--font-size-md);
  color: var(--color-text-secondary);
`;

const ErrorMessage = styled.div`
  color: var(--color-error);
  text-align: center;
  padding: var(--spacing-md);
  background-color: var(--color-error-light);
  border-radius: var(--border-radius-md);
  margin: var(--spacing-md) 0;
`;

interface UserMetricsChartProps {
  userId: string;
}

export const UserMetricsChart: React.FC<UserMetricsChartProps> = ({ userId }) => {
  const [metrics, setMetrics] = useState<UserMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get<ApiResponse>(`/api/v1/metrics/user/${userId}`);

        if (response.data) {
          setMetrics(response.data.data.data);
        } else {
          throw new Error('Invalid data format received from API');
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? `Error: ${err.message}${err.cause ? ` (Cause: ${err.cause})` : ''}`
            : 'Failed to fetch metrics data';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [userId]);

  // Get unique sorted dates from all metrics
  const uniqueDates = React.useMemo(() => {
    const dates = new Set(metrics.map((metric) => metric.date));
    return Array.from(dates).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  }, [metrics]);

  // Group metrics by metric type
  const groupedMetrics = React.useMemo(() => {
    const groups = new Map<string, UserMetric[]>();
    metrics.forEach((metric) => {
      const key = metric.metric.id;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)?.push(metric);
    });
    return Array.from(groups.values());
  }, [metrics]);

  const colors = [
    { border: 'rgb(59, 130, 246)', background: 'rgba(59, 130, 246, 0.1)' }, // Blue
    { border: 'rgb(16, 185, 129)', background: 'rgba(16, 185, 129, 0.1)' }, // Green
    { border: 'rgb(245, 158, 11)', background: 'rgba(245, 158, 11, 0.1)' }, // Yellow
    { border: 'rgb(239, 68, 68)', background: 'rgba(239, 68, 68, 0.1)' }, // Red
    { border: 'rgb(139, 92, 246)', background: 'rgba(139, 92, 246, 0.1)' }, // Purple
  ];

  const chartData: ChartData<'line'> = {
    labels: uniqueDates.map((date) => new Date(date).toLocaleDateString()),
    datasets: groupedMetrics.map((metricGroup, index) => {
      // Create a map of date to value for this metric group
      const dateValueMap = new Map(metricGroup.map((metric) => [metric.date, metric.value]));

      // For each unique date, get the corresponding value or null
      const values = uniqueDates.map((date) => dateValueMap.get(date) ?? null);

      return {
        label: metricGroup[0]?.metric.displayName || 'Unknown Metric',
        data: values,
        borderColor: colors[index % colors.length].border,
        backgroundColor: colors[index % colors.length].background,
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: colors[index % colors.length].border,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: colors[index % colors.length].border,
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 2,
        fill: true,
        spanGaps: true, // This will connect points even if there are missing values
      };
    }),
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          font: {
            size: 14,
            family: "'Inter', sans-serif",
          },
          usePointStyle: true,
          padding: 20,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        titleColor: '#1f2937',
        bodyColor: '#1f2937',
        bodyFont: {
          size: 14,
          family: "'Inter', sans-serif",
        },
        titleFont: {
          size: 14,
          family: "'Inter', sans-serif",
          weight: 'bold',
        },
        padding: 12,
        borderColor: 'rgba(0, 0, 0, 0.1)',
        borderWidth: 1,
        callbacks: {
          title: (tooltipItems) => {
            return new Date(metrics[tooltipItems[0].dataIndex].date).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            });
          },
          label: (context) => {
            const metricGroup = groupedMetrics[context.datasetIndex];
            const value = context.raw as number;
            const unit = metricGroup?.[0]?.metric.unit || '';
            const precision = metricGroup?.[0]?.metric.precision || 0;
            const formattedValue = new Intl.NumberFormat('en-US', {
              maximumFractionDigits: precision,
            }).format(value);
            return ` ${formattedValue} ${unit}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            size: 12,
            family: "'Inter', sans-serif",
          },
          maxRotation: 45,
          minRotation: 45,
        },
        title: {
          display: true,
          text: 'Date',
          font: {
            size: 14,
            family: "'Inter', sans-serif",
            weight: 'bold',
          },
          padding: { top: 10 },
        },
      },
      y: {
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          font: {
            size: 12,
            family: "'Inter', sans-serif",
          },
          callback: (value) => {
            return new Intl.NumberFormat('en-US', {
              maximumFractionDigits: metrics[0]?.metric.precision || 0,
            }).format(value as number);
          },
        },
        beginAtZero: true,
      },
    },
  };

  if (loading) {
    return (
      <ChartContainer>
        <LoadingMessage>Loading metrics data...</LoadingMessage>
      </ChartContainer>
    );
  }

  if (error) {
    return (
      <ChartContainer>
        <ErrorMessage>{error}</ErrorMessage>
      </ChartContainer>
    );
  }

  if (metrics.length === 0) {
    return (
      <ChartContainer>
        <LoadingMessage>No metrics data available</LoadingMessage>
      </ChartContainer>
    );
  }

  return (
    <ChartContainer>
      <Line data={chartData} options={options} />
    </ChartContainer>
  );
};
