import React from 'react';
import { Box, Button, Card, Container, Typography } from '@mui/material';
import { Google as GoogleIcon } from '@mui/icons-material';
import { authService } from '../../services/auth';

const Login: React.FC = () => {
  const handleGoogleLogin = async () => {
    try {
      await authService.loginWithGoogle();
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          mt: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Card sx={{ p: 4, width: '100%', maxWidth: 400 }}>
          <Typography variant="h4" align="center" gutterBottom>
            Welcome
          </Typography>
          <Typography variant="body1" align="center" sx={{ mb: 4 }}>
            Sign in to access your dashboard
          </Typography>

          <Button
            variant="contained"
            size="large"
            startIcon={<GoogleIcon />}
            onClick={handleGoogleLogin}
            fullWidth
            sx={{ mt: 2 }}
          >
            Sign in with Google
          </Button>
        </Card>
      </Box>
    </Container>
  );
};

export default Login; 