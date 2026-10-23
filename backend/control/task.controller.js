import Task from '../model/Task.js';
import Project from '../model/Project.js';
import ProjectMember from '../model/ProjectMember.js';
import User from '../model/User.js';

// Helper to validate assignee
const validateAssignee = async (projectId, assignedToId) => {
  if (!assignedToId) return null;

  const assignee = await User.findById(assignedToId);
  if (!assignee || !assignee.isActive) {
    throw new Error('Assigned user does not exist or is inactive.');
  }

  // Check if assignee is member of project
  const isMember = await ProjectMember.findOne({
    project: projectId,
    user: assignedToId,
  });

  // Also check if assignee is project manager on Project
  const project = await Project.findById(projectId);
  const isManager = project && project.manager.toString() === assignedToId.toString();

  if (!isMember && !isManager) {
    throw new Error('Assigned user must be an active member of this project.');
  }

  return assignee._id;
};

// Check if user can modify this specific task
const canUserModifyTask = (user, projectMemberRole, task) => {
  if (user.role === 'admin') return true;
  if (projectMemberRole === 'manager') return true;
  if (user.role === 'project_manager' && projectMemberRole === 'manager') return true;

  // Team Member can only modify tasks assigned to them
  if (user.role === 'team_member' || projectMemberRole === 'member') {
    if (task.assignedTo && task.assignedTo.toString() === user._id.toString()) {
      return true;
    }
  }

  return false;
};

export const getProjectTasks = async (req, res, next) => {
  try {
    const projectId = req.params.id;
    const query = { project: projectId };

    if (req.query.status && ['todo', 'in_progress', 'done'].includes(req.query.status)) {
      query.status = req.query.status;
    }

    if (req.query.priority && ['low', 'medium', 'high'].includes(req.query.priority)) {
      query.priority = req.query.priority;
    }

    if (req.query.assignedTo) {
      query.assignedTo = req.query.assignedTo === 'unassigned' ? null : req.query.assignedTo;
    }

    if (req.query.search) {
      const sanitized = req.query.search.trim().replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
      query.title = { $regex: sanitized, $options: 'i' };
    }

    const tasks = await Task.find(query)
      .populate('assignedTo', 'name email role isActive')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: tasks,
    });
  } catch (error) {
    next(error);
  }
};

export const getTaskById = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignedTo', 'name email role isActive')
      .populate('createdBy', 'name email')
      .populate('project', 'name status manager');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found.',
      });
    }

    res.status(200).json({
      success: true,
      data: task,
    });
  } catch (error) {
    next(error);
  }
};

export const createTask = async (req, res, next) => {
  try {
    const projectId = req.params.id;
    const { title, description, assignedTo, priority, dueDate, status } = req.body;

    if (!title || title.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Task title is required and must be at least 2 characters.',
      });
    }

    // Role check: Viewers cannot create tasks
    if (req.projectMemberRole === 'viewer' || req.user.role === 'viewer') {
      return res.status(403).json({
        success: false,
        message: 'Viewers cannot create tasks.',
      });
    }

    // Validate assignee
    let assigneeId = null;
    if (assignedTo) {
      try {
        assigneeId = await validateAssignee(projectId, assignedTo);
      } catch (err) {
        return res.status(400).json({
          success: false,
          message: err.message,
        });
      }
    }

    const task = await Task.create({
      title: title.trim(),
      description: description ? description.trim() : '',
      project: projectId,
      assignedTo: assigneeId,
      status: status && ['todo', 'in_progress', 'done'].includes(status) ? status : 'todo',
      priority: priority && ['low', 'medium', 'high'].includes(priority) ? priority : 'medium',
      dueDate: dueDate ? new Date(dueDate) : null,
      createdBy: req.user._id,
      version: 1,
    });

    const populated = await Task.findById(task._id)
      .populate('assignedTo', 'name email role isActive')
      .populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'Task created successfully.',
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

export const updateTask = async (req, res, next) => {
  try {
    const taskId = req.params.id;
    const { title, description, assignedTo, status, priority, dueDate, version } = req.body;

    if (version === undefined || version === null || isNaN(Number(version))) {
      return res.status(400).json({
        success: false,
        message: 'Task version is required for concurrency control.',
      });
    }

    const expectedVersion = Number(version);

    // Retrieve existing task to check permissions and project
    const existingTask = await Task.findById(taskId);
    if (!existingTask) {
      return res.status(404).json({
        success: false,
        message: 'Task not found.',
      });
    }

    // Determine project member role
    let memberRole = 'viewer';
    if (req.user.role === 'admin') {
      memberRole = 'manager';
    } else {
      const pm = await ProjectMember.findOne({ project: existingTask.project, user: req.user._id });
      if (pm) memberRole = pm.role;
    }

    if (!canUserModifyTask(req.user, memberRole, existingTask)) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to edit this task. Team members can only update tasks assigned to them.',
      });
    }

    const updateFields = {};

    // Team members can only update status or description/title if assigned, but PM/Admin can change everything
    if (title !== undefined) updateFields.title = title.trim();
    if (description !== undefined) updateFields.description = description.trim();
    if (status !== undefined && ['todo', 'in_progress', 'done'].includes(status)) {
      updateFields.status = status;
    }
    if (priority !== undefined && ['low', 'medium', 'high'].includes(priority)) {
      updateFields.priority = priority;
    }
    if (dueDate !== undefined) {
      updateFields.dueDate = dueDate ? new Date(dueDate) : null;
    }

    if (assignedTo !== undefined) {
      // Only Admin or Manager can reassign tasks
      if (memberRole !== 'manager' && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Only project managers or administrators can reassign tasks.',
        });
      }

      if (assignedTo) {
        try {
          updateFields.assignedTo = await validateAssignee(existingTask.project, assignedTo);
        } catch (err) {
          return res.status(400).json({
            success: false,
            message: err.message,
          });
        }
      } else {
        updateFields.assignedTo = null;
      }
    }

    // OPTIMISTIC CONCURRENCY CONTROL:
    // Atomically find by ID and version match, update fields, increment version by 1
    const updatedTask = await Task.findOneAndUpdate(
      { _id: taskId, version: expectedVersion },
      {
        $set: updateFields,
        $inc: { version: 1 },
      },
      {
        new: true,
        runValidators: true,
      }
    )
      .populate('assignedTo', 'name email role isActive')
      .populate('createdBy', 'name email');

    if (!updatedTask) {
      // Update failed due to stale version or concurrent modification!
      const currentLatestTask = await Task.findById(taskId)
        .populate('assignedTo', 'name email role isActive')
        .populate('createdBy', 'name email');

      if (!currentLatestTask) {
        return res.status(404).json({
          success: false,
          message: 'Task no longer exists.',
        });
      }

      return res.status(409).json({
        success: false,
        message: 'Conflict: This task was modified by another user. Please review the latest changes before saving.',
        conflict: true,
        expectedVersion,
        currentVersion: currentLatestTask.version,
        latestTask: currentLatestTask,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Task updated successfully.',
      data: updatedTask,
    });
  } catch (error) {
    next(error);
  }
};

