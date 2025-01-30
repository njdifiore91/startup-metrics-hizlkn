import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Button,
  IconButton,
  Box,
  Typography,
  Pagination,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tooltip,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Download as DownloadIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { auditLogService, AuditLog, AuditLogFilter } from '../../services/auditLog';
import { format } from 'date-fns';

const formatChanges = (changes: Record<string, any>): string => {
  try {
    const requestBody = changes.requestBody ? JSON.parse(changes.requestBody) : null;
    const responseBody = changes.responseBody ? JSON.parse(changes.responseBody) : null;
    const method = changes.method;
    const path = changes.path;

    switch (method) {
      case 'POST':
        return `Created: ${JSON.stringify(requestBody)}`;
      case 'PUT':
      case 'PATCH':
        if (requestBody) {
          const changedFields = Object.keys(requestBody)
            .map((key) => `${key}=${requestBody[key]}`)
            .join(', ');
          return `Updated fields: ${changedFields}`;
        }
        return 'Updated entity';
      case 'DELETE':
        return `Deleted entity at ${path}`;
      default:
        return `${method} operation on ${path}`;
    }
  } catch (error) {
    console.error('Error formatting changes:', error);
    return 'Unable to parse changes';
  }
};

const AuditLogList: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState<AuditLogFilter>({
    page: 1,
    limit: 10,
    sortBy: 'timestamp',
    sortOrder: 'DESC',
  });

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await auditLogService.getAuditLogs(filters);
      setLogs(response.data);
      setTotalPages(response.pagination.totalPages);
    } catch (err) {
      setError('Failed to fetch audit logs');
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [filters]);

  const handleExport = async () => {
    try {
      const blob = await auditLogService.exportAuditLogs(filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit_logs_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError('Failed to export audit logs');
      console.error('Error exporting audit logs:', err);
    }
  };

  const handlePageChange = (_: React.ChangeEvent<unknown>, page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const handleFilterChange = (field: keyof AuditLogFilter, value: any) => {
    setFilters((prev) => ({ ...prev, [field]: value, page: 1 }));
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5">Audit Logs</Typography>
        {/* <Box>
          <IconButton onClick={fetchLogs} sx={{ mr: 1 }}>
            <RefreshIcon />
          </IconButton>
          <Button variant="contained" startIcon={<DownloadIcon />} onClick={handleExport}>
            Export
          </Button>
        </Box> */}
      </Box>

      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <DatePicker
          label="Start Date"
          value={filters.startDate || null}
          onChange={(date) => handleFilterChange('startDate', date)}
        />
        <DatePicker
          label="End Date"
          value={filters.endDate || null}
          onChange={(date) => handleFilterChange('endDate', date)}
        />
        <TextField
          label="User ID"
          value={filters.userId || ''}
          onChange={(e) => handleFilterChange('userId', e.target.value)}
        />
        <TextField
          label="Action"
          value={filters.action || ''}
          onChange={(e) => handleFilterChange('action', e.target.value)}
        />
        <TextField
          label="Entity Type"
          value={filters.entityType || ''}
          onChange={(e) => handleFilterChange('entityType', e.target.value)}
        />
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>Sort By</InputLabel>
          <Select
            value={filters.sortBy || 'timestamp'}
            label="Sort By"
            onChange={(e) => handleFilterChange('sortBy', e.target.value)}
          >
            <MenuItem value="timestamp">Timestamp</MenuItem>
            <MenuItem value="action">Action</MenuItem>
            <MenuItem value="entityType">Entity Type</MenuItem>
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>Sort Order</InputLabel>
          <Select
            value={filters.sortOrder || 'DESC'}
            label="Sort Order"
            onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
          >
            <MenuItem value="ASC">Ascending</MenuItem>
            <MenuItem value="DESC">Descending</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Timestamp</TableCell>
              <TableCell>User</TableCell>
              <TableCell>Action</TableCell>
              <TableCell>Entity Type</TableCell>
              <TableCell>Entity ID</TableCell>
              <TableCell>Changes</TableCell>
              <TableCell>IP Address</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  No audit logs found
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss')}</TableCell>
                  <TableCell>{log.user?.name || 'Unknown'}</TableCell>
                  <TableCell>{log.action}</TableCell>
                  <TableCell>{log.entityType}</TableCell>
                  <TableCell>{log.entityId}</TableCell>
                  <TableCell>
                    <Tooltip title={<pre>{JSON.stringify(log.changes, null, 2)}</pre>}>
                      <span>{log.changes ? formatChanges(log.changes) : 'No changes'}</span>
                    </Tooltip>
                  </TableCell>
                  <TableCell>{log.ipAddress}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
        <Pagination
          count={totalPages}
          page={filters.page || 1}
          onChange={handlePageChange}
          color="primary"
        />
      </Box>
    </Box>
  );
};

export default AuditLogList;
