import React from 'react';
import classnames from 'classnames';
import styled from '@emotion/styled';
import { Card } from '../common/Card';
import { ICompanyMetric } from '../../interfaces/ICompanyMetric';
import { formatMetricValue } from '../../utils/numberFormatters';
import { MetricValueType } from '../../interfaces/IMetric';
import { 
  TrendingUp, 
  TrendingDown, 
  TrendingFlat,
  AttachMoney,
  ShowChart,
  Speed,
  Category as CategoryIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Timeline,
  ExpandMore,
  ExpandLess
} from '@mui/icons-material';
import { 
  IconButton, 
  Tooltip, 
  Chip, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Paper,
  Collapse,
  Button
} from '@mui/material';
import { format } from 'date-fns';

const StyledCard = styled(Card)<{ isSelected: boolean; isInteractive: boolean }>`
  width: 100%;
  min-height: 180px;
  display: flex;
  flex-direction: column;
  gap: 0;
  transition: all var(--transition-fast);
  position: relative;
  background: white;
  border-radius: 12px;
  border: 1px solid var(--border-color-light);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  padding: var(--spacing-xl);

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  // margin-bottom: var(--spacing-lg);
  // padding-bottom: var(--spacing-lg);
  // border-bottom: 1px solid var(--border-color-light);
`;

const HeaderLeft = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  flex: 1;
  margin-right: var(--spacing-xl);
`;

const HeaderRight = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--spacing-md);
`;

const Title = styled.div`
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  
  h3 {
    font-size: 1.5rem;
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-dark);
    line-height: 1.3;
    margin: 0;
  }

  .category-icon {
    width: 32px;
    height: 32px;
    padding: 6px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
`;

const Value = styled.div<{ categoryColor: string }>`
  font-size: 2.75rem;
  font-weight: var(--font-weight-bold);
  color: ${({ categoryColor }) => categoryColor};
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  line-height: 1;
  font-feature-settings: 'tnum';
  font-variant-numeric: tabular-nums;

  .trend-icon {
    font-size: 1.75rem;
    margin-left: var(--spacing-sm);
  }

  @media (max-width: var(--breakpoint-mobile)) {
    font-size: 2.25rem;
  }
`;

const CategoryChip = styled(Chip)`
  text-transform: capitalize;
  font-weight: var(--font-weight-medium);
  font-size: 0.85rem;
  height: 28px;
  border-radius: 14px;
  padding: 0 var(--spacing-sm);
`;

const Description = styled.div`
  font-size: 1rem;
  color: var(--color-text-secondary);
  line-height: 1.6;
  max-width: 600px;
`;

const StyledTableContainer = styled(TableContainer)`
  margin-top: var(--spacing-lg);
  border: 1px solid var(--border-color-light);
  border-radius: 8px;
  overflow: hidden;
  
  .MuiTable-root {
    min-width: 650px;
  }

  .MuiTableCell-head {
    font-weight: var(--font-weight-semibold);
    background-color: var(--color-background-light);
    color: var(--color-text-dark);
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: var(--spacing-md) var(--spacing-lg);
  }

  .MuiTableCell-root {
    padding: var(--spacing-md) var(--spacing-lg);
    font-size: 0.95rem;
  }

  .MuiTableRow-root:hover {
    background-color: var(--color-background-hover);
  }
`;

const MetaData = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9rem;
  color: var(--color-text-light);
  margin-top: var(--spacing-lg);
  padding-top: var(--spacing-lg);
  border-top: 1px solid var(--border-color-light);

  .meta-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);

    .icon {
      color: var(--color-text-light);
      font-size: 1.1rem;
    }

    .total {
      font-weight: var(--font-weight-semibold);
      color: var(--color-text-dark);
    }
  }
`;

const Actions = styled.div`
  display: flex;
  gap: var(--spacing-sm);

  .MuiIconButton-root {
    color: var(--color-text-light);
    padding: 8px;

    &:hover {
      background-color: var(--color-background-light);
      color: var(--color-primary);
    }
  }
`;

const ExpandButton = styled(Button)`
  margin-top: var(--spacing-lg);
  color: var(--color-text-dark);
  font-weight: var(--font-weight-medium);
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--border-color-light);
  border-radius: 8px;
  
  &:hover {
    background-color: var(--color-background-light);
    border-color: var(--border-color-normal);
  }

  .MuiButton-startIcon {
    margin-right: var(--spacing-sm);
    color: var(--color-text-light);
  }
