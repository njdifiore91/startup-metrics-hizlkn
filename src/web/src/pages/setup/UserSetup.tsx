import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  Container,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  styled
} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { updateUser } from '../../store/userSlice';
import { setCredentials } from '../../store/authSlice';
import { completeUserSetup } from '../../services/auth';
import { RootState } from '../../store';

// Define allowed roles for setup
type SetupRole = 'USER' | 'ANALYST';
const SETUP_ROLES = {
  USER: 'USER' as const,
  ANALYST: 'ANALYST' as const
};

// Styled components for consistent styling
const StyledCard = styled(Card)(({ theme }) => ({
  padding: theme.spacing(4),
  boxShadow: theme.shadows[2],
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.paper,
}));

const StyledContainer = styled(Container)(({ theme }) => ({
  marginTop: theme.spacing(8),
  marginBottom: theme.spacing(4),
}));

const REVENUE_RANGES = [
  '0-1M',
  '1M-5M',
  '5M-20M',
  '20M-50M',
  '50M+'
] as const;

const UserSetup: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  
  const [step, setStep] = useState<'role' | 'company'>("role");
  const [role, setRole] = useState<SetupRole>();
  const [companyName, setCompanyName] = useState('');
  const [revenueRange, setRevenueRange] = useState<typeof REVENUE_RANGES[number]>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);

  // Effect to handle navigation based on user state
  useEffect(() => {
    console.log('User state changed:', user);
    if (user?.setupCompleted) {
      console.log('User setup completed, navigating to:', user.role === SETUP_ROLES.ANALYST ? '/analytics' : '/company-dashboard');
      navigate(user.role === SETUP_ROLES.ANALYST ? '/analytics' : '/company-dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handleRoleSelect = async (selectedRole: SetupRole) => {
    try {
      setError(undefined);
      setIsLoading(true);
      setRole(selectedRole);

      if (selectedRole === SETUP_ROLES.ANALYST) {
        console.log('Submitting analyst setup...');
        const response = await completeUserSetup({
          role: selectedRole
        });
        
        console.log('Setup response:', response);

        if (response.success && response.data.user) {
          const updatedUser = {
            ...response.data.user,
            setupCompleted: true,
            role: selectedRole
          };

          // Store auth state in localStorage
          localStorage.setItem('user', JSON.stringify(updatedUser));
          localStorage.setItem('accessToken', response.data.accessToken || '');

          // Update both auth and user state
          dispatch(setCredentials({
            user: updatedUser,
            accessToken: response.data.accessToken || '',
            refreshToken: ''
          }));
          
          dispatch(updateUser(updatedUser));
          
          console.log('Updated user state:', updatedUser);
          return;
        }
        
        throw new Error('Failed to complete setup');
      } else {
        setStep('company');
      }
    } catch (err) {
      console.error('Setup error:', err);
      setError(err instanceof Error ? err.message : 'Failed to complete setup');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setError(undefined);
      setIsLoading(true);

      if (!role) {
        setError('Please select a role');
        return;
      }

      if (role === SETUP_ROLES.USER && (!companyName || !revenueRange)) {
        setError('Please fill in all company details');
        return;
      }

      const setupData = {
        role,
        ...(role === SETUP_ROLES.USER && {
          companyName,
          revenueRange
        })
      };

      const response = await completeUserSetup(setupData);
      
      if (response.success && response.data.user) {
        const updatedUser = {
          ...response.data.user,
          setupCompleted: true,
          role: role
        };

        // Store auth state in localStorage
        localStorage.setItem('user', JSON.stringify(updatedUser));
        localStorage.setItem('accessToken', response.data.accessToken || '');

        // Update both auth and user state
        dispatch(setCredentials({
          user: updatedUser,
          accessToken: response.data.accessToken || '',
          refreshToken: ''
        }));
        
        dispatch(updateUser(updatedUser));
        
        console.log('Updated user state:', updatedUser);
        return;
      }

      throw new Error('Failed to complete setup');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete setup');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, mb: 4 }}>
        <Card sx={{ p: 4 }}>
          {step === 'role' ? (
            <>
              <Typography variant="h4" align="center" gutterBottom>
                Welcome! Let's get started
              </Typography>
              <Typography variant="body1" align="center" sx={{ mb: 4 }}>
                Please select your role to continue
              </Typography>
              <Stack spacing={2}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => handleRoleSelect(SETUP_ROLES.USER)}
                  disabled={isLoading}
                  fullWidth
                >
                  I represent a Company
                </Button>
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => handleRoleSelect(SETUP_ROLES.ANALYST)}
                  disabled={isLoading}
                  fullWidth
                >
                  I'm an Analyst
                </Button>
              </Stack>
            </>
          ) : (
            <>
              <Typography variant="h4" align="center" gutterBottom>
                Company Details
              </Typography>
              <Stack spacing={3}>
                <TextField
                  label="Company Name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  fullWidth
                  required
                  disabled={isLoading}
                />
                <FormControl fullWidth required>
                  <InputLabel>Revenue Range</InputLabel>
                  <Select
                    value={revenueRange || ''}
                    onChange={(e) => setRevenueRange(e.target.value as typeof REVENUE_RANGES[number])}
                    label="Revenue Range"
                    disabled={isLoading}
                  >
                    {REVENUE_RANGES.map((range) => (
                      <MenuItem key={range} value={range}>
                        {range}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleSubmit}
                  disabled={isLoading}
                  fullWidth
                >
                  Complete Setup
                </Button>
                <Button
                  variant="text"
                  onClick={() => setStep('role')}
                  disabled={isLoading}
                >
                  Back
                </Button>
              </Stack>
            </>
          )}
          {error && (
            <Typography color="error" align="center" sx={{ mt: 2 }}>
              {error}
            </Typography>
          )}
        </Card>
      </Box>
    </Container>
  );
};

export default UserSetup; 