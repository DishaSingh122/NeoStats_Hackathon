import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderKanban,
  Plus,
  Search,
  Filter,
  Users,
  CheckCircle2,
  Calendar,
  MoreVertical,
  Archive,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { projectApi } from '../apis/project.api.js';
import { userApi } from '../apis/user.api.js';
import { Button } from '../components/common/Button.jsx';
import { Input } from '../components/common/Input.jsx';
import { Select } from '../components/common/Select.jsx';
import { StatusBadge } from '../components/common/StatusBadge.jsx';
import { LoadingSpinner } from '../components/common/LoadingSpinner.jsx';
import { EmptyState } from '../components/common/EmptyState.jsx';
import { Modal } from '../components/common/Modal.jsx';

export const ProjectsPage = () => {
  const { user, isAdmin, isProjectManager } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('active');
  const [searchQuery, setSearchQuery] = useState('');

  // Create Project Modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newProjectManager, setNewProjectManager] = useState('');
  const [availableManagers, setAvailableManagers] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  const canCreateProject = isAdmin || isProjectManager;

  useEffect(() => {
    fetchProjects();
  }, [statusFilter]);

  useEffect(() => {
    if (isAdmin && isCreateOpen) {
      loadManagers();
    }
  }, [isAdmin, isCreateOpen]);

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

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (searchQuery) params.search = searchQuery;
      const res = await projectApi.getProjects(params);
      setProjects(res.data || []);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchProjects();
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    setModalError('');

    if (!newProjectName.trim()) {
      setModalError('Project name is required.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: newProjectName.trim(),
        description: newProjectDesc.trim(),
      };
      if (isAdmin && newProjectManager) {
        payload.managerId = newProjectManager;
      }

      const res = await projectApi.createProject(payload);
      if (res.success) {
        setIsCreateOpen(false);
        setNewProjectName('');
        setNewProjectDesc('');
        setNewProjectManager('');
        fetchProjects();
      }
    } catch (err) {
      setModalError(err.message || 'Failed to create project.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center">
            <FolderKanban className="w-6 h-6 mr-2 text-indigo-600" /> Projects
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Create, manage, and collaborate across enterprise development projects.
          </p>
        </div>

        {canCreateProject && (
          <Button icon={Plus} onClick={() => setIsCreateOpen(true)}>
            New Project
          </Button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
          />
        </form>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              statusFilter === 'active'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Active Projects
          </button>
          <button
            onClick={() => setStatusFilter('archived')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              statusFilter === 'archived'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Archived Projects
          </button>
        </div>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <LoadingSpinner message="Loading accessible projects..." />
      ) : projects.length === 0 ? (
        <EmptyState
          title={`No ${statusFilter} projects found`}
          description={
            canCreateProject
              ? 'Get started by creating your first team project.'
              : 'You have not been added to any projects in this view.'
          }
          actionLabel={canCreateProject ? 'Create Project' : undefined}
          onAction={canCreateProject ? () => setIsCreateOpen(true) : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => {
            const progress = project.metrics?.progress || 0;
            const totalTasks = project.metrics?.totalTasks || 0;
            const doneTasks = project.metrics?.doneTasks || 0;

            return (
              <div
                key={project._id}
                className="bg-white rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
              >
                <div className="p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <h3 className="text-base font-bold text-slate-900 leading-snug line-clamp-1">
                      <Link to={`/projects/${project._id}`} className="hover:text-indigo-600">
                        {project.name}
                      </Link>
                    </h3>
                    <StatusBadge type={project.status} dot={false} className="shrink-0 text-[10px]" />
                  </div>

                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {project.description || 'No project description entered.'}
                  </p>

                  {/* Progress bar */}
                  <div className="pt-2">
                    <div className="flex justify-between text-xs text-slate-600 mb-1 font-medium">
                      <span>Progress</span>
                      <span className="font-semibold text-slate-800">{progress}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                    <span className="flex items-center">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                      {doneTasks}/{totalTasks} Tasks
                    </span>
                    <span className="truncate max-w-[140px] text-right font-medium text-slate-600">
                      PM: {project.manager?.name || 'Unassigned'}
                    </span>
                  </div>
                </div>

                {/* Card Action footer */}
                <div className="px-5 py-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs">
                  <Link
                    to={`/projects/${project._id}/tasks`}
                    className="font-medium text-indigo-600 hover:text-indigo-800 flex items-center"
                  >
                    View Tasks &rarr;
                  </Link>
                  <Link
                    to={`/projects/${project._id}/team`}
                    className="text-slate-500 hover:text-slate-800 flex items-center"
                  >
                    <Users className="w-3.5 h-3.5 mr-1" /> Team
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Project Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create New Project"
      >
        <form onSubmit={handleCreateProject} className="space-y-4">
          {modalError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-xs text-rose-700 rounded-lg">
              {modalError}
            </div>
          )}

          <Input
            label="Project Name"
            placeholder="e.g. NextGen Microservices Refactor"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            required
            disabled={submitting}
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Description
            </label>
            <textarea
              rows={3}
              placeholder="Outline project objectives, timeline, or scope..."
              value={newProjectDesc}
              onChange={(e) => setNewProjectDesc(e.target.value)}
              disabled={submitting}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg shadow-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
            />
          </div>

          {isAdmin && (
            <Select
              label="Assigned Project Manager"
              value={newProjectManager}
              onChange={(e) => setNewProjectManager(e.target.value)}
              placeholder="Select project manager (Default: You)"
              options={availableManagers.map((m) => ({
                value: m._id,
                label: `${m.name} (${m.email})`,
              }))}
            />
          )}

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setIsCreateOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              Create Project
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
