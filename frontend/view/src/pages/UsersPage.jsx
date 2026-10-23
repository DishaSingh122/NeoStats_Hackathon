import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Shield,
  Edit,
  Power,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { userApi } from '../apis/user.api.js';
import { Button } from '../components/common/Button.jsx';
import { Input } from '../components/common/Input.jsx';
import { Select } from '../components/common/Select.jsx';
import { StatusBadge } from '../components/common/StatusBadge.jsx';
import { LoadingSpinner } from '../components/common/LoadingSpinner.jsx';
import { Modal } from '../components/common/Modal.jsx';
import { ConfirmDialog } from '../components/common/ConfirmDialog.jsx';

export const UsersPage = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  // Create User Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('team_member');
  const [submittingCreate, setSubmittingCreate] = useState(false);
  const [createError, setCreateError] = useState('');

  // Edit User Modal
  const [editingUser, setEditingUser] = useState(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState('team_member');
  const [editPassword, setEditPassword] = useState('');
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [editError, setEditError] = useState('');

  // Status toggle confirm
  const [userToToggle, setUserToToggle] = useState(null);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    loadUsers();
  }, [page, roleFilter, statusFilter]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (searchQuery) params.search = searchQuery;
      if (roleFilter) params.role = roleFilter;
      if (statusFilter !== '') params.isActive = statusFilter;

      const res = await userApi.getUsers(params);
      setUsers(res.data || []);
      setPagination(res.pagination || { total: 0, totalPages: 1 });
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadUsers();
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreateError('');

    if (!newName.trim() || !newEmail.trim() || !newPassword) {
      setCreateError('Name, email, and password are required.');
      return;
    }

    setSubmittingCreate(true);
    try {
      await userApi.createUser({
        name: newName.trim(),
        email: newEmail.trim(),
        password: newPassword,
        role: newRole,
      });
      setIsCreateOpen(false);
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setNewRole('team_member');
      loadUsers();
    } catch (err) {
      setCreateError(err.message || 'Failed to create user.');
    } finally {
      setSubmittingCreate(false);
    }
  };

  const openEditModal = (u) => {
    setEditingUser(u);
    setEditName(u.name);
    setEditEmail(u.email);
    setEditRole(u.role);
    setEditPassword('');
    setEditError('');
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setEditError('');
    setSubmittingEdit(true);

    try {
      const payload = {
        name: editName.trim(),
        email: editEmail.trim(),
        role: editRole,
      };
      if (editPassword.trim()) {
        payload.password = editPassword.trim();
      }

      await userApi.updateUser(editingUser._id, payload);
      setEditingUser(null);
      loadUsers();
    } catch (err) {
      setEditError(err.message || 'Failed to update user.');
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!userToToggle) return;
    setToggling(true);
    try {
      await userApi.updateUserStatus(userToToggle._id, !userToToggle.isActive);
      setUserToToggle(null);
      loadUsers();
    } catch (err) {
      alert(err.message || 'Failed to change user status.');
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center">
            <Users className="w-6 h-6 mr-2 text-indigo-600" /> User Administration
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Admin privileges: Create accounts, assign global roles, and manage active system status.
          </p>
        </div>

        <Button icon={UserPlus} onClick={() => setIsCreateOpen(true)}>
          Create User
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </form>

        <div className="flex items-center space-x-2 w-full md:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-700"
          >
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="project_manager">Project Manager</option>
            <option value="team_member">Team Member</option>
            <option value="viewer">Viewer</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-700"
          >
            <option value="">All Statuses</option>
            <option value="true">Active Only</option>
            <option value="false">Deactivated Only</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <LoadingSpinner message="Loading user directory..." />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Global Role</th>
                  <th className="py-3 px-4">Account Status</th>
                  <th className="py-3 px-4">Created Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {users.map((u) => {
                  const isCurrent = u._id === currentUser?._id;

                  return (
                    <tr key={u._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-bold">
                            {u.name?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 flex items-center">
                              {u.name}
                              {isCurrent && (
                                <span className="ml-2 px-1.5 py-0.2 bg-indigo-100 text-indigo-700 rounded text-[10px] font-medium">
                                  You
                                </span>
                              )}
                            </p>
                            <p className="text-[11px] text-slate-400">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <StatusBadge type={u.role} dot={false} />
                      </td>

                      <td className="py-3 px-4">
                        <StatusBadge type={u.isActive ? 'active' : 'deactivated'} />
                      </td>

                      <td className="py-3 px-4 text-slate-500">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>

                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => openEditModal(u)}
                          className="text-indigo-600 hover:text-indigo-900 font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setUserToToggle(u)}
                          disabled={isCurrent && u.role === 'admin'}
                          className={`font-medium ${
                            u.isActive ? 'text-rose-600 hover:text-rose-900' : 'text-emerald-600 hover:text-emerald-900'
                          } disabled:opacity-30 disabled:cursor-not-allowed`}
                        >
                          {u.isActive ? 'Deactivate' : 'Reactivate'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50">
            <span>
              Showing {users.length} of {pagination.total} users
            </span>
            <div className="flex items-center space-x-2">
              <Button
                variant="secondary"
                size="sm"
                icon={ChevronLeft}
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="font-semibold text-slate-700">
                Page {page} of {pagination.totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next &rarr;
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create New User Account">
        <form onSubmit={handleCreateUser} className="space-y-4">
          {createError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-xs text-rose-700 rounded-lg">
              {createError}
            </div>
          )}

          <Input
            label="Full Name"
            placeholder="e.g. Alex Morgan"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
            disabled={submittingCreate}
          />

          <Input
            label="Email Address"
            type="email"
            placeholder="alex@collabflow.dev"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            required
            disabled={submittingCreate}
          />

          <Input
            label="Initial Password"
            type="password"
            placeholder="At least 6 characters"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            disabled={submittingCreate}
          />

          <Select
            label="Assigned Global Role"
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            options={[
              { value: 'admin', label: 'Admin (Full system and user access)' },
              { value: 'project_manager', label: 'Project Manager (Can create & lead projects)' },
              { value: 'team_member', label: 'Team Member (Can work on assigned tasks)' },
              { value: 'viewer', label: 'Viewer (Read-only access)' },
            ]}
          />

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setIsCreateOpen(false)} disabled={submittingCreate}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submittingCreate}>
              Create User
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal isOpen={!!editingUser} onClose={() => setEditingUser(null)} title="Edit User Account">
        <form onSubmit={handleSaveEdit} className="space-y-4">
          {editError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-xs text-rose-700 rounded-lg">
              {editError}
            </div>
          )}

          <Input
            label="Full Name"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            required
            disabled={submittingEdit}
          />

          <Input
            label="Email Address"
            type="email"
            value={editEmail}
            onChange={(e) => setEditEmail(e.target.value)}
            required
            disabled={submittingEdit}
          />

          <Select
            label="Global Role"
            value={editRole}
            onChange={(e) => setEditRole(e.target.value)}
            options={[
              { value: 'admin', label: 'Admin' },
              { value: 'project_manager', label: 'Project Manager' },
              { value: 'team_member', label: 'Team Member' },
              { value: 'viewer', label: 'Viewer' },
            ]}
          />

          <Input
            label="Reset Password (optional)"
            type="password"
            placeholder="Leave blank to keep current password"
            value={editPassword}
            onChange={(e) => setEditPassword(e.target.value)}
            disabled={submittingEdit}
          />

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setEditingUser(null)} disabled={submittingEdit}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submittingEdit}>
              Save User
            </Button>
          </div>
        </form>
      </Modal>

      {/* Status Toggle Confirm */}
      <ConfirmDialog
        isOpen={!!userToToggle}
        onClose={() => setUserToToggle(null)}
        onConfirm={handleToggleStatus}
        loading={toggling}
        title={userToToggle?.isActive ? 'Deactivate User Account' : 'Reactivate User Account'}
        message={
          userToToggle?.isActive
            ? `Are you sure you want to deactivate ${userToToggle?.name}? They will immediately be denied authentication across all endpoints.`
            : `Are you sure you want to reactivate ${userToToggle?.name}?`
        }
        confirmLabel={userToToggle?.isActive ? 'Deactivate' : 'Reactivate'}
        confirmVariant={userToToggle?.isActive ? 'danger' : 'primary'}
      />
    </div>
  );
};