export const updateTaskStatus = async (req, res, next) => {
  try {
    const taskId = req.params.id;
    const { status, version } = req.body;

    if (!status || !['todo', 'in_progress', 'done'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Valid status is required (todo, in_progress, done).',
      });
    }

    if (version === undefined || version === null || isNaN(Number(version))) {
      return res.status(400).json({
        success: false,
        message: 'Task version is required for concurrency control.',
      });
    }

    const expectedVersion = Number(version);

    const existingTask = await Task.findById(taskId);
    if (!existingTask) {
      return res.status(404).json({
        success: false,
        message: 'Task not found.',
      });
    }

    let memberRole = 'viewer';
    if (req.user.role === 'admin') {
      memberRole = 'manager';
    } else {
      const pm = await ProjectMember.findOne({ project: existingTask.project, user: req.user._id });
      if (pm) memberRole = pm.role;
    }

    if (!canUserModifyTask(req.user, memberRole, existingTask)) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to update the status of this task.',
      });
    }

    const updatedTask = await Task.findOneAndUpdate(
      { _id: taskId, version: expectedVersion },
      {
        $set: { status },
        $inc: { version: 1 },
      },
      {
        new: true,
        runValidators: true,
      }
    )
      .populate('assignedTo', 'name email role isActive')
      .populate('createdBy', 'name email');

    if (!updatedTask) {
      const currentLatestTask = await Task.findById(taskId)
        .populate('assignedTo', 'name email role isActive')
        .populate('createdBy', 'name email');

      return res.status(409).json({
        success: false,
        message: 'Conflict: This task was updated by another user.',
        conflict: true,
        expectedVersion,
        currentVersion: currentLatestTask ? currentLatestTask.version : null,
        latestTask: currentLatestTask,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Task status updated successfully.',
      data: updatedTask,
    });
  } catch (error) {
    next(error);
  }
};

export const updateTaskAssignee = async (req, res, next) => {
  try {
    const taskId = req.params.id;
    const { assignedTo, version } = req.body;

    if (version === undefined || version === null || isNaN(Number(version))) {
      return res.status(400).json({
        success: false,
        message: 'Task version is required for concurrency control.',
      });
    }

    const expectedVersion = Number(version);

    const existingTask = await Task.findById(taskId);
    if (!existingTask) {
      return res.status(404).json({
        success: false,
        message: 'Task not found.',
      });
    }

    // Only Admin or PM can assign tasks
    let isAuthorized = req.user.role === 'admin';
    if (!isAuthorized) {
      const pm = await ProjectMember.findOne({
        project: existingTask.project,
        user: req.user._id,
        role: 'manager',
      });
      if (pm) isAuthorized = true;
    }

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Only project managers or administrators can change task assignments.',
      });
    }

    let assigneeId = null;
    if (assignedTo) {
      try {
        assigneeId = await validateAssignee(existingTask.project, assignedTo);
      } catch (err) {
        return res.status(400).json({
          success: false,
          message: err.message,
        });
      }
    }

    const updatedTask = await Task.findOneAndUpdate(
      { _id: taskId, version: expectedVersion },
      {
        $set: { assignedTo: assigneeId },
        $inc: { version: 1 },
      },
      {
        new: true,
        runValidators: true,
      }
    )
      .populate('assignedTo', 'name email role isActive')
      .populate('createdBy', 'name email');

    if (!updatedTask) {
      const currentLatestTask = await Task.findById(taskId)
        .populate('assignedTo', 'name email role isActive')
        .populate('createdBy', 'name email');

      return res.status(409).json({
        success: false,
        message: 'Conflict: This task was modified by another user.',
        conflict: true,
        expectedVersion,
        currentVersion: currentLatestTask ? currentLatestTask.version : null,
        latestTask: currentLatestTask,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Task assignment updated successfully.',
      data: updatedTask,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteTask = async (req, res, next) => {
  try {
    const taskId = req.params.id;
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found.',
      });
    }

    // Role check: Admin or Project Manager
    let isAuthorized = req.user.role === 'admin';
    if (!isAuthorized) {
      const pm = await ProjectMember.findOne({
        project: task.project,
        user: req.user._id,
        role: 'manager',
      });
      if (pm) isAuthorized = true;
    }

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Only project managers or administrators can delete tasks.',
      });
    }

    await Task.findByIdAndDelete(taskId);

    res.status(200).json({
      success: true,
      message: 'Task deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};
