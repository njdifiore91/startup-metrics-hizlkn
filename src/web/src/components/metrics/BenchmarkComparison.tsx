import React from 'react';
import styled from '@emotion/styled';
import { BenchmarkData } from '../../hooks/useBenchmarks';
import { IUserMetric } from '../../interfaces/IUser';
import { IMetric } from '../../interfaces/IMetric';

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
  color: var(--color-text);
`;

const ComparisonDifference = styled.div<{ isPositive: boolean }>`
  font-size: var(--font-size-sm);
  color: ${({ isPositive }) => (isPositive ? 'var(--color-success)' : 'var(--color-error)')};
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
    switch (metric.valueType) {
      case 'currency':
        return `$${value.toLocaleString()}`;
      case 'percentage':
        return `${value.toFixed(1)}%`;
      default:
        return value.toLocaleString();
    }
  };

  const calculatePerformance = (value: number, benchmark: BenchmarkData) => {
    if (value >= benchmark.p75) return 'above';
    if (value <= benchmark.p25) return 'below';
    return 'average';
  };

  const calculatePercentileDifference = (value: number, benchmark: BenchmarkData) => {
    const percentiles = [
      { value: benchmark.p90, label: '90th' },
      { value: benchmark.p75, label: '75th' },
      { value: benchmark.p50, label: '50th' },
      { value: benchmark.p25, label: '25th' },
      { value: benchmark.p10, label: '10th' },
    ];

    let nearestPercentile = percentiles[0];
    let minDiff = Math.abs(value - percentiles[0].value);

    for (const percentile of percentiles) {
      const diff = Math.abs(value - percentile.value);
      if (diff < minDiff) {
        minDiff = diff;
        nearestPercentile = percentile;
      }
    }

    const difference = ((value - nearestPercentile.value) / nearestPercentile.value) * 100;
    return {
      percentile: nearestPercentile.label,
      difference,
      isPositive: difference > 0,
    };
  };

  const performance = calculatePerformance(userMetric.value, benchmark);
  const { percentile, difference, isPositive } = calculatePercentileDifference(
    userMetric.value,
    benchmark
  );

  return (
    <ComparisonContainer>
      <ComparisonTitle>Your Performance</ComparisonTitle>
      <ComparisonGrid>
        <ComparisonCard performance={performance}>
          <ComparisonLabel>Your Value</ComparisonLabel>
          <ComparisonValue>{formatValue(userMetric.value)}</ComparisonValue>
          <ComparisonDifference isPositive={isPositive}>
            {isPositive ? '↑' : '↓'} {Math.abs(difference).toFixed(1)}% from {percentile} percentile
          </ComparisonDifference>
        </ComparisonCard>

        <ComparisonCard performance="average">
          <ComparisonLabel>Industry Median (P50)</ComparisonLabel>
          <ComparisonValue>{formatValue(benchmark.p50)}</ComparisonValue>
          <ComparisonDifference isPositive={userMetric.value >= benchmark.p50}>
            {userMetric.value >= benchmark.p50 ? '↑' : '↓'}{' '}
            {Math.abs(((userMetric.value - benchmark.p50) / benchmark.p50) * 100).toFixed(1)}%
            compared to median
          </ComparisonDifference>
        </ComparisonCard>

        <ComparisonCard performance={userMetric.value >= benchmark.p75 ? 'above' : 'below'}>
          <ComparisonLabel>Top Quartile (P75)</ComparisonLabel>
          <ComparisonValue>{formatValue(benchmark.p75)}</ComparisonValue>
          <ComparisonDifference isPositive={userMetric.value >= benchmark.p75}>
            {userMetric.value >= benchmark.p75 ? '↑' : '↓'}{' '}
            {Math.abs(((userMetric.value - benchmark.p75) / benchmark.p75) * 100).toFixed(1)}%
            compared to top quartile
          </ComparisonDifference>
        </ComparisonCard>
      </ComparisonGrid>
    </ComparisonContainer>
  );
};

export default BenchmarkComparison;
