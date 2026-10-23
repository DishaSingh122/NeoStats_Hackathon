import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  FolderKanban,
  Edit,
  Archive,
  RefreshCw,
  Users,
  CheckSquare,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { projectApi } from '../apis/project.api.js';
import { userApi } from '../apis/user.api.js';
import { Button } from '../components/common/Button.jsx';
import { Input } from '../components/common/Input.jsx';
import { Select } from '../components/common/Select.jsx';
import { StatusBadge } from '../components/common/StatusBadge.jsx';
import { LoadingSpinner } from '../components/common/LoadingSpinner.jsx';
import { Modal } from '../components/common/Modal.jsx';
import { ConfirmDialog } from '../components/common/ConfirmDialog.jsx';

export const ProjectDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Edit modal
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editManager, setEditManager] = useState('');
  const [availableManagers, setAvailableManagers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  // Archive confirm
  const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const isManager = project?.manager?._id === user?._id || project?.manager?.id === user?._id;
  const canManage = isAdmin || isManager;

  useEffect(() => {
    loadProject();
  }, [id]);

  const loadProject = async () => {
    setLoading(true);
    try {
      const res = await projectApi.getProjectById(id);
      setProject(res.data);
      setEditName(res.data.name);
      setEditDesc(res.data.description || '');
      setEditManager(res.data.manager?._id || '');
    } catch (err) {
      setError(err.message || 'Failed to load project.');
    } finally {
      setLoading(false);
    }
  };

  const loadManagers = async () => {
    try {
      const res = await userApi.getUsers({ limit: 100 });
      const eligible = (res.data || []).filter(
        (u) => (u.role === 'admin' || u.role === 'project_manager') && u.isActive
      );
      setAvailableManagers(eligible);
    } catch (err) {
      console.warn('Could not load manager list:', err);
    }
  };

  const handleOpenEdit = () => {
    if (isAdmin) loadManagers();
    setIsEditOpen(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setModalError('');
    setSaving(true);
    try {
      const payload = {
        name: editName.trim(),
        description: editDesc.trim(),
      };
      if (isAdmin && editManager) {
        payload.managerId = editManager;
      }
      await projectApi.updateProject(id, payload);
      setIsEditOpen(false);
      loadProject();
    } catch (err) {
      setModalError(err.message || 'Failed to update project.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleArchive = async () => {
    setArchiving(true);
    try {
      await projectApi.archiveProject(id);
      setIsArchiveConfirmOpen(false);
      loadProject();
    } catch (err) {
      alert(err.message || 'Failed to update project status.');
    } finally {
      setArchiving(false);
    }
  };

  if (loading) return <LoadingSpinner message="Loading project details..." />;
  if (error || !project) {
    return (
      <div className="bg-white border border-rose-200 rounded-xl p-8 text-center space-y-4">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-800">Project Not Found or Unauthorized</h2>
        <p className="text-sm text-slate-600">{error || 'This project could not be found or you do not have permission to access it.'}</p>
        <Button onClick={() => navigate('/projects')}>Back to Projects</Button>
      </div>
    );
  }

  const progress = project.metrics?.progress || 0;
  const metrics = project.metrics || { totalTasks: 0, doneTasks: 0, inProgressTasks: 0, todoTasks: 0 };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Back button */}
      <div>
        <Link
          to="/projects"
          className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Projects
        </Link>
      </div>

      {/* Project Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {project.name}
              </h1>
              <StatusBadge type={project.status} />
            </div>
            <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
              {project.description || 'No description provided for this project.'}
            </p>
          </div>

          {canManage && (
            <div className="flex items-center space-x-2 shrink-0">
              <Button variant="secondary" icon={Edit} onClick={handleOpenEdit}>
                Edit
              </Button>
              <Button
                variant={project.status === 'active' ? 'secondary' : 'primary'}
                icon={Archive}
                onClick={() => setIsArchiveConfirmOpen(true)}
              >
                {project.status === 'active' ? 'Archive' : 'Restore'}
              </Button>
            </div>
          )}
        </div>

        {/* Progress & Meta info bar */}
        <div className="pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
              Project Manager
            </span>
            <p className="text-sm font-semibold text-slate-800">{project.manager?.name}</p>
            <span className="text-xs text-slate-500">{project.manager?.email}</span>
          </div>

          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
              Created By
            </span>
            <p className="text-sm font-semibold text-slate-800">{project.createdBy?.name || 'Administrator'}</p>
            <span className="text-xs text-slate-500">
              {new Date(project.createdAt).toLocaleDateString()}
            </span>
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-600 mb-1 font-semibold">
              <span>Overall Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              {metrics.doneTasks} of {metrics.totalTasks} tasks completed
            </span>
          </div>
        </div>
      </div>

      {/* Task Metrics & Quick Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tasks Hub */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 flex items-center">
                <CheckSquare className="w-5 h-5 mr-2 text-indigo-600" /> Project Tasks
              </h2>
              <span className="text-xs font-semibold text-slate-500">{metrics.totalTasks} Total</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Organize, filter, and assign deliverables with real-time optimistic concurrency conflict protection.
            </p>

            <div className="grid grid-cols-3 gap-2 text-center pt-2">
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-lg font-bold text-slate-800 block">{metrics.todoTasks}</span>
                <span className="text-[11px] text-slate-500 font-medium">To Do</span>
              </div>
              <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200">
                <span className="text-lg font-bold text-amber-700 block">{metrics.inProgressTasks}</span>
                <span className="text-[11px] text-amber-600 font-medium">In Progress</span>
              </div>
              <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200">
                <span className="text-lg font-bold text-emerald-700 block">{metrics.doneTasks}</span>
                <span className="text-[11px] text-emerald-600 font-medium">Done</span>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <Link to={`/projects/${project._id}/tasks`}>
              <Button variant="primary" className="w-full">
                Open Task Board &rarr;
              </Button>
            </Link>
          </div>
        </div>

        {/* Team Hub */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 flex items-center">
                <Users className="w-5 h-5 mr-2 text-indigo-600" /> Team & Permissions
              </h2>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Manage project roster, assign project managers, members, and read-only viewers with strict backend validation.
            </p>
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1">
              <p>• Only active users belonging to this team can be assigned tasks.</p>
              <p>• Safe demotion guard protects against removing the final project manager.</p>
            </div>
          </div>

          <div className="pt-2">
            <Link to={`/projects/${project._id}/team`}>
              <Button variant="secondary" className="w-full">
                Manage Team Roster &rarr;
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Edit Project Modal */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit Project Details">
        <form onSubmit={handleSaveEdit} className="space-y-4">
          {modalError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-xs text-rose-700 rounded-lg">
              {modalError}
            </div>
          )}

          <Input
            label="Project Name"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            required
            disabled={saving}
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Description
            </label>
            <textarea
              rows={3}
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              disabled={saving}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg shadow-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
            />
          </div>

          {isAdmin && (
            <Select
              label="Project Manager"
              value={editManager}
              onChange={(e) => setEditManager(e.target.value)}
              options={availableManagers.map((m) => ({
                value: m._id,
                label: `${m.name} (${m.email})`,
              }))}
            />
          )}

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setIsEditOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={saving}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Archive / Restore Confirmation */}
      <ConfirmDialog
        isOpen={isArchiveConfirmOpen}
        onClose={() => setIsArchiveConfirmOpen(false)}
        onConfirm={handleToggleArchive}
        loading={archiving}
        title={project.status === 'active' ? 'Archive Project' : 'Restore Project'}
        message={
          project.status === 'active'
            ? 'Are you sure you want to archive this project? Archived projects become read-only for non-admin users.'
            : 'Are you sure you want to restore this project to Active status?'
        }
        confirmLabel={project.status === 'active' ? 'Archive Project' : 'Restore Project'}
        confirmVariant={project.status === 'active' ? 'danger' : 'primary'}
      />
    </div>
  );
};
