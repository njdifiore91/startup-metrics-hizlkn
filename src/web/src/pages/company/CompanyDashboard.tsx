import React from 'react';
import { Box, Container, Typography, Grid, Paper } from '@mui/material';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

const CompanyDashboard: React.FC = () => {
  const user = useSelector((state: RootState) => state.auth.user);

  const formatRevenueRange = (range?: string) => {
    if (!range) return 'Not specified';
    return range.replace(/([0-9]+)([A-Z]+)/g, '$1 $2').replace('-', ' - $');
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          {user?.companyName || 'Company'} Dashboard
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          Revenue Range: ${formatRevenueRange(user?.revenueRange)}
        </Typography>

        <Grid container spacing={3} sx={{ mt: 2 }}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Key Metrics
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body1" color="text.secondary">
                  Company Name: {user?.companyName || 'Not specified'}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Revenue Range: ${formatRevenueRange(user?.revenueRange)}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Role: {user?.role || 'Not specified'}
                </Typography>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Industry Benchmarks
              </Typography>
              {/* Add benchmark comparison component here */}
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Performance Trends
              </Typography>
              {/* Add performance trends chart component here */}
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Recommendations
              </Typography>
              {/* Add recommendations component here */}
            </Paper>
          </Grid>

          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Action Items
              </Typography>
              {/* Add action items component here */}
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default CompanyDashboard;