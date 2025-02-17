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
  TablePagination,
  FormControlLabel,
  Switch,
  CircularProgress,
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
  lastLoginAt: string;
  profileImageUrl: string | null;
  tier: 'free' | 'pro' | 'enterprise';
  revenueRange?: '0-1M' | '1M-5M' | '5M-20M' | '20M-50M' | '50M+';
}

interface UserResponse {
  users: User[];
  total: number;
}

interface CreateUserData {
  name: string;
  email: string;
  role: keyof typeof USER_ROLES;
  isActive?: boolean;
  profileImageUrl?: string;
  tier?: 'free' | 'pro' | 'enterprise';
  lastLoginAt?: string;
  revenueRange?: '0-1M' | '1M-5M' | '5M-20M' | '20M-50M' | '50M+';
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalUsers, setTotalUsers] = useState(0);
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [showInactive, setShowInactive] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastSeverity, setToastSeverity] = useState<'success' | 'error'>('success');
  const [newUser, setNewUser] = useState<CreateUserData>({
    name: '',
    email: '',
    role: 'USER',
    isActive: true,
    tier: 'free',
  });
  const [editUser, setEditUser] = useState<Partial<User>>({});

  const { user: currentUser, isAuthenticated, logout } = useAuth();

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, userId: string) => {
    setAnchorEl(event.currentTarget);
    setSelectedUserId(userId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const showToast = (message: string, severity: 'success' | 'error') => {
    setToastMessage(message);
    setToastSeverity(severity);
    setToastOpen(true);
  };

  const handleToastClose = () => {
    setToastOpen(false);
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/v1/admin/users', {
        params: {
          page: page + 1,
          limit: rowsPerPage,
          role: roleFilter || undefined,
          isActive: !showInactive ? true : undefined,
        },
      });

      const users = response.data.data.data || [];
      setUsers(users);
      setTotalUsers(users.length);
      setError(null);
    } catch (err) {
      setError('Failed to fetch users');
      showToast('Failed to fetch users', 'error');
      setUsers([]);
      setTotalUsers(0);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleRoleFilterChange = (event: SelectChangeEvent) => {
    setRoleFilter(event.target.value);
    setPage(0);
  };

  const handleShowInactiveChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setShowInactive(event.target.checked);
    setPage(0);
  };

  useEffect(() => {
    fetchUsers();
  }, [page, rowsPerPage, roleFilter, showInactive]);

  const handleCreateUser = async () => {
    try {
      await api.post('/api/v1/admin/users', newUser);
      showToast('User created successfully', 'success');
      setCreateDialogOpen(false);
      setNewUser({
        name: '',
        email: '',
        role: 'USER',
        isActive: true,
        tier: 'free',
      });
      fetchUsers();
    } catch (err) {
      showToast('Failed to create user', 'error');
    }
  };

  const handleEditUser = async () => {
    console.log('handleEditUser called', { selectedUserId, editUser }); // Debug log

    if (!selectedUserId) {
      console.log('No selectedUserId found'); // Debug log
      return;
    }

    try {
      // Validate required fields
      if (!editUser.name?.trim()) {
        showToast('Name is required', 'error');
        return;
      }
      if (!editUser.email?.trim()) {
        showToast('Email is required', 'error');
        return;
      }
      if (!editUser.role) {
        showToast('Role is required', 'error');
        return;
      }

      // Check authentication
      if (!isAuthenticated) {
        showToast('You must be authenticated to perform this action', 'error');
        return;
      }

      // Format and validate data according to rules
      const name = editUser.name.trim();
      const email = editUser.email.trim().toLowerCase();

      // Validate name format
      if (!/^[a-zA-Z0-9\s-']{2,50}$/.test(name)) {
        showToast(
          'Name must be 2-50 characters and can contain letters, numbers, spaces, hyphens and apostrophes',
          'error'
        );
        return;
      }

      // Validate email format
      if (
        !/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(
          email
        )
      ) {
        showToast('Please enter a valid email address', 'error');
        return;
      }

      const updateData = {
        name,
        email,
        role: editUser.role,
        isActive: editUser.isActive ?? true,
        profileImageUrl: editUser.profileImageUrl?.trim() || null,
        tier: editUser.tier || 'free',
      };

      console.log('Making API call to update user:', {
        url: `/api/v1/admin/users/${selectedUserId}`,
        data: updateData,
      }); // Debug log

      setLoading(true);
      const response = await api.put(`/api/v1/admin/users/${selectedUserId}`, updateData);
      console.log('API response:', response); // Debug log

      showToast('User updated successfully', 'success');
      setEditDialogOpen(false);
      setEditUser({});
      await fetchUsers(); // Refresh the user list
    } catch (err: any) {
      console.error('Error updating user:', {
        error: err,
        response: err.response,
        status: err.response?.status,
        data: err.response?.data,
      }); // Detailed error logging

      // Handle authentication errors
      if (err.response?.status === 401) {
        showToast('Your session has expired. Please log in again.', 'error');
        logout();
        return;
      }

      const errorMessage = err.response?.data?.message || 'Failed to update user';
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewUser((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditUser((prev) => ({ ...prev, [name]: value }));
  };

  const handleRoleChange = (e: SelectChangeEvent) => {
    setNewUser((prev) => ({ ...prev, role: e.target.value as keyof typeof USER_ROLES }));
  };

  const handleEditRoleChange = (e: SelectChangeEvent) => {
    setEditUser((prev) => ({ ...prev, role: e.target.value }));
  };

  const startEdit = (user: User) => {
    setEditUser({
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      profileImageUrl: user.profileImageUrl,
      tier: user.tier,
      lastLoginAt: user.lastLoginAt,
    });
    setSelectedUserId(user.id);
    setEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    if (!loading) {
      setEditDialogOpen(false);
      setEditUser({});
      setSelectedUserId(null);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUserId) return;

    try {
      setLoading(true);
      await api.delete(`/api/v1/admin/users/${selectedUserId}`);
      showToast('User deleted successfully', 'success');
      handleMenuClose();
      setDeleteDialogOpen(false);
      await fetchUsers();
    } catch (err: any) {
      console.error('Error deleting user:', err);
      const errorMessage = err.response?.data?.message || 'Failed to delete user';
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const startDelete = (user: User) => {
    setSelectedUserId(user.id);
    setDeleteDialogOpen(true);
    setAnchorEl(null);
  };

  const handleCloseDeleteDialog = () => {
    if (!loading) {
      setDeleteDialogOpen(false);
      setSelectedUserId(null);
    }
  };

  return (
    <Box sx={{ width: '100%', p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5" component="h1">
          User Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Add User
        </Button>
      </Box>

      <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>Role Filter</InputLabel>
          <Select value={roleFilter} onChange={handleRoleFilterChange} label="Role Filter">
            <MenuItem value="">All Roles</MenuItem>
            {Object.keys(USER_ROLES).map((role) => (
              <MenuItem key={role} value={role}>
                {role}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControlLabel
          control={<Switch checked={showInactive} onChange={handleShowInactiveChange} />}
          label="Show Inactive Users"
        />
      </Box>

      <TableContainer component={Paper}>
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
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : users && users.length > 0 ? (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.role}</TableCell>
                  <TableCell>
                    <Chip
                      label={user.isActive ? 'Active' : 'Inactive'}
                      color={user.isActive ? 'success' : 'error'}
                    />
                  </TableCell>
                  <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <IconButton onClick={(e) => handleMenuClick(e, user.id)}>
                      <MoreVertIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No users found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={totalUsers || 0}
        page={page}
        onPageChange={handlePageChange}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleRowsPerPageChange}
        rowsPerPageOptions={[5, 10, 25, 50]}
      />

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        {selectedUserId && users && (
          <>
            {(() => {
              const selectedUser = users.find((u) => u.id === selectedUserId);
              console.log('selectedUser', selectedUser);
              console.log('selectedUserId', selectedUserId);
              return selectedUser ? (
                <>
                  <MenuItem onClick={() => startEdit(selectedUser)}>Edit</MenuItem>
                  <MenuItem onClick={() => startDelete(selectedUser)}>Delete</MenuItem>
                </>
              ) : null;
            })()}
          </>
        )}
      </Menu>

      {/* Create User Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)}>
        <DialogTitle>Create New User</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              name="name"
              label="Name"
              type="text"
              fullWidth
              value={newUser.name}
              onChange={handleInputChange}
              required
            />
            <TextField
              name="email"
              label="Email"
              type="email"
              fullWidth
              value={newUser.email}
              onChange={handleInputChange}
              required
            />
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select value={newUser.role} onChange={handleRoleChange} label="Role">
                {Object.entries(USER_ROLES).map(([key, value]) => (
                  <MenuItem key={key} value={key}>
                    {value}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Tier</InputLabel>
              <Select
                name="tier"
                value={newUser.tier || 'free'}
                onChange={(e) =>
                  setNewUser((prev) => ({
                    ...prev,
                    tier: e.target.value as 'free' | 'pro' | 'enterprise',
                  }))
                }
                label="Tier"
              >
                <MenuItem value="free">Free</MenuItem>
                <MenuItem value="pro">Pro</MenuItem>
                <MenuItem value="enterprise">Enterprise</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal">
              <InputLabel id="revenue-range-label">Revenue Range</InputLabel>
              <Select
                labelId="revenue-range-label"
                id="revenue-range"
                value={newUser.revenueRange || ''}
                onChange={(e: SelectChangeEvent<string>) =>
                  setNewUser((prev) => ({ ...prev, revenueRange: e.target.value as User['revenueRange'] }))
                }
                label="Revenue Range"
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                <MenuItem value="0-1M">$0 - $1M</MenuItem>
                <MenuItem value="1M-5M">$1M - $5M</MenuItem>
                <MenuItem value="5M-20M">$5M - $20M</MenuItem>
                <MenuItem value="20M-50M">$20M - $50M</MenuItem>
                <MenuItem value="50M+">$50M+</MenuItem>
              </Select>
              <FormHelperText>Select the company's annual revenue range for benchmarking</FormHelperText>
            </FormControl>
            <TextField
              name="profileImageUrl"
              label="Profile Image URL"
              type="url"
              fullWidth
              value={newUser.profileImageUrl || ''}
              onChange={handleInputChange}
              helperText="Optional: URL to user's profile image"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={newUser.isActive}
                  onChange={(e) => setNewUser((prev) => ({ ...prev, isActive: e.target.checked }))}
                  name="isActive"
                />
              }
              label="Active User"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setCreateDialogOpen(false);
              setNewUser({
                name: '',
                email: '',
                role: 'USER',
                isActive: true,
                tier: 'free',
              });
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateUser}
            variant="contained"
            color="primary"
            disabled={!newUser.name || !newUser.email}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onClose={handleCloseEditDialog}>
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              name="name"
              label="Name"
              type="text"
              fullWidth
              value={editUser.name || ''}
              onChange={handleEditInputChange}
              required
              error={!editUser.name?.trim()}
              helperText={!editUser.name?.trim() ? 'Name is required' : ''}
              disabled={loading}
            />
            <TextField
              name="email"
              label="Email"
              type="email"
              fullWidth
              value={editUser.email || ''}
              onChange={handleEditInputChange}
              required
              error={!editUser.email?.trim()}
              helperText={!editUser.email?.trim() ? 'Email is required' : ''}
              disabled={loading}
            />
            <FormControl fullWidth error={!editUser.role}>
              <InputLabel>Role</InputLabel>
              <Select
                value={editUser.role || ''}
                onChange={handleEditRoleChange}
                label="Role"
                disabled={loading}
              >
                {Object.entries(USER_ROLES).map(([key, value]) => (
                  <MenuItem key={key} value={key}>
                    {value}
                  </MenuItem>
                ))}
              </Select>
              {!editUser.role && <FormHelperText>Role is required</FormHelperText>}
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Tier</InputLabel>
              <Select
                name="tier"
                value={editUser.tier || 'free'}
                onChange={(e) =>
                  setEditUser((prev) => ({
                    ...prev,
                    tier: e.target.value as 'free' | 'pro' | 'enterprise',
                  }))
                }
                label="Tier"
                disabled={loading}
              >
                <MenuItem value="free">Free</MenuItem>
                <MenuItem value="pro">Pro</MenuItem>
                <MenuItem value="enterprise">Enterprise</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal">
              <InputLabel id="revenue-range-label">Revenue Range</InputLabel>
              <Select
                labelId="revenue-range-label"
                id="revenue-range"
                value={editUser.revenueRange || ''}
                onChange={(e: SelectChangeEvent<string>) =>
                  setEditUser((prev) => ({ ...prev, revenueRange: e.target.value as User['revenueRange'] }))
                }
                label="Revenue Range"
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                <MenuItem value="0-1M">$0 - $1M</MenuItem>
                <MenuItem value="1M-5M">$1M - $5M</MenuItem>
                <MenuItem value="5M-20M">$5M - $20M</MenuItem>
                <MenuItem value="20M-50M">$20M - $50M</MenuItem>
                <MenuItem value="50M+">$50M+</MenuItem>
              </Select>
              <FormHelperText>Select the company's annual revenue range for benchmarking</FormHelperText>
            </FormControl>
            <TextField
              name="profileImageUrl"
              label="Profile Image URL"
              type="url"
              fullWidth
              value={editUser.profileImageUrl || ''}
              onChange={handleEditInputChange}
              helperText="Optional: URL to user's profile image"
              disabled={loading}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={editUser.isActive}
                  onChange={(e) => setEditUser((prev) => ({ ...prev, isActive: e.target.checked }))}
                  name="isActive"
                  disabled={loading}
                />
              }
              label="Active User"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              console.log('Save button clicked, selectedUserId:', selectedUserId);
              handleEditUser();
            }}
            variant="contained"
            color="primary"
            disabled={
              loading || !editUser.name?.trim() || !editUser.email?.trim() || !editUser.role
            }
          >
            {loading ? <CircularProgress size={24} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Delete User</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this user? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteUser}
            variant="contained"
            color="error"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <DeleteIcon />}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={toastOpen}
        autoHideDuration={6000}
        onClose={handleToastClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleToastClose} severity={toastSeverity}>
          {toastMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default UserManagement;
