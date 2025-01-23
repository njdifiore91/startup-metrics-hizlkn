import React from 'react';
import classnames from 'classnames';
import styled from '@emotion/styled';
import { Card } from '../common/Card';
import { IMetric, MetricCategory } from '../../interfaces/IMetric';
import { formatMetricValue } from '../../utils/numberFormatters';

const StyledCard = styled(Card)<{ isSelected: boolean; isInteractive: boolean }>`
  min-width: 200px;
  min-height: 120px;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  transition: all var(--transition-fast);
  position: relative;
  transform: ${({ isSelected }) => (isSelected ? 'translateY(-2px)' : 'none')};

  &:hover {
    transform: ${({ isInteractive }) => (isInteractive ? 'translateY(-1px)' : 'none')};
  }

  @media (max-width: var(--breakpoint-mobile)) {
    min-width: 100%;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const CardContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
`;

const Title = styled.h3`
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-medium);
  color: var(--color-text);
  line-height: var(--line-height-tight);
  margin: 0;
`;

const Value = styled.div<{ categoryColor: string }>`
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: ${({ categoryColor }) => categoryColor};
  transition: color var(--transition-fast);

  @media (max-width: var(--breakpoint-mobile)) {
    font-size: var(--font-size-lg);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const Category = styled.div`
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const Description = styled.div`
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-top: var(--spacing-xs);
`;

interface MetricCardProps {
  metric: IMetric;
  value: number;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
  testId?: string;
}

const getCategoryColor = (category: MetricCategory): string => {
  switch (category) {
    case 'financial':
      return 'var(--color-primary)';
    case 'growth':
      return 'var(--color-accent)';
    case 'operational':
      return 'var(--color-secondary)';
    default:
      return 'var(--color-text)';
  }
};

const MetricCard: React.FC<MetricCardProps> = React.memo(
  ({ metric, value, selected = false, onClick, className, testId = 'metric-card' }) => {
    const formattedValue = React.useMemo(() => {
      try {
        return formatMetricValue(value, metric.valueType, metric.validationRules.precision || 2, {
          ariaLabel: `${metric.name}: ${value}`,
        });
      } catch (error) {
        console.error('Error formatting metric value:', error);
        return 'Error';
      }
    }, [value, metric]);

    const handleKeyDown = React.useCallback(
      (event: React.KeyboardEvent) => {
        if (onClick && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          onClick();
        }
      },
      [onClick]
    );

    const cardClasses = classnames('metric-card', className);

    return (
      <StyledCard
        className={cardClasses}
        onClick={onClick}
        elevation={selected ? 'medium' : 'low'}
        interactive={!!onClick}
        testId={testId}
        role="button"
        ariaLabel={`${metric.name} metric card${selected ? ', selected' : ''}`}
        isSelected={selected}
        isInteractive={!!onClick}
      >
        <CardContent>
          <Title>{metric.name}</Title>
          <Value
            categoryColor={getCategoryColor(metric.category)}
            dangerouslySetInnerHTML={{ __html: formattedValue }}
          />
          <Category>{metric.category.toUpperCase()}</Category>
          {metric.description && <Description>{metric.description}</Description>}
        </CardContent>
      </StyledCard>
    );
  }
);

MetricCard.displayName = 'MetricCard';

export type { MetricCardProps };
export { MetricCard };
