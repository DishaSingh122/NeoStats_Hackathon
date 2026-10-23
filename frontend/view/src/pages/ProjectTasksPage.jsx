import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  ArrowLeft,
  LayoutGrid,
  Table as TableIcon,
  AlertCircle,
  MoreVertical,
  Trash2,
  Edit2,
  CheckCircle2,
  User,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { projectApi } from '../apis/project.api.js';
import { taskApi } from '../apis/task.api.js';
import { Button } from '../components/common/Button.jsx';
import { Input } from '../components/common/Input.jsx';
import { Select } from '../components/common/Select.jsx';
import { StatusBadge } from '../components/common/StatusBadge.jsx';
import { LoadingSpinner } from '../components/common/LoadingSpinner.jsx';
import { EmptyState } from '../components/common/EmptyState.jsx';
import { Modal } from '../components/common/Modal.jsx';
import { ConfirmDialog } from '../components/common/ConfirmDialog.jsx';
import { ConflictModal } from '../components/common/ConflictModal.jsx';

export const ProjectTasksPage = () => {
  const { id: projectId } = useParams();
  const { user, isAdmin } = useAuth();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' or 'table'
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Create Task Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('medium');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskStatus, setNewTaskStatus] = useState('todo');
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState('');

  // Edit Task Modal & Concurrency state
  const [editingTask, setEditingTask] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editAssignee, setEditAssignee] = useState('');
  const [editPriority, setEditPriority] = useState('medium');
  const [editDueDate, setEditDueDate] = useState('');
  const [editStatus, setEditStatus] = useState('todo');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  // Conflict Modal state (OCC HTTP 409)
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [latestConflictTask, setLatestConflictTask] = useState(null);
  const [attemptedConflictData, setAttemptedConflictData] = useState(null);

  // Delete confirm
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const isViewer = user?.role === 'viewer';

  useEffect(() => {
    loadAll();
  }, [projectId]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [projRes, tasksRes, membersRes] = await Promise.all([
        projectApi.getProjectById(projectId),
        projectApi.getProjectTasks(projectId),
        projectApi.getProjectMembers(projectId),
      ]);
      setProject(projRes.data);
      setTasks(tasksRes.data || []);
      setMembers(membersRes.data || []);
    } catch (err) {
      console.error('Failed to load project tasks data:', err);
    } finally {
      setLoading(false);
    }
  };

  const reloadTasksOnly = async () => {
    try {
      const res = await projectApi.getProjectTasks(projectId);
      setTasks(res.data || []);
    } catch (err) {
      console.error('Failed to reload tasks:', err);
    }
  };

  // Filter tasks locally based on search and filters
  const filteredTasks = tasks.filter((task) => {
    if (statusFilter && task.status !== statusFilter) return false;
    if (priorityFilter && task.priority !== priorityFilter) return false;
    if (assigneeFilter) {
      if (assigneeFilter === 'unassigned' && task.assignedTo) return false;
      if (assigneeFilter !== 'unassigned' && task.assignedTo?._id !== assigneeFilter) return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = task.title.toLowerCase().includes(q);
      const matchDesc = task.description?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc) return false;
    }
    return true;
  });

  // Create Task handler
  const handleCreateTask = async (e) => {
    e.preventDefault();
    setCreateError('');

    if (!newTaskTitle.trim()) {
      setCreateError('Task title is required.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: newTaskTitle.trim(),
        description: newTaskDesc.trim(),
        priority: newTaskPriority,
        status: newTaskStatus,
        assignedTo: newTaskAssignee || null,
        dueDate: newTaskDueDate || null,
      };

      await projectApi.createTask(projectId, payload);
      setIsCreateOpen(false);
      setNewTaskTitle('');
      setNewTaskDesc('');
      setNewTaskAssignee('');
      setNewTaskPriority('medium');
      setNewTaskDueDate('');
      setNewTaskStatus('todo');
      reloadTasksOnly();
    } catch (err) {
      setCreateError(err.message || 'Failed to create task.');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Task Modal
  const openEditModal = (task) => {
    setEditingTask(task);
    setEditTitle(task.title);
    setEditDesc(task.description || '');
    setEditAssignee(task.assignedTo?._id || '');
    setEditPriority(task.priority);
    setEditStatus(task.status);
    setEditDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '');
    setEditError('');
  };

  // Save Edit with Optimistic Concurrency Control
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingTask) return;

    setEditError('');
    setEditSaving(true);

    const payload = {
      title: editTitle.trim(),
      description: editDesc.trim(),
      status: editStatus,
      priority: editPriority,
      assignedTo: editAssignee || null,
      dueDate: editDueDate || null,
      version: editingTask.version, // Current expected version!
    };

    try {
      await taskApi.updateTask(editingTask._id, payload);
      setEditingTask(null);
      reloadTasksOnly();
    } catch (err) {
      if (err.status === 409 || err.conflict) {
        // CONFLICT DETECTED!
        const assigneeObj = members.find((m) => m.user._id === editAssignee);
        setAttemptedConflictData({
          title: editTitle,
          status: editStatus,
          priority: editPriority,
          assigneeName: assigneeObj?.user?.name,
        });
        setLatestConflictTask(err.latestTask);
        setConflictModalOpen(true);
      } else {
        setEditError(err.message || 'Failed to update task.');
      }
    } finally {
      setEditSaving(false);
    }
  };

  // Quick Status change from Kanban column or table
  const handleQuickStatusChange = async (task, newStatus) => {
    if (task.status === newStatus) return;
    try {
      await taskApi.updateStatus(task._id, {
        status: newStatus,
        version: task.version, // Optimistic concurrency check
      });
      reloadTasksOnly();
    } catch (err) {
      if (err.status === 409 || err.conflict) {
        setAttemptedConflictData({ status: newStatus });
        setLatestConflictTask(err.latestTask);
        setConflictModalOpen(true);
      } else {
        alert(err.message || 'Could not update task status.');
      }
    }
  };

  // Delete task
  const handleDeleteTask = async () => {
    if (!taskToDelete) return;
    setDeleting(true);
    try {
      await taskApi.deleteTask(taskToDelete._id);
      setTaskToDelete(null);
      reloadTasksOnly();
    } catch (err) {
      alert(err.message || 'Failed to delete task.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <LoadingSpinner message="Loading task workspace..." />;

  // Kanban Columns
  const kanbanColumns = [
    { id: 'todo', title: 'To Do', color: 'border-slate-300 bg-slate-50' },
    { id: 'in_progress', title: 'In Progress', color: 'border-amber-300 bg-amber-50/30' },
    { id: 'done', title: 'Done', color: 'border-emerald-300 bg-emerald-50/30' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
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
              <CheckSquare className="w-6 h-6 mr-2 text-indigo-600" /> Tasks: {project?.name}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage work items with optimistic concurrency control (OCC).
            </p>
          </div>

          {!isViewer && (
            <Button icon={Plus} onClick={() => setIsCreateOpen(true)}>
              New Task
            </Button>
          )}
        </div>
      </div>

      {/* Controls Bar: Filters, Search, View Mode Toggle */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-700"
          >
            <option value="">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-700"
          >
            <option value="">All Assignees</option>
            <option value="unassigned">Unassigned</option>
            {members.map((m) => (
              <option key={m.user._id} value={m.user._id}>
                {m.user.name}
              </option>
            ))}
          </select>

          {/* View toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 ml-auto md:ml-2">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-md text-xs font-medium flex items-center ${
                viewMode === 'kanban' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Kanban Board View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md text-xs font-medium flex items-center ${
                viewMode === 'table' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Table View"
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Task Content: Kanban or Table */}
      {filteredTasks.length === 0 ? (
        <EmptyState
          title="No tasks match the filter"
          description="Adjust your search criteria or create a new task to get started."
          actionLabel={!isViewer ? 'Create Task' : undefined}
          onAction={!isViewer ? () => setIsCreateOpen(true) : undefined}
        />
      ) : viewMode === 'kanban' ? (
        /* KANBAN BOARD */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {kanbanColumns.map((col) => {
            const colTasks = filteredTasks.filter((t) => t.status === col.id);

            return (
              <div
                key={col.id}
                className={`rounded-xl border p-4 flex flex-col space-y-3 min-h-[450px] ${col.color}`}
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/70">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center">
                    <span className="w-2 h-2 rounded-full bg-current mr-2 opacity-80" />
                    {col.title}
                  </h3>
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-white text-slate-600 border border-slate-200 shadow-2xs">
                    {colTasks.length}
                  </span>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto">
                  {colTasks.map((task) => (
                    <div
                      key={task._id}
                      className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-indigo-400 hover:shadow-sm transition-all space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <Link
                          to={`/tasks/${task._id}`}
                          className="text-sm font-bold text-slate-800 hover:text-indigo-600 leading-snug line-clamp-2"
                        >
                          {task.title}
                        </Link>
                      </div>

                      {task.description && (
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                          {task.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                        <StatusBadge type={task.priority} dot={false} className="text-[10px] py-0" />
                        <span className="text-[10px] font-mono text-slate-400">v{task.version}</span>
                      </div>

                      <div className="flex items-center justify-between pt-1 text-xs text-slate-500">
                        <span className="flex items-center truncate max-w-[140px]">
                          <User className="w-3.5 h-3.5 mr-1 text-slate-400 shrink-0" />
                          <span className="truncate">{task.assignedTo?.name || 'Unassigned'}</span>
                        </span>

                        {!isViewer && (
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => openEditModal(task)}
                              className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors"
                              title="Edit Task"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setTaskToDelete(task)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                              title="Delete Task"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Quick Move Status dropdown */}
                      {!isViewer && (
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">Move:</span>
                          <div className="flex items-center space-x-1">
                            {kanbanColumns
                              .filter((c) => c.id !== task.status)
                              .map((c) => (
                                <button
                                  key={c.id}
                                  onClick={() => handleQuickStatusChange(task, c.id)}
                                  className="px-2 py-0.5 rounded bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 transition-colors"
                                >
                                  {c.title}
                                </button>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Assignee</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Version</th>
                  {!isViewer && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredTasks.map((task) => (
                  <tr key={task._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      <Link to={`/tasks/${task._id}`} className="hover:text-indigo-600">
                        {task.title}
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge type={task.status} />
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge type={task.priority} dot={false} />
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {task.assignedTo?.name || <span className="text-slate-400">Unassigned</span>}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '-'}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">v{task.version}</td>
                    {!isViewer && (
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => openEditModal(task)}
                          className="text-indigo-600 hover:text-indigo-900 font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setTaskToDelete(task)}
                          className="text-rose-600 hover:text-rose-900 font-medium"
                        >
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create New Task">
        <form onSubmit={handleCreateTask} className="space-y-4">
          {createError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-xs text-rose-700 rounded-lg">
              {createError}
            </div>
          )}

          <Input
            label="Task Title"
            placeholder="e.g. Implement Optimistic Concurrency Control"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            required
            disabled={submitting}
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Description
            </label>
            <textarea
              rows={3}
              placeholder="Provide specifications, acceptance criteria, or context..."
              value={newTaskDesc}
              onChange={(e) => setNewTaskDesc(e.target.value)}
              disabled={submitting}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg shadow-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Priority"
              value={newTaskPriority}
              onChange={(e) => setNewTaskPriority(e.target.value)}
              options={[
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
              ]}
            />

            <Select
              label="Initial Status"
              value={newTaskStatus}
              onChange={(e) => setNewTaskStatus(e.target.value)}
              options={[
                { value: 'todo', label: 'To Do' },
                { value: 'in_progress', label: 'In Progress' },
                { value: 'done', label: 'Done' },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Assigned Member"
              value={newTaskAssignee}
              onChange={(e) => setNewTaskAssignee(e.target.value)}
              placeholder="Unassigned"
              options={members.map((m) => ({
                value: m.user._id,
                label: `${m.user.name} (${m.role})`,
              }))}
            />

            <Input
              label="Due Date"
              type="date"
              value={newTaskDueDate}
              onChange={(e) => setNewTaskDueDate(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setIsCreateOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              Create Task
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Task Modal */}
      <Modal isOpen={!!editingTask} onClose={() => setEditingTask(null)} title={`Edit Task (v${editingTask?.version})`}>
        <form onSubmit={handleSaveEdit} className="space-y-4">
          {editError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-xs text-rose-700 rounded-lg">
              {editError}
            </div>
          )}

          <Input
            label="Task Title"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            required
            disabled={editSaving}
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Description
            </label>
            <textarea
              rows={3}
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              disabled={editSaving}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg shadow-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Status"
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value)}
              options={[
                { value: 'todo', label: 'To Do' },
                { value: 'in_progress', label: 'In Progress' },
                { value: 'done', label: 'Done' },
              ]}
            />

            <Select
              label="Priority"
              value={editPriority}
              onChange={(e) => setEditPriority(e.target.value)}
              options={[
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Assignee"
              value={editAssignee}
              onChange={(e) => setEditAssignee(e.target.value)}
              placeholder="Unassigned"
              options={members.map((m) => ({
                value: m.user._id,
                label: `${m.user.name} (${m.role})`,
              }))}
            />

            <Input
              label="Due Date"
              type="date"
              value={editDueDate}
              onChange={(e) => setEditDueDate(e.target.value)}
            />
          </div>

          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 text-[11px]">
            Optimistic Concurrency Active: Checking expected database version: <strong>v{editingTask?.version}</strong>.
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setEditingTask(null)} disabled={editSaving}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={editSaving}>
              Save Task
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!taskToDelete}
        onClose={() => setTaskToDelete(null)}
        onConfirm={handleDeleteTask}
        loading={deleting}
        title="Delete Task"
        message={`Are you sure you want to permanently delete task "${taskToDelete?.title}"?`}
        confirmLabel="Delete Task"
      />

      {/* Conflict Modal on HTTP 409 */}
      <ConflictModal
        isOpen={conflictModalOpen}
        onClose={() => setConflictModalOpen(false)}
        latestTask={latestConflictTask}
        attemptedData={attemptedConflictData}
        onReloadLatest={(latest) => {
          if (latest) {
            openEditModal(latest);
          }
          reloadTasksOnly();
        }}
      />
    </div>
  );
};
