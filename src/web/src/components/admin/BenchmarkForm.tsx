import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  TextField,
  FormControlLabel,
  Switch,
  MenuItem,
  Typography,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { IBenchmarkData } from '../../../../backend/src/interfaces/IBenchmarkData';
import { REVENUE_RANGES } from '../../constants/revenueRanges';
import { DatePicker } from '@mui/x-date-pickers';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useAppSelector } from '@/store';
import { useMetrics } from '@/hooks/useMetrics';
import { useDataSources } from '@/hooks/useDataSources';
import { IDataSource } from '@/services/dataSources';

interface BenchmarkFormProps {
  benchmark?: IBenchmarkData | null;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
}

const validationSchema = yup.object().shape({
  metricId: yup.string().required('Metric ID is required'),
  sourceId: yup.string().required('Source ID is required'),
  revenueRange: yup.string().required('Revenue Range is required'),
  p10: yup.number().required('P10 is required').min(0),
  p25: yup.number().required('P25 is required').min(0),
  p50: yup.number().required('P50 is required').min(0),
  p75: yup.number().required('P75 is required').min(0),
  p90: yup.number().required('P90 is required').min(0),
  reportDate: yup.date().required('Report Date is required'),
  sampleSize: yup.number().required('Sample Size is required').integer().min(1),
  confidenceLevel: yup
    .number()
    .required('Confidence Level is required')
    .min(0)
    .max(1)
    .typeError('Confidence Level must be between 0 and 1'),
  dataQualityScore: yup
    .number()
    .required('Data Quality Score is required')
    .min(0)
    .max(1)
    .typeError('Data Quality Score must be between 0 and 1'),
  isSeasonallyAdjusted: yup.boolean(),
  isStatisticallySignificant: yup.boolean(),
});

const BenchmarkForm: React.FC<BenchmarkFormProps> = ({ benchmark, onSubmit, onCancel }) => {
  const { getMetricTypes, loading: metricsLoading } = useMetrics();
  const { dataSources, loading: dataSourcesLoading } = useDataSources();
  const [metricTypes, setMetricTypes] = useState<
    Array<{ id: string; name: string; type: string; valueType: string }>
  >([]);

  useEffect(() => {
    const fetchMetricTypes = async () => {
      const response = await getMetricTypes();
      if (response.data) {
        setMetricTypes(response.data);
      }
    };
    fetchMetricTypes();
  }, [getMetricTypes]);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm({
    defaultValues: {
      metricId: benchmark?.metricId || '',
      sourceId: benchmark?.sourceId || '',
      revenueRange: benchmark?.revenueRange || '',
      p10: benchmark?.p10 || 0,
      p25: benchmark?.p25 || 0,
      p50: benchmark?.p50 || 0,
      p75: benchmark?.p75 || 0,
      p90: benchmark?.p90 || 0,
      reportDate: benchmark?.reportDate ? new Date(benchmark.reportDate) : new Date(),
      sampleSize: benchmark?.sampleSize || 0,
      confidenceLevel: benchmark?.confidenceLevel || 0.95,
      dataQualityScore: benchmark?.dataQualityScore || 0.9,
      isSeasonallyAdjusted: benchmark?.isSeasonallyAdjusted || false,
      isStatisticallySignificant: benchmark?.isStatisticallySignificant || true,
    },
    resolver: yupResolver(validationSchema),
  });

  const handleFormSubmit = async (data: any) => {
    if (benchmark) {
      await onSubmit({ ...data, id: benchmark.id });
    } else {
      await onSubmit(data);
    }
  };

  return (
    <>
      <DialogTitle>{benchmark ? 'Edit Benchmark' : 'Create Benchmark'}</DialogTitle>
      <DialogContent>
        <Box component="form" noValidate sx={{ mt: 2 }}>
          <Grid container spacing={3}>
            {/* Basic Information */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Basic Information
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="metricId"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    label="Metric"
                    fullWidth
                    error={!!errors.metricId}
                    helperText={errors.metricId?.message}
                    disabled={metricsLoading['metric_types']}
                  >
                    {metricTypes.map((metric) => (
                      <MenuItem key={metric.id} value={metric.id}>
                        {metric.displayName}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="sourceId"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    label="Data Source"
                    fullWidth
                    error={!!errors.sourceId}
                    helperText={errors.sourceId?.message}
                    disabled={dataSourcesLoading}
                  >
                    {dataSources.map((source: IDataSource) => (
                      <MenuItem key={source.id} value={source.id}>
                        {source.name}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="revenueRange"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    label="Revenue Range"
                    fullWidth
                    error={!!errors.revenueRange}
                    helperText={errors.revenueRange?.message}
                  >
                    {REVENUE_RANGES.map((range) => (
                      <MenuItem key={range.value} value={range.value}>
                        {range.label}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="reportDate"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    {...field}
                    label="Report Date"
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        error: !!errors.reportDate,
                        helperText: errors.reportDate?.message,
                      },
                    }}
                  />
                )}
              />
            </Grid>

            {/* Percentile Values */}
            <Grid item xs={12} sx={{ mt: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Percentile Values
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Controller
                name="p10"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="P10"
                    type="number"
                    fullWidth
                    error={!!errors.p10}
                    helperText={errors.p10?.message}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Controller
                name="p25"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="P25"
                    type="number"
                    fullWidth
                    error={!!errors.p25}
                    helperText={errors.p25?.message}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Controller
                name="p50"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="P50"
                    type="number"
                    fullWidth
                    error={!!errors.p50}
                    helperText={errors.p50?.message}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Controller
                name="p75"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="P75"
                    type="number"
                    fullWidth
                    error={!!errors.p75}
                    helperText={errors.p75?.message}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Controller
                name="p90"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="P90"
                    type="number"
                    fullWidth
                    error={!!errors.p90}
                    helperText={errors.p90?.message}
                  />
                )}
              />
            </Grid>

            {/* Statistical Information */}
            <Grid item xs={12} sx={{ mt: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Statistical Information
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="sampleSize"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Sample Size"
                    type="number"
                    fullWidth
                    error={!!errors.sampleSize}
                    helperText={errors.sampleSize?.message}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="confidenceLevel"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Confidence Level (0-1)"
                    type="number"
                    fullWidth
                    inputProps={{ step: 0.01, min: 0, max: 1 }}
                    error={!!errors.confidenceLevel}
                    helperText={errors.confidenceLevel?.message}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="dataQualityScore"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Data Quality Score (0-1)"
                    type="number"
                    fullWidth
                    inputProps={{ step: 0.01, min: 0, max: 1 }}
                    error={!!errors.dataQualityScore}
                    helperText={errors.dataQualityScore?.message}
                  />
                )}
              />
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button
          onClick={handleSubmit(handleFormSubmit)}
          variant="contained"
          disabled={isSubmitting}
        >
          {benchmark ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </>
  );
};

export default BenchmarkForm;
