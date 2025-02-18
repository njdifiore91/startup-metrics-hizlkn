import React, { useState, useEffect, useCallback, useMemo } from 'react';
import styled from '@emotion/styled';
import { useMetrics } from '../../hooks/useMetrics';
import { useBenchmarks } from '../../hooks/useBenchmarks';
import { useAuth } from '../../hooks/useAuth';
import { IMetric, MetricCategory } from '../../interfaces/IMetric';
import { IUserMetric } from '../../interfaces/IUser';
import { USER_ROLES, REVENUE_RANGES } from '../../config/constants';
import LoadingSpinner from '../common/LoadingSpinner';
import MetricSelector from './MetricSelector';
import RevenueRangeSelector from './RevenueRangeSelector';
import { Button } from '../common/Button';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import DataSourceSelector from './DataSourceSelector';
import BenchmarkComparison from './BenchmarkComparison';
import { api } from '../../services/api';

type RevenueRange = '0-1M' | '1M-5M' | '5M-20M' | '20M-50M' | '50M+';

const Container = styled.div`
  padding: var(--spacing-lg);
  background-color: var(--color-background);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-sm);
`;

const Header = styled.div`
  margin-bottom: var(--spacing-lg);
`;

const Title = styled.h2`
  font-size: var(--font-size-xl);
  color: var(--color-text);
  margin-bottom: var(--spacing-sm);
`;

const Controls = styled.div`
  display: flex;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
  flex-wrap: wrap;
`;

const ChartContainer = styled.div`
  height: 400px;
  margin-top: var(--spacing-lg);
`;

const StatsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-md);
  margin-top: var(--spacing-lg);
`;

const StatCard = styled.div`
  padding: var(--spacing-md);
  background-color: var(--color-background-alt);
  border-radius: var(--border-radius-md);
  box-shadow: var(--shadow-xs);
`;

const StatLabel = styled.div`
  font-size: var(--font-size-sm);
  color: var(--color-text-light);
  margin-bottom: var(--spacing-xs);
`;

const StatValue = styled.div`
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
`;

const StatTitle = styled.div`
  font-size: var(--font-size-sm);
  color: var(--color-text-light);
  margin-bottom: var(--spacing-xs);
