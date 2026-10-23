import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Users,
  UserPlus,
  ArrowLeft,
  Shield,
  Trash2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { projectApi } from '../apis/project.api.js';
import { userApi } from '../apis/user.api.js';
import { Button } from '../components/common/Button.jsx';
import { Select } from '../components/common/Select.jsx';
import { StatusBadge } from '../components/common/StatusBadge.jsx';
import { LoadingSpinner } from '../components/common/LoadingSpinner.jsx';
import { EmptyState } from '../components/common/EmptyState.jsx';
import { Modal } from '../components/common/Modal.jsx';
import { ConfirmDialog } from '../components/common/ConfirmDialog.jsx';

export const ProjectTeamPage = () => {
  const { id: projectId } = useParams();
  const { user, isAdmin } = useAuth();

  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add Member modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedRole, setSelectedRole] = useState('member');
  const [submitting, setSubmitting] = useState(false);
  const [addError, setAddError] = useState('');

  // Remove confirm
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [removing, setRemoving] = useState(false);

  const isProjectManager =
    project?.manager?._id === user?._id || project?.manager?.id === user?._id;
  const canManageTeam = isAdmin || isProjectManager;

  useEffect(() => {
    loadTeamData();
  }, [projectId]);

  const loadTeamData = async () => {
    setLoading(true);
    try {
      const [projRes, membersRes] = await Promise.all([
        projectApi.getProjectById(projectId),
        projectApi.getProjectMembers(projectId),
      ]);
      setProject(projRes.data);
      setMembers(membersRes.data || []);
    } catch (err) {
      console.error('Failed to load project team:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableUsers = async () => {
    try {
      const res = await userApi.getUsers({ limit: 100, isActive: true });
      const currentMemberIds = new Set(members.map((m) => m.user._id));
      const available = (res.data || []).filter((u) => !currentMemberIds.has(u._id));
      setAllUsers(available);
    } catch (err) {
      console.warn('Could not load user roster:', err);
    }
  };

  const handleOpenAdd = () => {
    loadAvailableUsers();
    setIsAddOpen(true);
    setAddError('');
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    setAddError('');

    if (!selectedUser) {
      setAddError('Please select a user to add.');
      return;
    }

    setSubmitting(true);
    try {
      await projectApi.addProjectMember(projectId, {
        userId: selectedUser,
        role: selectedRole,
      });
      setIsAddOpen(false);
      setSelectedUser('');
      setSelectedRole('member');
      loadTeamData();
    } catch (err) {
      setAddError(err.message || 'Failed to add member.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await projectApi.updateMemberRole(projectId, userId, newRole);
      loadTeamData();
    } catch (err) {
      alert(err.message || 'Failed to change member role.');
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;
    setRemoving(true);
    try {
      await projectApi.removeProjectMember(projectId, memberToRemove.user._id);
      setMemberToRemove(null);
      loadTeamData();
    } catch (err) {
      alert(err.message || 'Failed to remove member.');
    } finally {
      setRemoving(false);
    }
  };

  if (loading) return <LoadingSpinner message="Loading team roster..." />;

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div>
        <Link
          to={`/projects/${projectId}`}
          className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors mb-2"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Project Overview
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center">
              <Users className="w-6 h-6 mr-2 text-indigo-600" /> Team: {project?.name}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage project roster, member permissions, and assignments.
            </p>
          </div>

          {canManageTeam && (
            <Button icon={UserPlus} onClick={handleOpenAdd}>
              Add Member
            </Button>
          )}
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Name & Email</th>
                <th className="py-3 px-4">Global Role</th>
                <th className="py-3 px-4">Project Role</th>
                <th className="py-3 px-4">Joined Date</th>
                {canManageTeam && <th className="py-3 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {members.map((member) => {
                const isPrimaryManager = project?.manager?._id === member.user._id;

                return (
                  <tr key={member._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center font-bold">
                          {member.user.name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 flex items-center">
                            {member.user.name}
                            {isPrimaryManager && (
                              <span className="ml-2 px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded text-[10px] font-medium">
                                Lead PM
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-slate-400">{member.user.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <StatusBadge type={member.user.role} dot={false} />
                    </td>

                    <td className="py-3 px-4">
                      {canManageTeam && !isPrimaryManager ? (
                        <select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.user._id, e.target.value)}
                          className="px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="manager">Manager</option>
                          <option value="member">Member</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      ) : (
                        <StatusBadge type={member.role} />
                      )}
                    </td>

                    <td className="py-3 px-4 text-slate-500">
                      {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : '-'}
                    </td>

                    {canManageTeam && (
                      <td className="py-3 px-4 text-right">
                        {!isPrimaryManager ? (
                          <button
                            onClick={() => setMemberToRemove(member)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                            title="Remove Member"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Primary Lead</span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Member Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Add Team Member">
        <form onSubmit={handleAddMember} className="space-y-4">
          {addError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-xs text-rose-700 rounded-lg">
              {addError}
            </div>
          )}

          {allUsers.length === 0 ? (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 text-center">
              All active users in the system are already members of this project.
            </div>
          ) : (
            <>
              <Select
                label="Select User"
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                placeholder="Choose user from database..."
                options={allUsers.map((u) => ({
                  value: u._id,
                  label: `${u.name} (${u.email}) - Role: ${u.role}`,
                }))}
                required
              />

              <Select
                label="Project Role"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                options={[
                  { value: 'member', label: 'Member (Can view & update assigned tasks)' },
                  { value: 'manager', label: 'Manager (Can manage tasks & team)' },
                  { value: 'viewer', label: 'Viewer (Read-only access)' },
                ]}
                required
              />
            </>
          )}

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setIsAddOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={submitting}
              disabled={allUsers.length === 0}
            >
              Add to Team
            </Button>
          </div>
        </form>
      </Modal>

      {/* Remove Member Confirmation */}
      <ConfirmDialog
        isOpen={!!memberToRemove}
        onClose={() => setMemberToRemove(null)}
        onConfirm={handleRemoveMember}
        loading={removing}
        title="Remove Team Member"
        message={`Are you sure you want to remove ${memberToRemove?.user?.name} from this project? Any tasks assigned to them will be set to Unassigned to avoid dangling references.`}
        confirmLabel="Remove Member"
      />
    </div>
  );
};
