import React from 'react'; // ^18.2.0
import classnames from 'classnames'; // ^2.3.2
import { Card, CardProps } from '../common/Card';
import { IMetric, MetricCategory } from '../../interfaces/IMetric';
import { formatMetricValue } from '../../utils/numberFormatters';

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

const MetricCard: React.FC<MetricCardProps> = React.memo(({
  metric,
  value,
  selected = false,
  onClick,
  className,
  testId = 'metric-card',
}) => {
  const formattedValue = React.useMemo(() => {
    try {
      return formatMetricValue(value, metric.valueType, 
        metric.validationRules.precision || 2,
        { ariaLabel: `${metric.name}: ${value}` }
      );
    } catch (error) {
      console.error('Error formatting metric value:', error);
      return 'Error';
    }
  }, [value, metric]);

  const handleKeyDown = React.useCallback((event: React.KeyboardEvent) => {
    if (onClick && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      onClick();
    }
  }, [onClick]);

  const cardClasses = classnames(
    'metric-card',
    {
      'metric-card--selected': selected,
      'metric-card--interactive': !!onClick,
    },
    className
  );

  return (
    <Card
      className={cardClasses}
      onClick={onClick}
      elevation={selected ? 'medium' : 'low'}
      interactive={!!onClick}
      testId={testId}
      role="button"
      ariaLabel={`${metric.name} metric card${selected ? ', selected' : ''}`}
    >
      <div className="metric-card__content">
        <h3 className="metric-card__title">{metric.name}</h3>
        <div 
          className="metric-card__value"
          style={{ color: getCategoryColor(metric.category) }}
          dangerouslySetInnerHTML={{ __html: formattedValue }}
        />
        <div className="metric-card__category">
          {metric.category.toUpperCase()}
        </div>
        {metric.description && (
          <div className="metric-card__description">
            {metric.description}
          </div>
        )}
      </div>
      <style jsx>{`
        .metric-card {
          min-width: 200px;
          min-height: 120px;
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
          transition: all var(--transition-fast);
          position: relative;
        }

        .metric-card__content {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
        }

        .metric-card__title {
          font-size: var(--font-size-md);
          font-weight: var(--font-weight-medium);
          color: var(--color-text);
          line-height: var(--line-height-tight);
          margin: 0;
        }

        .metric-card__value {
          font-size: var(--font-size-xl);
          font-weight: var(--font-weight-bold);
          transition: color var(--transition-fast);
        }

        .metric-card__category {
          font-size: var(--font-size-xs);
          color: var(--color-text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .metric-card__description {
          font-size: var(--font-size-sm);
          color: var(--color-text-secondary);
          margin-top: var(--spacing-xs);
        }

        .metric-card--selected {
          transform: translateY(-2px);
        }

        .metric-card--interactive:hover {
          transform: translateY(-1px);
        }

        @media (max-width: var(--breakpoint-mobile)) {
          .metric-card {
            min-width: 100%;
          }

          .metric-card__value {
            font-size: var(--font-size-lg);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .metric-card,
          .metric-card__value {
            transition: none;
          }
        }
      `}</style>
    </Card>
  );
});

MetricCard.displayName = 'MetricCard';

export type { MetricCardProps };
export { MetricCard };