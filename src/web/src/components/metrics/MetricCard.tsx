import React from 'react';
import classnames from 'classnames';
import styled from '@emotion/styled';
import { Card } from '../common/Card';
import { ICompanyMetric } from '../../interfaces/ICompanyMetric';
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
  metric: ICompanyMetric;
  onEdit?: () => void;
  onDelete?: (id: string) => Promise<void>;
  className?: string;
  testId?: string;
}

const getCategoryColor = (category: string): string => {
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
  ({ metric, onEdit, onDelete, className, testId = 'metric-card' }) => {
    const formattedValue = React.useMemo(() => {
      try {
        return formatMetricValue(
          metric.value,
          metric.metric.valueType,
          metric.metric.validationRules.precision || 2,
          {
            ariaLabel: `${metric.metric.name}: ${metric.value}`,
          }
        );
      } catch (error) {
        console.error('Error formatting metric value:', error);
        return 'Error';
      }
    }, [metric]);

    const handleKeyDown = React.useCallback(
      (event: React.KeyboardEvent) => {
        if (onEdit && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          onEdit();
        }
      },
      [onEdit]
    );

    const handleDelete = React.useCallback(async () => {
      if (onDelete && window.confirm('Are you sure you want to delete this metric?')) {
        await onDelete(metric.id);
      }
    }, [metric.id, onDelete]);

    const cardClasses = classnames('metric-card', className);

    return (
      <StyledCard
        className={cardClasses}
        onClick={onEdit}
        elevation="low"
        interactive={!!onEdit}
        testId={testId}
        role={onEdit ? 'button' : undefined}
        ariaLabel={`${metric.metric.name} metric card`}
        isSelected={false}
        isInteractive={!!onEdit}
      >
        <CardContent>
          <Title>{metric.metric.name}</Title>
          <Value
            categoryColor={getCategoryColor(metric.metric.category)}
            dangerouslySetInnerHTML={{ __html: formattedValue }}
          />
          <Category>{metric.metric.category.toUpperCase()}</Category>
          {metric.metric.description && <Description>{metric.metric.description}</Description>}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
              aria-label="Delete metric"
            >
              Delete
            </button>
          )}
        </CardContent>
      </StyledCard>
    );
  }
);

MetricCard.displayName = 'MetricCard';

export type { MetricCardProps };
export { MetricCard };