`;

interface MetricCardProps {
  metric: ICompanyMetric;
  historicalRecords: ICompanyMetric[];
  onEdit?: () => void;
  onDelete?: (id: string) => Promise<void>;
  className?: string;
  testId?: string;
}

const getCategoryColor = (category: string): string => {
  switch (category.toLowerCase()) {
    case 'financial':
      return '#2E7D32'; // Dark green
    case 'growth':
      return '#1976D2'; // Dark blue
    case 'operational':
      return '#7B1FA2'; // Purple
    case 'marketing':
      return '#C62828'; // Dark red
    case 'product':
      return '#F57C00'; // Orange
    default:
      return '#455A64'; // Blue grey
  }
};

const getCategoryIcon = (category: string) => {
  switch (category.toLowerCase()) {
    case 'financial':
      return <AttachMoney />;
    case 'growth':
      return <ShowChart />;
    case 'operational':
      return <Speed />;
    default:
      return <CategoryIcon />;
  }
};

const getTrendIcon = (value: number, previousValue?: number) => {
  if (!previousValue) return <TrendingFlat />;
  if (value > previousValue) return <TrendingUp color="success" />;
  if (value < previousValue) return <TrendingDown color="error" />;
  return <TrendingFlat color="action" />;
};

const MetricCard: React.FC<MetricCardProps> = React.memo(
  ({ metric, historicalRecords, onEdit, onDelete, className, testId = 'metric-card' }) => {
    const [isExpanded, setIsExpanded] = React.useState(false);

    const formattedValue = React.useMemo(() => {
      try {
        if (!metric.metric) {
          return 'N/A';
        }
        const value = formatMetricValue(
          metric.value,
          metric.metric.valueType as MetricValueType,
          metric.metric.validationRules?.precision || 2,
          {
            ariaLabel: `${metric.metric.name}: ${metric.value}`,
          }
        );
        return value.replace(/<[^>]+>/g, '');
      } catch (error) {
        console.error('Error formatting metric value:', error);
        return 'Error';
      }
    }, [metric]);

    const totalValue = React.useMemo(() => {
      const allRecords = [...historicalRecords];
      return allRecords.reduce((sum, record) => sum + record.value, 0);
    }, [historicalRecords]);

    const formattedTotal = React.useMemo(() => {
      try {
        if (!metric.metric) return 'N/A';
        const value = formatMetricValue(
          totalValue,
          metric.metric.valueType as MetricValueType,
          metric.metric.validationRules?.precision || 2,
          {
            ariaLabel: `Total ${metric.metric.name}: ${totalValue}`,
          }
        );
        return value.replace(/<[^>]+>/g, '');
      } catch (error) {
        return 'Error';
      }
    }, [totalValue, metric]);


    const handleDelete = React.useCallback(async () => {
      if (onDelete && window.confirm('Are you sure you want to delete this metric?')) {
        await onDelete(metric.id);
      }
    }, [metric.id, onDelete]);

    const toggleExpand = () => setIsExpanded(!isExpanded);

    const cardClasses = classnames('metric-card', className);
    const metricName = metric.metric?.displayName || 'Unknown Metric';
    const metricCategory = metric.metric?.category || 'operational';
    const categoryColor = getCategoryColor(metricCategory);

    return (
      <StyledCard
        className={cardClasses}
        elevation="low"
        interactive={false}
        testId={testId}
        ariaLabel={`${metricName} metric card`}
        isSelected={false}
        isInteractive={false}
      >
        <CardHeader>
          <HeaderLeft>
            <Title>
              <div 
                className="category-icon" 
                style={{ 
                  backgroundColor: `${categoryColor}15`,
                  color: categoryColor 
                }}
              >
                {getCategoryIcon(metricCategory)}
              </div>
              <h3>{metricName}</h3>
              <CategoryChip 
                label={metricCategory}
                size="small"
                style={{ 
                  backgroundColor: `${categoryColor}10`,
                  color: categoryColor,
                  border: `1px solid ${categoryColor}30`
                }}
              />
            </Title>
            {metric.metric?.description && (
              <Description>{metric.metric.description}</Description>
            )}
          </HeaderLeft>
          <HeaderRight>
            <Value categoryColor={categoryColor}>
              {formattedTotal}
              <span className="trend-icon">
                {getTrendIcon(metric.value, metric.previousValue)}
              </span>
            </Value>
            <Actions>
              {onEdit && (
                <Tooltip title="Edit metric">
                  <IconButton size="small" onClick={onEdit}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              {onDelete && (
                <Tooltip title="Delete metric">
                  <IconButton size="small" onClick={handleDelete}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Actions>
          </HeaderRight>
        </CardHeader>

        <MetaData>
          <div className="meta-item">
            <Timeline className="icon" />
            <span>{historicalRecords.length} records</span>
            <span>•</span>
            <span>Total: <span className="total">{formattedTotal}</span></span>
          </div>
          <div className="meta-item">
            Last updated {format(new Date(metric.updatedAt), 'MMM d, yyyy')}
          </div>
        </MetaData>

        <ExpandButton
          onClick={toggleExpand}
          startIcon={isExpanded ? <ExpandLess /> : <ExpandMore />}
          fullWidth
        >
          {isExpanded ? 'Hide Historical Records' : 'Show Historical Records'}
        </ExpandButton>

        <Collapse in={isExpanded}>
          <StyledTableContainer>
            <Table size="medium">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Value</TableCell>
                  <TableCell>Source</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Notes</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {historicalRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>{format(new Date(record.date), 'MMM d, yyyy')}</TableCell>
                    <TableCell>
                      <strong>
                        {formatMetricValue(
                          record.value,
                          metric.metric?.valueType as MetricValueType,
                          metric.metric?.validationRules?.precision || 2,
                          { ariaLabel: `${metricName}: ${record.value}` }
                        ).replace(/<[^>]+>/g, '')}
                      </strong>
                    </TableCell>
                    <TableCell>{record.source || '-'}</TableCell>
                    <TableCell>
                      <Chip 
                        size="small" 
                        label={record.isVerified ? 'Verified' : 'Pending'} 
                        color={record.isVerified ? 'success' : 'default'}
                        style={{ minWidth: 80 }}
                      />
                    </TableCell>
                    <TableCell>{record.notes || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </StyledTableContainer>
        </Collapse>
      </StyledCard>
    );
  }
);

MetricCard.displayName = 'MetricCard';

export type { MetricCardProps };
export { MetricCard };
