import React from 'react';
import { Box, Container, Typography, Grid, Paper, TextField, Button } from '@mui/material';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

const Settings: React.FC = () => {
  const user = useSelector((state: RootState) => state.auth.user);

  return (
    <Container maxWidth="xl">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Settings
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          Manage your account settings and preferences
        </Typography>

        <Grid container spacing={3} sx={{ mt: 2 }}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Profile Information
              </Typography>
              <Box component="form" sx={{ mt: 2 }}>
                <TextField
                  fullWidth
                  label="Name"
                  value={user?.name}
                  disabled
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  label="Email"
                  value={user?.email}
                  disabled
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  label="Role"
                  value={user?.role}
                  disabled
                  sx={{ mb: 2 }}
                />
                {user?.companyName && (
                  <TextField
                    fullWidth
                    label="Company"
                    value={user.companyName}
                    disabled
                    sx={{ mb: 2 }}
                  />
                )}
                {user?.revenueRange && (
                  <TextField
                    fullWidth
                    label="Revenue Range"
                    value={user.revenueRange}
                    disabled
                    sx={{ mb: 2 }}
                  />
                )}
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Account Settings
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="outlined"
                  color="primary"
                  fullWidth
                  sx={{ mb: 2 }}
                >
                  Change Password
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  fullWidth
                >
                  Delete Account
                </Button>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default Settings; 