import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  CheckSquare,
  ArrowLeft,
  Calendar,
  Clock,
  User,
  MessageSquare,
  Send,
  Trash2,
  Edit2,
  GitCommit,
  AlertCircle,
  FolderKanban,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { taskApi } from '../apis/task.api.js';
import { commentApi } from '../apis/comment.api.js';
import { projectApi } from '../apis/project.api.js';
import { Button } from '../components/common/Button.jsx';
import { Input } from '../components/common/Input.jsx';
import { Select } from '../components/common/Select.jsx';
import { StatusBadge } from '../components/common/StatusBadge.jsx';
import { LoadingSpinner } from '../components/common/LoadingSpinner.jsx';
import { Modal } from '../components/common/Modal.jsx';
import { ConfirmDialog } from '../components/common/ConfirmDialog.jsx';
import { ConflictModal } from '../components/common/ConflictModal.jsx';

export const TaskDetailPage = () => {
  const { id: taskId } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  const [task, setTask] = useState(null);
  const [comments, setComments] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // New Comment state
  const [newComment, setNewComment] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  // Edit Task modal
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editStatus, setEditStatus] = useState('todo');
  const [editPriority, setEditPriority] = useState('medium');
  const [editAssignee, setEditAssignee] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');

  // Conflict Modal state (OCC HTTP 409)
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [latestConflictTask, setLatestConflictTask] = useState(null);
  const [attemptedConflictData, setAttemptedConflictData] = useState(null);

  // Delete comment / task confirm
  const [commentToDelete, setCommentToDelete] = useState(null);
  const [deletingComment, setDeletingComment] = useState(false);

  const isViewer = user?.role === 'viewer';

  useEffect(() => {
    loadTaskData();
  }, [taskId]);

  const loadTaskData = async () => {
    setLoading(true);
    try {
      const taskRes = await taskApi.getTaskById(taskId);
      setTask(taskRes.data);

      // Load comments
      const commentsRes = await taskApi.getComments(taskId);
      setComments(commentsRes.data || []);

      // Load project members for assignee dropdown
      if (taskRes.data.project?._id || taskRes.data.project) {
        const pId = taskRes.data.project._id || taskRes.data.project;
        const membersRes = await projectApi.getProjectMembers(pId);
        setMembers(membersRes.data || []);
      }
    } catch (err) {
      setError(err.message || 'Task not found or access denied.');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = () => {
    setEditTitle(task.title);
    setEditDesc(task.description || '');
    setEditStatus(task.status);
    setEditPriority(task.priority);
    setEditAssignee(task.assignedTo?._id || '');
    setEditDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '');
    setEditError('');
    setIsEditOpen(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setEditError('');
    setSavingEdit(true);

    const payload = {
      title: editTitle.trim(),
      description: editDesc.trim(),
      status: editStatus,
      priority: editPriority,
      assignedTo: editAssignee || null,
      dueDate: editDueDate || null,
      version: task.version, // Current expected version!
    };

    try {
      const res = await taskApi.updateTask(taskId, payload);
      setTask(res.data);
      setIsEditOpen(false);
    } catch (err) {
      if (err.status === 409 || err.conflict) {
        // Concurrency conflict!
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
      setSavingEdit(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setPostingComment(true);
    try {
      const res = await taskApi.createComment(taskId, { content: newComment.trim() });
      setComments((prev) => [...prev, res.data]);
      setNewComment('');
    } catch (err) {
      alert(err.message || 'Failed to post comment.');
    } finally {
      setPostingComment(false);
    }
  };

  const handleDeleteComment = async () => {
    if (!commentToDelete) return;
    setDeletingComment(true);
    try {
      await commentApi.deleteComment(commentToDelete._id);
      setComments((prev) => prev.filter((c) => c._id !== commentToDelete._id));
      setCommentToDelete(null);
    } catch (err) {
      alert(err.message || 'Failed to delete comment.');
    } finally {
      setDeletingComment(false);
    }
  };

  if (loading) return <LoadingSpinner message="Loading task details & discussion..." />;

  if (error || !task) {
    return (
      <div className="bg-white border border-rose-200 rounded-xl p-8 text-center space-y-4">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-800">Task Not Found</h2>
        <p className="text-sm text-slate-600">{error || 'This task does not exist or access is restricted.'}</p>
        <Button onClick={() => navigate('/projects')}>Back to Projects</Button>
      </div>
    );
  }

  const projectId = task.project?._id || task.project;
  const projectName = task.project?.name || 'Project';

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div>
        <Link
          to={`/projects/${projectId}/tasks`}
          className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors mb-2"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Project Tasks
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs text-slate-400 mb-1">
              <FolderKanban className="w-3.5 h-3.5 text-indigo-500" />
              <Link to={`/projects/${projectId}`} className="hover:underline font-medium text-slate-600">
                {projectName}
              </Link>
              <span>/</span>
              <span>Task Details</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{task.title}</h1>
          </div>

          {!isViewer && (
            <Button icon={Edit2} onClick={openEditModal}>
              Edit Task
            </Button>
          )}
        </div>
      </div>

      {/* Main Grid: Details & Discussion */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Description & Comments */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Description</h2>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
              {task.description || 'No description provided for this task.'}
            </p>
          </div>

          {/* Comments Discussion Section */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900 flex items-center">
                <MessageSquare className="w-5 h-5 mr-2 text-indigo-600" /> Discussion ({comments.length})
              </h2>
            </div>

            {/* Comments list */}
            {comments.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-4">
                No comments yet. Start the conversation below.
              </p>
            ) : (
              <div className="space-y-4 divide-y divide-slate-100">
                {comments.map((comment) => {
                  const isAuthor = comment.author?._id === user?._id || comment.author?.id === user?._id;
                  const canDelete = isAuthor || isAdmin;

                  return (
                    <div key={comment._id} className="pt-4 first:pt-0 flex items-start space-x-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                        {comment.author?.name?.charAt(0) || 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-slate-800">{comment.author?.name}</span>
                            <StatusBadge type={comment.author?.role} dot={false} className="text-[9px] py-0" />
                          </div>
                          <span className="text-[11px] text-slate-400">
                            {new Date(comment.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                          {comment.content}
                        </p>
                        {canDelete && (
                          <div className="mt-1 text-right">
                            <button
                              onClick={() => setCommentToDelete(comment)}
                              className="text-[11px] text-slate-400 hover:text-rose-600"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add Comment Box */}
            {!isViewer ? (
              <form onSubmit={handleAddComment} className="pt-4 border-t border-slate-100 space-y-3">
                <textarea
                  rows={2}
                  placeholder="Write a comment or status update..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  disabled={postingComment}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg shadow-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <div className="flex justify-end">
                  <Button type="submit" variant="primary" size="sm" icon={Send} loading={postingComment}>
                    Post Comment
                  </Button>
                </div>
              </form>
            ) : (
              <p className="text-xs text-slate-400 italic text-center pt-2 border-t border-slate-100">
                Viewers have read-only access and cannot post comments.
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Meta Information & Concurrency Version */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-100">
              Task Details
            </h3>

            <div>
              <span className="text-xs text-slate-400 block mb-1">Status</span>
              <StatusBadge type={task.status} />
            </div>

            <div>
              <span className="text-xs text-slate-400 block mb-1">Priority</span>
              <StatusBadge type={task.priority} dot={false} />
            </div>

            <div>
              <span className="text-xs text-slate-400 block mb-1">Assigned To</span>
              <div className="flex items-center space-x-2 text-sm font-semibold text-slate-800">
                <User className="w-4 h-4 text-slate-400" />
                <span>{task.assignedTo?.name || 'Unassigned'}</span>
              </div>
              {task.assignedTo?.email && (
                <span className="text-xs text-slate-400 block ml-6">{task.assignedTo.email}</span>
              )}
            </div>

            <div>
              <span className="text-xs text-slate-400 block mb-1">Due Date</span>
              <div className="flex items-center space-x-2 text-xs font-medium text-slate-700">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date set'}</span>
              </div>
            </div>

            <div>
              <span className="text-xs text-slate-400 block mb-1">Created By</span>
              <p className="text-xs font-medium text-slate-700">{task.createdBy?.name || 'User'}</p>
              <span className="text-[11px] text-slate-400">{new Date(task.createdAt).toLocaleDateString()}</span>
            </div>

            <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-100 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-indigo-900 flex items-center">
                  <GitCommit className="w-3.5 h-3.5 mr-1 text-indigo-600" /> Version Control:
                </span>
                <span className="font-mono font-bold text-indigo-600">v{task.version}</span>
              </div>
              <p className="text-[10px] text-indigo-700 leading-tight">
                Optimistic Concurrency Control atomically verifies v{task.version} during updates to prevent stale overwrite races.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title={`Edit Task (Current Version: v${task.version})`}>
        <form onSubmit={handleSaveEdit} className="space-y-4">
          {editError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-xs text-rose-700 rounded-lg">
              {editError}
            </div>
          )}

          <Input
            label="Title"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            required
            disabled={savingEdit}
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Description
            </label>
            <textarea
              rows={3}
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              disabled={savingEdit}
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

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setIsEditOpen(false)} disabled={savingEdit}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={savingEdit}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Comment Confirm */}
      <ConfirmDialog
        isOpen={!!commentToDelete}
        onClose={() => setCommentToDelete(null)}
        onConfirm={handleDeleteComment}
        loading={deletingComment}
        title="Delete Comment"
        message="Are you sure you want to delete this comment? This cannot be undone."
      />

      {/* OCC Conflict Modal */}
      <ConflictModal
        isOpen={conflictModalOpen}
        onClose={() => setConflictModalOpen(false)}
        latestTask={latestConflictTask}
        attemptedData={attemptedConflictData}
        onReloadLatest={(latest) => {
          if (latest) {
            setTask(latest);
            setEditTitle(latest.title);
            setEditDesc(latest.description || '');
            setEditStatus(latest.status);
            setEditPriority(latest.priority);
            setEditAssignee(latest.assignedTo?._id || '');
          }
          loadTaskData();
        }}
      />
    </div>
  );
};
