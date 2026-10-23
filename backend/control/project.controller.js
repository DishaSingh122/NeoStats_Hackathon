import Project from '../model/Project.js';
import ProjectMember from '../model/ProjectMember.js';
import Task from '../model/Task.js';
import User from '../model/User.js';

// Helper to calculate progress for an array of projects or a single project
const attachProjectMetrics = async (projects) => {
  const projectIds = projects.map((p) => p._id);
  const tasks = await Task.find({ project: { $in: projectIds } });

  const metricsMap = {};
  for (const pid of projectIds) {
    metricsMap[pid.toString()] = { totalTasks: 0, doneTasks: 0, inProgressTasks: 0, todoTasks: 0 };
  }

  for (const t of tasks) {
    const pid = t.project.toString();
    if (metricsMap[pid]) {
      metricsMap[pid].totalTasks += 1;
      if (t.status === 'done') metricsMap[pid].doneTasks += 1;
      else if (t.status === 'in_progress') metricsMap[pid].inProgressTasks += 1;
      else metricsMap[pid].todoTasks += 1;
    }
  }

  return projects.map((proj) => {
    const pObj = proj.toObject ? proj.toObject() : proj;
    const m = metricsMap[pObj._id.toString()] || { totalTasks: 0, doneTasks: 0, inProgressTasks: 0, todoTasks: 0 };
    const progress = m.totalTasks > 0 ? Math.round((m.doneTasks / m.totalTasks) * 100) : 0;
    return {
      ...pObj,
      metrics: {
        ...m,
        progress,
      },
    };
  });
};

export const getProjects = async (req, res, next) => {
  try {
    const query = {};

    // Filter by status
    if (req.query.status && ['active', 'archived'].includes(req.query.status)) {
      query.status = req.query.status;
    }

    // Search by name
    if (req.query.search) {
      const sanitized = req.query.search.trim().replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
      query.name = { $regex: sanitized, $options: 'i' };
    }

    // Role-based filtering
    if (req.user.role !== 'admin') {
      const memberships = await ProjectMember.find({ user: req.user._id }).select('project');
      const memberProjectIds = memberships.map((m) => m.project);

      query.$or = [
        { manager: req.user._id },
        { _id: { $in: memberProjectIds } },
      ];
    }

    const projects = await Project.find(query)
      .populate('manager', 'name email role isActive')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    const projectsWithMetrics = await attachProjectMetrics(projects);

    res.status(200).json({
      success: true,
      data: projectsWithMetrics,
    });
  } catch (error) {
    next(error);
  }
};

export const createProject = async (req, res, next) => {
  try {
    const { name, description, managerId } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Project name is required and must be at least 2 characters.',
      });
    }

    // Default manager is current user unless specified by admin
    let managerUserId = req.user._id;
    if (managerId) {
      if (req.user.role !== 'admin' && managerId !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Only administrators can assign other users as project managers.',
        });
      }
      const managerUser = await User.findById(managerId);
      if (!managerUser || !managerUser.isActive) {
        return res.status(400).json({
          success: false,
          message: 'Specified project manager does not exist or is inactive.',
        });
      }
      managerUserId = managerUser._id;
    }

    const project = await Project.create({
      name: name.trim(),
      description: description ? description.trim() : '',
      manager: managerUserId,
      createdBy: req.user._id,
      status: 'active',
    });

    // Automatically add the manager into ProjectMember with 'manager' role
    await ProjectMember.create({
      project: project._id,
      user: managerUserId,
      role: 'manager',
    });

    // Also add creator if creator is different from manager
    if (req.user._id.toString() !== managerUserId.toString()) {
      await ProjectMember.create({
        project: project._id,
        user: req.user._id,
        role: req.user.role === 'admin' ? 'manager' : 'member',
      });
    }

    const populatedProject = await Project.findById(project._id)
      .populate('manager', 'name email role')
      .populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'Project created successfully.',
      data: populatedProject,
    });
  } catch (error) {
    next(error);
  }
};

export const getProjectById = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('manager', 'name email role isActive')
      .populate('createdBy', 'name email');

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found.',
      });
    }

    const [projectWithMetrics] = await attachProjectMetrics([project]);

    res.status(200).json({
      success: true,
      data: projectWithMetrics,
    });
  } catch (error) {
    next(error);
  }
};

export const updateProject = async (req, res, next) => {
  try {
    const project = req.project;
    const { name, description, managerId } = req.body;

    if (name) project.name = name.trim();
    if (description !== undefined) project.description = description.trim();

    if (managerId && managerId !== project.manager.toString()) {
      if (req.user.role !== 'admin' && req.user._id.toString() !== project.manager.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Only administrators or the current manager can reassign project management.',
        });
      }

      const newManager = await User.findById(managerId);
      if (!newManager || !newManager.isActive) {
        return res.status(400).json({
          success: false,
          message: 'The selected manager does not exist or is inactive.',
        });
      }

      project.manager = newManager._id;

      // Upsert membership for new manager as 'manager'
      await ProjectMember.findOneAndUpdate(
        { project: project._id, user: newManager._id },
        { role: 'manager' },
        { upsert: true, new: true }
      );
    }

    await project.save();

    const updated = await Project.findById(project._id)
      .populate('manager', 'name email role isActive')
      .populate('createdBy', 'name email');

    res.status(200).json({
      success: true,
      message: 'Project updated successfully.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const archiveProject = async (req, res, next) => {
  try {
    const project = req.project;
    const newStatus = project.status === 'active' ? 'archived' : 'active';
    project.status = newStatus;
    await project.save();

    res.status(200).json({
      success: true,
      message: `Project ${newStatus === 'archived' ? 'archived' : 'restored'} successfully.`,
      data: project,
    });
  } catch (error) {
    next(error);
  }
};
