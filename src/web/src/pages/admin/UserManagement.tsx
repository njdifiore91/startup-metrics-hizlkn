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
}

interface UserResponse {
  users: User[];
  total: number;
}

interface CreateUserData {
  name: string;
  email: string;
  role: keyof typeof USER_ROLES;
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
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastSeverity, setToastSeverity] = useState<'success' | 'error'>('success');
  const [newUser, setNewUser] = useState<CreateUserData>({
    name: '',
    email: '',
    role: 'USER',
  });
  const [editUser, setEditUser] = useState<Partial<User>>({});

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
          page: page + 1, // API uses 1-based pagination
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
      setNewUser({ name: '', email: '', role: 'USER' });
      fetchUsers();
    } catch (err) {
      showToast('Failed to create user', 'error');
    }
  };

  const handleEditUser = async () => {
    if (!selectedUserId) return;

    try {
      await api.put(`/api/v1/admin/users/${selectedUserId}`, editUser);
      showToast('User updated successfully', 'success');
      setEditDialogOpen(false);
      setEditUser({});
      fetchUsers();
    } catch (err) {
      showToast('Failed to update user', 'error');
    }
  };

  const handleDeactivateUser = async (userId: string) => {
    try {
      await api.post(`/api/v1/admin/users/${userId}/deactivate`);
      showToast('User deactivated successfully', 'success');
      handleMenuClose();
      fetchUsers();
    } catch (err) {
      showToast('Failed to deactivate user', 'error');
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
    });
    setSelectedUserId(user.id);
    setEditDialogOpen(true);
    handleMenuClose();
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
              return selectedUser ? (
                <>
                  <MenuItem onClick={() => startEdit(selectedUser)}>Edit</MenuItem>
                  <MenuItem onClick={() => handleDeactivateUser(selectedUserId)}>
                    {selectedUser.isActive ? 'Deactivate' : 'Activate'}
                  </MenuItem>
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
          <TextField
            autoFocus
            margin="dense"
            name="name"
            label="Name"
            type="text"
            fullWidth
            value={newUser.name}
            onChange={handleInputChange}
          />
          <TextField
            margin="dense"
            name="email"
            label="Email"
            type="email"
            fullWidth
            value={newUser.email}
            onChange={handleInputChange}
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>Role</InputLabel>
            <Select value={newUser.role} onChange={handleRoleChange} label="Role">
              {Object.entries(USER_ROLES).map(([key, value]) => (
                <MenuItem key={key} value={key}>
                  {value}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateUser} variant="contained" color="primary">
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)}>
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            name="name"
            label="Name"
            type="text"
            fullWidth
            value={editUser.name || ''}
            onChange={handleEditInputChange}
          />
          <TextField
            margin="dense"
            name="email"
            label="Email"
            type="email"
            fullWidth
            value={editUser.email || ''}
            onChange={handleEditInputChange}
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>Role</InputLabel>
            <Select value={editUser.role || ''} onChange={handleEditRoleChange} label="Role">
              {Object.entries(USER_ROLES).map(([key, value]) => (
                <MenuItem key={key} value={key}>
                  {value}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleEditUser} variant="contained" color="primary">
            Save
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
