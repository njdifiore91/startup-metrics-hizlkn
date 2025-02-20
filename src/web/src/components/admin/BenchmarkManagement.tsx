import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  useMediaQuery,
  Tooltip,
  Collapse,
  CircularProgress,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  KeyboardArrowDown,
} from '@mui/icons-material';
import { IBenchmarkData } from '../../../../backend/src/interfaces/IBenchmarkData';
import BenchmarkForm from './BenchmarkForm';
import { useSnackbar } from 'notistack';
import { formatDate } from '../../utils/dateUtils';
import { benchmarkService } from '../../services/benchmarkService';

const BenchmarkManagement: React.FC = () => {
  const [benchmarks, setBenchmarks] = useState<IBenchmarkData[]>([]);
  const [selectedBenchmark, setSelectedBenchmark] = useState<IBenchmarkData | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const { enqueueSnackbar } = useSnackbar();
  const isMobile = useMediaQuery('(max-width:600px)');

  const toggleRowExpansion = (benchmarkId: string) => {
    setExpandedRows((prev) => ({
      ...prev,
      [benchmarkId]: !prev[benchmarkId],
    }));
  };

  const fetchBenchmarks = async () => {
    try {
      setIsLoading(true);
      const response = await benchmarkService.getBenchmarks();
      if (response.error) {
        throw new Error(response.error);
      }
      setBenchmarks(response.data.data || []);
    } catch (error) {
      enqueueSnackbar('Failed to fetch benchmarks', { variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBenchmarks();
  }, []);

  useEffect(() => {
    fetchBenchmarks();
  }, [benchmarks, isFormOpen]);

  const handleCreateBenchmark = async (data: Omit<IBenchmarkData, 'id'>) => {
    try {
      const response = await benchmarkService.createBenchmark(data);
      if (response.error) {
        throw new Error(response.error);
      }
      enqueueSnackbar('Benchmark created successfully', { variant: 'success' });
      setIsFormOpen(false);
      await fetchBenchmarks();
    } catch (error) {
      enqueueSnackbar('Failed to create benchmark', { variant: 'error' });
    }
  };

  const handleUpdateBenchmark = async (data: IBenchmarkData) => {
    try {
      const response = await benchmarkService.updateBenchmark(data.id, data);
      if (response.error) {
        throw new Error(response.error);
      }
      enqueueSnackbar('Benchmark updated successfully', { variant: 'success' });
      setIsFormOpen(false);
      await fetchBenchmarks();
    } catch (error) {
      enqueueSnackbar('Failed to update benchmark', { variant: 'error' });
    }
  };

  const handleDeleteBenchmark = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this benchmark?')) {
      try {
        const response = await benchmarkService.deleteBenchmark(id);
        if (response.error) {
          throw new Error(response.error);
        }
        enqueueSnackbar('Benchmark deleted successfully', { variant: 'success' });
        await fetchBenchmarks();
      } catch (error) {
        enqueueSnackbar('Failed to delete benchmark', { variant: 'error' });
      }
    }
  };

  const handleEdit = (benchmark: IBenchmarkData) => {
    setSelectedBenchmark(benchmark);
    setIsFormOpen(true);
  };

  const handleAdd = () => {
    setSelectedBenchmark(null);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedBenchmark(null);
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ my: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            Benchmark Management
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleAdd}
            disabled={isLoading}
          >
            Add Benchmark
          </Button>
        </Box>

        <Paper>
          <TableContainer sx={{ maxHeight: 'calc(100vh - 200px)', overflow: 'auto' }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell padding="none" sx={{ width: '48px', bgcolor: 'background.paper' }} />
                  <TableCell sx={{ bgcolor: 'background.paper' }}>Metric ID</TableCell>
                  {!isMobile && (
                    <TableCell sx={{ bgcolor: 'background.paper' }}>Source ID</TableCell>
                  )}
                  <TableCell sx={{ bgcolor: 'background.paper' }}>Revenue Range</TableCell>
                  {!isMobile && (
                    <TableCell sx={{ bgcolor: 'background.paper' }}>Sample Size</TableCell>
                  )}
                  <TableCell sx={{ bgcolor: 'background.paper' }}>Report Date</TableCell>
                  <TableCell sx={{ bgcolor: 'background.paper' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : benchmarks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                      No benchmarks found
                    </TableCell>
                  </TableRow>
                ) : (
                  benchmarks.map((benchmark) => (
                    <React.Fragment key={benchmark.id}>
                      <TableRow>
                        <TableCell padding="none">
                          <IconButton
                            aria-label="expand row"
                            size="small"
                            onClick={() => toggleRowExpansion(benchmark.id)}
                            sx={{
                              transform: expandedRows[benchmark.id]
                                ? 'rotate(180deg)'
                                : 'rotate(0deg)',
                              transition: 'transform 150ms cubic-bezier(0.4, 0, 0.2, 1) 0ms',
                            }}
                          >
                            <KeyboardArrowDown />
                          </IconButton>
                        </TableCell>
                        <TableCell>{benchmark.metricId}</TableCell>
                        {!isMobile && <TableCell>{benchmark.sourceId}</TableCell>}
                        <TableCell>{benchmark.revenueRange}</TableCell>
                        {!isMobile && <TableCell>{benchmark.sampleSize}</TableCell>}
                        <TableCell>{formatDate(benchmark.reportDate)}</TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => handleEdit(benchmark)}
                            aria-label="edit"
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteBenchmark(benchmark.id)}
                            aria-label="delete"
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={8}>
                          <Collapse in={expandedRows[benchmark.id]} timeout="auto" unmountOnExit>
                            <Box sx={{ margin: 2 }}>
                              <Typography variant="h6" gutterBottom component="div">
                                Percentile Details
                              </Typography>
                              <Table size="small">
                                <TableHead>
                                  <TableRow>
                                    <TableCell>P10</TableCell>
                                    <TableCell>P25</TableCell>
                                    <TableCell>P50</TableCell>
                                    <TableCell>P75</TableCell>
                                    <TableCell>P90</TableCell>
                                    <TableCell>Confidence Level</TableCell>
                                    <TableCell>Data Quality</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  <TableRow>
                                    <TableCell>{benchmark.p10}</TableCell>
                                    <TableCell>{benchmark.p25}</TableCell>
                                    <TableCell>{benchmark.p50}</TableCell>
                                    <TableCell>{benchmark.p75}</TableCell>
                                    <TableCell>{benchmark.p90}</TableCell>
                                    <TableCell>
                                      {(benchmark.confidenceLevel * 100).toFixed(1)}%
                                    </TableCell>
                                    <TableCell>
                                      {(benchmark.dataQualityScore * 100).toFixed(1)}%
                                    </TableCell>
                                  </TableRow>
                                </TableBody>
                              </Table>
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        <Dialog
          open={isFormOpen}
          onClose={handleCloseForm}
          maxWidth="md"
          fullWidth
          fullScreen={isMobile}
        >
          <BenchmarkForm
            benchmark={selectedBenchmark}
            onSubmit={selectedBenchmark ? handleUpdateBenchmark : handleCreateBenchmark}
            onCancel={handleCloseForm}
          />
        </Dialog>
      </Box>
    </Container>
  );
};

export default BenchmarkManagement;