`;

interface BenchmarkData {
  id: string;
  metricId: string;
  sourceId: string;
  revenueRange: RevenueRange;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  reportDate: string;
  sampleSize: number;
  confidenceLevel: number;
  isStatisticallySignificant: boolean;
  dataQualityScore: number;
  isSeasonallyAdjusted: boolean;
  createdAt: string;
  updatedAt: string;
}

interface BenchmarkResponse {
  data: BenchmarkData[];
}

interface BenchmarkChartData {
  date: string;
  value: number;
  p10: number;
  p25: number;
  p75: number;
  p90: number;
  sampleSize: number;
  confidenceLevel: number;
  isStatisticallySignificant: boolean;
  dataQualityScore: number;
  isSeasonallyAdjusted: boolean;
  displayName?: string;
  type?: string;
  revenueRange?: RevenueRange;
}

interface DataSource {
  id: string;
  name: string;
  description: string;
  dataFormat: string;
}

interface BenchmarkAnalysisProps {
  selectedMetricType: string;
  selectedRevenueRange: RevenueRange;
  benchmarkData: BenchmarkData[];
  isAnalyst: boolean;
  isAdmin: boolean;
  userId: string;
}

export const BenchmarkAnalysis: React.FC<BenchmarkAnalysisProps> = ({
  selectedMetricType,
  selectedRevenueRange,
  benchmarkData,
  isAnalyst,
  isAdmin,
  userId,
}) => {
  const { user } = useAuth();
  const [selectedDataSource, setSelectedDataSource] = useState<string>('');
  const [chartData, setChartData] = useState<BenchmarkChartData[]>([]);
  const [localMetricType, setLocalMetricType] = useState<string>('');
  const [localRevenueRange, setLocalRevenueRange] = useState<RevenueRange | null>(null);
  const [userMetric, setUserMetric] = useState<IUserMetric | null>(null);
  const [currentMetric, setCurrentMetric] = useState<IMetric | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const {
    benchmarkData: fetchedBenchmarkData,
    loading: benchmarksLoading,
    error,
  } = useBenchmarks({
    metricId: localMetricType,
    revenueRange: localRevenueRange || undefined,
    dataSourceId: selectedDataSource,
  });

  // Cache for storing user metrics data
  const userMetricsCache = new Map<string, {
    data: IUserMetric | IMetric;
    timestamp: number;
  }>();

  const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes cache

  // Memoize handlers
  const handleMetricTypeChange = useCallback((type: string) => {
    setLocalMetricType(type);
  }, []);

  const handleRevenueRangeChange = useCallback((range: RevenueRange | null) => {
    setLocalRevenueRange(range);
  }, []);

  const handleDataSourceSelect = useCallback((dataSourceId: string, dataSource: DataSource) => {
    setSelectedDataSource(dataSourceId);
  }, []);

  const handleExport = useCallback(async () => {
    if (localMetricType) {
      console.log('Exporting data for metric:', localMetricType);
    }
  }, [localMetricType]);

  // Filter and format chart data
  useEffect(() => {
    if (!fetchedBenchmarkData || !localMetricType || !localRevenueRange) {
      setChartData([]);
      return;
    }

    console.log('Formatting chart data:', fetchedBenchmarkData);

    // Ensure we have an array of benchmark data
    const benchmarkDataArray = Array.isArray(fetchedBenchmarkData)
      ? fetchedBenchmarkData
      : [fetchedBenchmarkData];

    const sortedData = [...benchmarkDataArray].sort(
      (a, b) => new Date(a.reportDate).getTime() - new Date(b.reportDate).getTime()
    );

    const formattedData: BenchmarkChartData[] = sortedData.map((benchmark) => ({
      date: new Date(benchmark.reportDate).toLocaleDateString(),
      value: benchmark.p50,
      p10: benchmark.p10,
      p25: benchmark.p25,
      p75: benchmark.p75,
      p90: benchmark.p90,
      sampleSize: benchmark.sampleSize,
      confidenceLevel: benchmark.confidenceLevel,
      isStatisticallySignificant: benchmark.isStatisticallySignificant,
      dataQualityScore: benchmark.dataQualityScore,
      isSeasonallyAdjusted: benchmark.isSeasonallyAdjusted,
      displayName: localMetricType,
      type: localMetricType,
      revenueRange: localRevenueRange,
    }));

    console.log('Formatted chart data:', formattedData);
    setChartData(formattedData);
  }, [fetchedBenchmarkData, localMetricType, localRevenueRange]);

  // Fetch user metric when metric type changes with caching
  useEffect(() => {
    const fetchUserMetric = async () => {
      if (!localMetricType || !userId) return;

      // Check cache first
      const cacheKey = `${userId}-${localMetricType}`;
      const now = Date.now();
      const cachedData = userMetricsCache.get(cacheKey);
      
      if (cachedData && (now - cachedData.timestamp) < CACHE_DURATION) {
        setUserMetric(cachedData.data as IUserMetric);
        return;
      }

      try {
        const response = await api.get<{ data: IUserMetric }>(`/api/v1/metrics/user/${userId}/${localMetricType}`);
        if (response.data?.data) {
          const metricData = response.data.data;
          // Cache the response
          userMetricsCache.set(cacheKey, {
            data: metricData,
            timestamp: now
          });
          setUserMetric(metricData);
        }
      } catch (error) {
        console.error('Error fetching user metric:', error);
        setLocalError('Failed to fetch user metric data');
      }
    };

    // Use debounce for the API call
    const timeoutId = setTimeout(() => {
      fetchUserMetric();
    }, 1000); // 1 second debounce

    return () => {
      clearTimeout(timeoutId);
    };
  }, [localMetricType, userId]);

  // Fetch metric details when metric type changes with caching
  useEffect(() => {
    const fetchMetricDetails = async () => {
      if (!localMetricType) return;

      // Check cache first
      const cacheKey = `metric-${localMetricType}`;
      const now = Date.now();
      const cachedData = userMetricsCache.get(cacheKey);
      
      if (cachedData && (now - cachedData.timestamp) < CACHE_DURATION) {
        setCurrentMetric(cachedData.data as IMetric);
        return;
      }

      try {
        const response = await api.get<{ data: IMetric }>(`/api/v1/metrics/${localMetricType}`);
        if (response.data?.data) {
          const metricData = response.data.data;
          // Cache the response
          userMetricsCache.set(cacheKey, {
            data: metricData,
            timestamp: now
          });
          setCurrentMetric(metricData);
        }
      } catch (error) {
        console.error('Error fetching metric details:', error);
        setLocalError('Failed to fetch metric details');
      }
    };

    // Use debounce for the API call
    const timeoutId = setTimeout(() => {
      fetchMetricDetails();
    }, 1000); // 1 second debounce

    return () => {
      clearTimeout(timeoutId);
    };
  }, [localMetricType]);

  // Update chart component with better tooltips and formatting
  const ChartComponent = useMemo(
    () => (
      <ChartContainer>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tickFormatter={(date) => new Date(date).toLocaleDateString()} />
            <YAxis domain={['auto', 'auto']} tickFormatter={(value) => value.toLocaleString()} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div
                      style={{
                        backgroundColor: 'white',
                        padding: '10px',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                      }}
                    >
                      <p>
                        <strong>Date:</strong> {data.date}
                      </p>
                      <p>
                        <strong>P50 (Median):</strong> {data.value.toLocaleString()}
                      </p>
                      <p>
                        <strong>P25 - P75:</strong>{' '}
                        {`${data.p25.toLocaleString()} - ${data.p75.toLocaleString()}`}
                      </p>
                      <p>
                        <strong>P10 - P90:</strong>{' '}
                        {`${data.p10.toLocaleString()} - ${data.p90.toLocaleString()}`}
                      </p>
                      <p>
                        <strong>Sample Size:</strong> {data.sampleSize.toLocaleString()}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="value"
              stroke="var(--color-primary)"
              name="P50 (Median)"
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="p25"
              stroke="var(--color-secondary)"
              name="P25"
              dot={{ r: 3 }}
              strokeDasharray="5 5"
            />
            <Line
              type="monotone"
              dataKey="p75"
              stroke="var(--color-secondary)"
              name="P75"
              dot={{ r: 3 }}
              strokeDasharray="5 5"
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartContainer>
    ),
    [chartData]
  );

  const renderContent = useCallback(() => {
    if (benchmarksLoading) {
      return (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <LoadingSpinner />
          <div style={{ marginTop: '1rem', color: 'var(--color-text-light)' }}>
            Loading benchmark data...
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div role="alert" style={{ color: 'var(--color-error)', padding: '1rem' }}>
          {error}
        </div>
      );
    }

    if (!localMetricType || !localRevenueRange || !selectedDataSource) {
      return (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-light)' }}>
          Please select a metric type, revenue range, and data source to view benchmark data
        </div>
      );
    }

    if (!fetchedBenchmarkData) {
      return (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-light)' }}>
          No benchmark data available for the selected criteria
        </div>
      );
    }

    // Ensure we have an array of benchmark data
    const benchmarkDataArray = Array.isArray(fetchedBenchmarkData)
      ? fetchedBenchmarkData
      : [fetchedBenchmarkData];

    return (
      <>
        {ChartComponent}
        {userMetric && currentMetric && benchmarkDataArray[0] && (
          <BenchmarkComparison
            benchmark={benchmarkDataArray[0]}
            userMetric={userMetric}
            metric={currentMetric}
          />
        )}
        <StatsContainer>
          {benchmarkDataArray.map((data: BenchmarkData) => (
            <React.Fragment key={`${data.reportDate}`}>
              <StatCard>
                <StatTitle>P50 (Median)</StatTitle>
                <StatValue>{data.p50}</StatValue>
              </StatCard>
              <StatCard>
                <StatTitle>P25 - P75 Range</StatTitle>
                <StatValue>{`${data.p25} - ${data.p75}`}</StatValue>
              </StatCard>
              <StatCard>
                <StatTitle>Sample Size</StatTitle>
                <StatValue>{data.sampleSize}</StatValue>
              </StatCard>
              <StatCard>
                <StatTitle>Confidence Level</StatTitle>
                <StatValue>{`${(data.confidenceLevel * 100).toFixed(1)}%`}</StatValue>
              </StatCard>
              {isAnalyst && (
                <>
                  <StatCard>
                    <StatTitle>P10 - P90 Range</StatTitle>
                    <StatValue>{`${data.p10} - ${data.p90}`}</StatValue>
                  </StatCard>
                  <StatCard>
                    <StatTitle>Data Quality</StatTitle>
                    <StatValue>{data.dataQualityScore.toFixed(1)}</StatValue>
                  </StatCard>
                </>
              )}
              {isAdmin && (
                <>
                  <StatCard>
                    <StatTitle>Statistically Significant</StatTitle>
                    <StatValue>{data.isStatisticallySignificant ? 'Yes' : 'No'}</StatValue>
                  </StatCard>
                  <StatCard>
                    <StatTitle>Seasonally Adjusted</StatTitle>
                    <StatValue>{data.isSeasonallyAdjusted ? 'Yes' : 'No'}</StatValue>
                  </StatCard>
                </>
              )}
            </React.Fragment>
          ))}
        </StatsContainer>
      </>
    );
  }, [
    benchmarksLoading,
    error,
    localMetricType,
    localRevenueRange,
    selectedDataSource,
    fetchedBenchmarkData,
    ChartComponent,
    isAnalyst,
    isAdmin,
    userMetric,
    currentMetric,
  ]);

  return (
    <Container>
      <Header>
        <Title>Benchmark Analysis</Title>
      </Header>

      <Controls>
        <MetricSelector
          selectedMetricId={localMetricType}
          category={MetricCategory.OTHER}
          onMetricSelect={handleMetricTypeChange}
        />
        <RevenueRangeSelector
          selectedRange={localRevenueRange}
          onRangeChange={handleRevenueRangeChange}
        />
        <DataSourceSelector
          selectedDataSourceId={selectedDataSource}
          onDataSourceSelect={handleDataSourceSelect}
        />
      </Controls>

      {renderContent()}
    </Container>
  );
};

export default React.memo(BenchmarkAnalysis);
