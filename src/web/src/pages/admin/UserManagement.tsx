import React, { useState, useEffect } from 'react';
import {
  Box,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Chip,
  Paper,
  TableContainer,
  Alert,
  Snackbar,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
  FormHelperText,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';
import { USER_ROLES } from '../../constants/roles';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

interface CreateUserData {
  name: string;
  email: string;
  role: keyof typeof USER_ROLES;
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState<CreateUserData>({
    name: '',
    email: '',
    role: 'USER',
  });
  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const { user: currentUser } = useAuth();

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, userId: string) => {
    setAnchorEl(event.currentTarget);
    setSelectedUserId(userId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedUserId(null);
  };

  const showToast = (message: string, severity: 'success' | 'error') => {
    setToast({
      open: true,
      message,
      severity,
    });
  };

  const handleToastClose = () => {
    setToast((prev) => ({ ...prev, open: false }));
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data.data);
    } catch (error) {
      showToast('Unable to load user list', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async () => {
    try {
      // Validate required fields
      if (!newUser.name || !newUser.email || !newUser.role) {
        showToast('Please fill in all required fields', 'error');
        return;
      }

      await api.post('/users', newUser);
      showToast('User created successfully', 'success');
      setCreateDialogOpen(false);
      setNewUser({ name: '', email: '', role: 'USER' });
      fetchUsers();
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Failed to create user', 'error');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await api.delete(`/users/${userId}`);
      showToast('User deleted successfully', 'success');
      setDeleteDialogOpen(false);
      fetchUsers();
    } catch (error) {
      showToast('Failed to delete user', 'error');
    }
    handleMenuClose();
  };

  const handleDeactivateUser = async (userId: string) => {
    try {
      await api.post(`/users/${userId}/deactivate`);
      showToast('User deactivated successfully', 'success');
      fetchUsers();
    } catch (error) {
      showToast('Failed to deactivate user', 'error');
    }
    handleMenuClose();
  };

  const handleReactivateUser = async (userId: string) => {
    try {
      await api.post(`/users/${userId}/reactivate`);
      showToast('User reactivated successfully', 'success');
      fetchUsers();
    } catch (error) {
      showToast('Failed to reactivate user', 'error');
    }
    handleMenuClose();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewUser((prev) => ({ ...prev, [name]: value }));
  };

  const handleRoleChange = (e: SelectChangeEvent) => {
    setNewUser((prev) => ({ ...prev, role: e.target.value as keyof typeof USER_ROLES }));
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">User Management</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Create User
        </Button>
      </Box>

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created At</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Chip
                      label={user.role}
                      color={user.role === 'ADMIN' ? 'secondary' : 'primary'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={user.isActive ? 'Active' : 'Inactive'}
                      color={user.isActive ? 'success' : 'error'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <IconButton
                      onClick={(e) => handleMenuClick(e, user.id)}
                      disabled={user.id === currentUser?.id}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Action Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        {selectedUserId && users.find((u) => u.id === selectedUserId)?.isActive ? (
          <MenuItem onClick={() => handleDeactivateUser(selectedUserId)}>Deactivate User</MenuItem>
        ) : (
          <MenuItem onClick={() => selectedUserId && handleReactivateUser(selectedUserId)}>
            Reactivate User
          </MenuItem>
        )}
        <MenuItem
          onClick={() => {
            handleMenuClose();
            setDeleteDialogOpen(true);
          }}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon sx={{ mr: 1 }} /> Delete User
        </MenuItem>
      </Menu>

      {/* Create User Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)}>
        <DialogTitle>Create New User</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              name="name"
              label="Name"
              value={newUser.name}
              onChange={handleInputChange}
              fullWidth
              required
              error={createDialogOpen && !newUser.name}
              helperText={createDialogOpen && !newUser.name ? 'Name is required' : ''}
            />
            <TextField
              name="email"
              label="Email"
              type="email"
              value={newUser.email}
              onChange={handleInputChange}
              fullWidth
              required
              error={createDialogOpen && !newUser.email}
              helperText={createDialogOpen && !newUser.email ? 'Email is required' : ''}
            />
            <FormControl fullWidth required error={createDialogOpen && !newUser.role}>
              <InputLabel>Role</InputLabel>
              <Select value={newUser.role} label="Role" onChange={handleRoleChange}>
                {Object.entries(USER_ROLES).map(([key, value]) => (
                  <MenuItem key={key} value={key}>
                    {value}
                  </MenuItem>
                ))}
              </Select>
              {createDialogOpen && !newUser.role && (
                <FormHelperText>Role is required</FormHelperText>
              )}
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleCreateUser}
            variant="contained"
            color="primary"
            disabled={!newUser.name || !newUser.email || !newUser.role}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete User</DialogTitle>
        <DialogContent>
          Are you sure you want to delete this user? This action cannot be undone.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={() => selectedUserId && handleDeleteUser(selectedUserId)}
            variant="contained"
            color="error"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Toast Notification */}
      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        onClose={handleToastClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleToastClose} severity={toast.severity}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default UserManagement;
