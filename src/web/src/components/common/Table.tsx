import React, { useState, useCallback, useRef, useEffect } from 'react'; // v18.2.0
import classnames from 'classnames'; // v2.3.1
import LoadingSpinner from './LoadingSpinner.js';
import { theme } from '../../config/theme.js';

// Column configuration interface
export interface TableColumn {
  id: string;
  header: string;
  accessor: string | ((row: any) => any);
  sortable?: boolean;
  width?: string;
  renderCell?: (value: any, row: any) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
}

// Table props interface
export interface TableProps {
  columns: TableColumn[];
  data: any[];
  isLoading?: boolean;
  sortable?: boolean;
  className?: string;
  emptyMessage?: string;
  onSort?: (columnId: string, direction: 'asc' | 'desc') => void;
  virtualized?: boolean;
  rowHeight?: number;
}

const Table: React.FC<TableProps> = ({
  columns,
  data,
  isLoading = false,
  sortable = true,
  className,
  emptyMessage = 'No data available',
  onSort,
  virtualized = false,
  rowHeight = 48,
}) => {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const tableRef = useRef<HTMLTableElement>(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 50 });

  // Handle column sorting
  const handleSort = useCallback((columnId: string, event: React.MouseEvent | React.KeyboardEvent) => {
    if (!sortable || (event.type === 'keydown' && (event as React.KeyboardEvent).key !== 'Enter')) {
      return;
    }

    const newDirection = columnId === sortColumn && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortColumn(columnId);
    setSortDirection(newDirection);
    onSort?.(columnId, newDirection);

    // Manage focus for accessibility
    const target = event.target as HTMLElement;
    target.setAttribute('aria-sort', newDirection);
  }, [sortable, sortColumn, sortDirection, onSort]);

  // Virtual scrolling calculation
  useEffect(() => {
    if (!virtualized || !tableRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const tableHeight = tableRef.current?.clientHeight ?? 0;
        const visibleRows = Math.ceil(tableHeight / rowHeight);
        const buffer = Math.floor(visibleRows / 2);

        const start = Math.max(0, visibleRange.start - buffer);
        const end = Math.min(data.length, visibleRange.end + buffer);

        setVisibleRange({ start, end });
      },
      { root: tableRef.current, threshold: 0.1 }
    );

    observer.observe(tableRef.current);
    return () => observer.disconnect();
  }, [virtualized, rowHeight, data.length, visibleRange]);

  // Render table header
  const renderHeader = () => (
    <thead>
      <tr>
        {columns.map((column) => (
          <th
            key={column.id}
            style={{
              width: column.width,
              textAlign: column.align || 'left',
              padding: `${theme.spacing.sm}px`,
              fontWeight: theme.typography.fontWeight.bold,
              borderBottom: `1px solid ${theme.colors.secondary}`,
            }}
            onClick={column.sortable ? (e) => handleSort(column.id, e) : undefined}
            onKeyDown={column.sortable ? (e) => handleSort(column.id, e) : undefined}
            tabIndex={column.sortable ? 0 : -1}
            role={column.sortable ? 'columnheader button' : 'columnheader'}
            aria-sort={sortColumn === column.id ? sortDirection : undefined}
          >
            <div className="header-content">
              {column.header}
              {column.sortable && sortColumn === column.id && (
                <span className="sort-indicator" aria-hidden="true">
                  {sortDirection === 'asc' ? ' ↑' : ' ↓'}
                </span>
              )}
            </div>
          </th>
        ))}
      </tr>
    </thead>
  );

  // Render table rows
  const renderRows = () => {
    if (isLoading) {
      return (
        <tr>
          <td colSpan={columns.length} style={{ textAlign: 'center', padding: `${theme.spacing.md}px` }}>
            <LoadingSpinner size="32px" color={theme.colors.primary} />
          </td>
        </tr>
      );
    }

    if (!data.length) {
      return (
        <tr>
          <td
            colSpan={columns.length}
            style={{ textAlign: 'center', padding: `${theme.spacing.md}px`, color: theme.colors.text }}
          >
            {emptyMessage}
          </td>
        </tr>
      );
    }

    const rowsToRender = virtualized ? data.slice(visibleRange.start, visibleRange.end) : data;

    return rowsToRender.map((row, index) => (
      <tr
        key={index}
        style={{
          backgroundColor: index % 2 === 0 ? theme.colors.surface : theme.colors.background,
          height: rowHeight,
        }}
      >
        {columns.map((column) => {
          const value = typeof column.accessor === 'function'
            ? column.accessor(row)
            : row[column.accessor];

          return (
            <td
              key={column.id}
              style={{
                padding: `${theme.spacing.sm}px`,
                textAlign: column.align || 'left',
                borderBottom: `1px solid ${theme.colors.secondary}20`,
              }}
            >
              {column.renderCell ? column.renderCell(value, row) : value}
            </td>
          );
        })}
      </tr>
    ));
  };

  return (
    <div
      className={classnames('table-container', className)}
      style={{
        overflowX: 'auto',
        position: 'relative',
        maxWidth: '100%',
      }}
    >
      <table
        ref={tableRef}
        role="grid"
        aria-busy={isLoading}
        aria-colcount={columns.length}
        aria-rowcount={data.length}
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontFamily: theme.typography.fontFamily.primary,
          fontSize: theme.typography.fontSize.md,
        }}
      >
        {renderHeader()}
        <tbody>
          {renderRows()}
        </tbody>
      </table>
    </div>
  );
};

Table.displayName = 'Table';

export default Table;