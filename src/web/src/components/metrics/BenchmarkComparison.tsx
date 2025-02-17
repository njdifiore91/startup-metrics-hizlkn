import React from 'react';
import styled from '@emotion/styled';
import { BenchmarkData } from '../../hooks/useBenchmarks';
import { IUserMetric } from '../../interfaces/IUser';
import { IMetric } from '../../interfaces/IMetric';
import { BenchmarkChart } from './BenchmarkChart';

const ComparisonContainer = styled.div`
  margin-top: var(--spacing-lg);
  padding: var(--spacing-md);
  background-color: var(--color-background-alt);
  border-radius: var(--border-radius-md);
  box-shadow: var(--shadow-sm);
`;

const ComparisonTitle = styled.h3`
  font-size: var(--font-size-lg);
  color: var(--color-text);
  margin-bottom: var(--spacing-md);
`;

const ComparisonGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing-md);
  margin-top: var(--spacing-md);
`;

const ComparisonCard = styled.div<{ performance: 'above' | 'below' | 'average' }>`
  padding: var(--spacing-md);
  background-color: ${({ performance }) => {
    switch (performance) {
      case 'above':
        return 'var(--color-success-light)';
      case 'below':
        return 'var(--color-error-light)';
      default:
        return 'var(--color-warning-light)';
    }
  }};
  border-radius: var(--border-radius-sm);
`;

const ComparisonLabel = styled.div`
  font-size: var(--font-size-sm);
  color: var(--color-text-light);
  margin-bottom: var(--spacing-xs);
`;

const ComparisonValue = styled.div`
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
`;

const ComparisonDetail = styled.div`
  font-size: var(--font-size-sm);
  color: var(--color-text);
  margin-top: var(--spacing-xs);
`;

const PerformanceIndicator = styled.div<{ trend: 'up' | 'down' | 'neutral' }>`
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  color: ${({ trend }) => {
    switch (trend) {
      case 'up':
        return 'var(--color-success)';
      case 'down':
        return 'var(--color-error)';
      default:
        return 'var(--color-warning)';
    }
  }};
  margin-top: var(--spacing-xs);
`;

interface BenchmarkComparisonProps {
  benchmark: BenchmarkData;
  userMetric: IUserMetric;
  metric: IMetric;
}

export const BenchmarkComparison: React.FC<BenchmarkComparisonProps> = ({
  benchmark,
  userMetric,
  metric,
}) => {
  const formatValue = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      signDisplay: 'always',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(value / 100);
  };

  const calculatePerformance = (value: number, benchmark: BenchmarkData) => {
    if (value > benchmark.p75) return 'above';
    if (value < benchmark.p25) return 'below';
    return 'average';
  };

  const calculatePercentile = (value: number, benchmark: BenchmarkData) => {
    const percentiles = [
      { value: benchmark.p90, percentile: 90 },
      { value: benchmark.p75, percentile: 75 },
      { value: benchmark.p50, percentile: 50 },
      { value: benchmark.p25, percentile: 25 },
      { value: benchmark.p10, percentile: 10 },
    ];

    // If value is above p90 or below p10
    if (value >= benchmark.p90) return 90;
    if (value <= benchmark.p10) return 10;

    // Find the two closest percentiles
    for (let i = 0; i < percentiles.length - 1; i++) {
      const upper = percentiles[i];
      const lower = percentiles[i + 1];
      if (value <= upper.value && value >= lower.value) {
        // Linear interpolation
        const range = upper.value - lower.value;
        const position = value - lower.value;
        const percentage = position / range;
        return lower.percentile + (upper.percentile - lower.percentile) * percentage;
      }
    }

    return 50; // Fallback
  };

  const calculateComparison = (value: number, benchmark: BenchmarkData) => {
    const percentile = calculatePercentile(value, benchmark);
    const percentDiffFromMedian = ((value - benchmark.p50) / benchmark.p50) * 100;
    const performance = calculatePerformance(value, benchmark) as 'above' | 'below' | 'average';

    let trend: 'up' | 'down' | 'neutral';
    if (percentDiffFromMedian > 5) trend = 'up';
    else if (percentDiffFromMedian < -5) trend = 'down';
    else trend = 'neutral';

    return {
      percentile,
      percentDiffFromMedian,
      performance,
      trend,
    };
  };

  const comparison = calculateComparison(userMetric.value, benchmark);

  return (
    <ComparisonContainer>
      <ComparisonTitle>Benchmark Analysis</ComparisonTitle>

      <BenchmarkChart benchmark={benchmark} userMetric={userMetric} metric={metric} />

      <ComparisonGrid>
        <ComparisonCard performance={comparison.performance}>
          <ComparisonLabel>Your {metric.name}</ComparisonLabel>
          <ComparisonValue>{formatValue(userMetric.value)}</ComparisonValue>
          <ComparisonDetail>Percentile: {formatValue(comparison.percentile)}</ComparisonDetail>
          <PerformanceIndicator trend={comparison.trend}>
            {comparison.trend === 'up' ? '↑' : comparison.trend === 'down' ? '↓' : '→'}
            {formatPercentage(comparison.percentDiffFromMedian)} vs. Industry Median
          </PerformanceIndicator>
        </ComparisonCard>
        <ComparisonCard performance="average">
          <ComparisonLabel>Industry Benchmarks</ComparisonLabel>
          <ComparisonValue>{formatValue(benchmark.p50)}</ComparisonValue>
          <ComparisonDetail>Top Quartile (P75): {formatValue(benchmark.p75)}</ComparisonDetail>
          <ComparisonDetail>Bottom Quartile (P25): {formatValue(benchmark.p25)}</ComparisonDetail>
        </ComparisonCard>
      </ComparisonGrid>
    </ComparisonContainer>
  );
};

export default BenchmarkComparison;
