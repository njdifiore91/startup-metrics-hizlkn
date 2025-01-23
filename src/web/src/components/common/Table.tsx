import React, { useState, useCallback, useRef, useEffect } from 'react'; // v18.2.0
import classnames from 'classnames'; // v2.3.1
import LoadingSpinner from './LoadingSpinner';
import { theme } from '../../config/theme';

// Generic type for table data
export type TableData = Record<string, unknown>;

// Column configuration interface
export interface TableColumn<T extends TableData = TableData> {
  id: string;
  header: string;
  accessor: keyof T | ((row: T) => unknown);
  sortable?: boolean;
  width?: string;
  renderCell?: (value: unknown, row: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
}

// Table props interface
export interface TableProps<T extends TableData = TableData> {
  columns: TableColumn<T>[];
  data: T[];
  isLoading?: boolean;
  sortable?: boolean;
  className?: string;
  emptyMessage?: string;
  onSort?: (columnId: string, direction: 'asc' | 'desc') => void;
  virtualized?: boolean;
  rowHeight?: number;
}

const Table = <T extends TableData>({
  columns,
  data,
  isLoading = false,
  sortable = true,
  className,
  emptyMessage = 'No data available',
  onSort,
  virtualized = false,
  rowHeight = 48,
}: TableProps<T>): React.ReactElement => {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const tableRef = useRef<HTMLTableElement>(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 50 });

  // Handle column sorting
  const handleSort = useCallback(
    (columnId: string, event: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>) => {
      if (
        !sortable ||
        (event.type === 'keydown' && (event as React.KeyboardEvent).key !== 'Enter')
      ) {
        return;
      }

      const newDirection = sortColumn === columnId && sortDirection === 'asc' ? 'desc' : 'asc';
      setSortColumn(columnId);
      setSortDirection(newDirection);
      onSort?.(columnId, newDirection);
    },
    [sortable, sortColumn, sortDirection, onSort]
  );

  // Handle scroll for virtualization
  useEffect(() => {
    if (!virtualized || !tableRef.current) return;

    const handleScroll = (): void => {
      const table = tableRef.current;
      if (!table) return;

      const scrollTop = table.scrollTop;
      const viewportHeight = table.clientHeight;
      const totalHeight = table.scrollHeight;

      const start = Math.floor(scrollTop / rowHeight);
      const visibleRows = Math.ceil(viewportHeight / rowHeight);
      const end = Math.min(start + visibleRows + 10, data.length);

      setVisibleRange({ start: Math.max(0, start - 10), end });
    };

    const table = tableRef.current;
    table.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => {
      table.removeEventListener('scroll', handleScroll);
    };
  }, [virtualized, data.length, rowHeight]);

  // Render table header
  const renderHeader = (): React.ReactNode => (
    <thead>
      <tr>
        {columns.map((column) => (
          <th
            key={column.id}
            style={{ width: column.width }}
            className={classnames('table-header', {
              'cursor-pointer': sortable && column.sortable,
              'text-left': column.align === 'left' || !column.align,
              'text-center': column.align === 'center',
              'text-right': column.align === 'right',
            })}
            onClick={column.sortable ? (e) => handleSort(column.id, e) : undefined}
            onKeyDown={column.sortable ? (e) => handleSort(column.id, e) : undefined}
            tabIndex={column.sortable ? 0 : undefined}
            role={column.sortable ? 'button' : undefined}
          >
            <div className="flex items-center gap-2">
              {column.header}
              {sortable && column.sortable && sortColumn === column.id && (
                <span className="sort-indicator">{sortDirection === 'asc' ? '↑' : '↓'}</span>
              )}
            </div>
          </th>
        ))}
      </tr>
    </thead>
  );

  // Render table rows
  const renderRows = (): React.ReactNode => {
    const rowsToRender = virtualized ? data.slice(visibleRange.start, visibleRange.end) : data;

    return (
      <tbody>
        {rowsToRender.map((row, index) => (
          <tr
            key={index}
            style={virtualized ? { height: `${rowHeight}px` } : undefined}
            className="table-row"
          >
            {columns.map((column) => {
              const value =
                typeof column.accessor === 'function' ? column.accessor(row) : row[column.accessor];

              return (
                <td
                  key={column.id}
                  className={classnames('table-cell', {
                    'text-left': column.align === 'left' || !column.align,
                    'text-center': column.align === 'center',
                    'text-right': column.align === 'right',
                  })}
                >
                  {column.renderCell ? column.renderCell(value, row) : (value as React.ReactNode)}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    );
  };

  return (
    <div className={classnames('table-container', className)}>
      {isLoading ? (
        <div className="loading-container">
          <LoadingSpinner />
        </div>
      ) : (
        <table
          ref={tableRef}
          className={classnames('table', {
            'table-virtualized': virtualized,
          })}
        >
          {renderHeader()}
          {data.length > 0 ? (
            renderRows()
          ) : (
            <tbody>
              <tr>
                <td colSpan={columns.length} className="empty-message">
                  {emptyMessage}
                </td>
              </tr>
            </tbody>
          )}
        </table>
      )}
    </div>
  );
};

Table.displayName = 'Table';

export default Table;
