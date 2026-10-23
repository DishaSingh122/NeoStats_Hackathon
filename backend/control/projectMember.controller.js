import ProjectMember from '../model/ProjectMember.js';
import Project from '../model/Project.js';
import Task from '../model/Task.js';
import User from '../model/User.js';

export const getProjectMembers = async (req, res, next) => {
  try {
    const projectId = req.params.id;

    const members = await ProjectMember.find({ project: projectId })
      .populate('user', 'name email role isActive')
      .sort({ joinedAt: 1 });

    res.status(200).json({
      success: true,
      data: members,
    });
  } catch (error) {
    next(error);
  }
};

export const addProjectMember = async (req, res, next) => {
  try {
    const projectId = req.params.id;
    const { userId, role } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required.',
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    if (!user.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Cannot add an inactive user to the project.',
      });
    }

    // Check if user is already a member
    const existing = await ProjectMember.findOne({
      project: projectId,
      user: userId,
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'User is already a member of this project.',
      });
    }

    const memberRole = role && ['manager', 'member', 'viewer'].includes(role) ? role : 'member';

    const member = await ProjectMember.create({
      project: projectId,
      user: userId,
      role: memberRole,
    });

    const populated = await ProjectMember.findById(member._id).populate('user', 'name email role isActive');

    res.status(201).json({
      success: true,
      message: 'Member added to project successfully.',
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

export const updateMemberRole = async (req, res, next) => {
  try {
    const { id: projectId, userId } = req.params;
    const { role } = req.body;

    if (!role || !['manager', 'member', 'viewer'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Valid project role is required (manager, member, viewer).',
      });
    }

    const member = await ProjectMember.findOne({ project: projectId, user: userId });
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Project membership record not found.',
      });
    }

    // Guard: If demoting from manager, verify there is at least one other active manager
    if (member.role === 'manager' && role !== 'manager') {
      const otherManagers = await ProjectMember.countDocuments({
        project: projectId,
        role: 'manager',
        user: { $ne: userId },
      });

      if (otherManagers === 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot demote the final manager. Assign another manager before demoting.',
        });
      }
    }

    member.role = role;
    await member.save();

    const populated = await ProjectMember.findById(member._id).populate('user', 'name email role isActive');

    res.status(200).json({
      success: true,
      message: 'Member role updated successfully.',
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

export const removeProjectMember = async (req, res, next) => {
  try {
    const { id: projectId, userId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found.',
      });
    }

    // Guard: Cannot remove primary project manager document reference
    if (project.manager.toString() === userId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot remove the primary project manager. Change the project manager first.',
      });
    }

    const member = await ProjectMember.findOne({ project: projectId, user: userId });
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Project membership record not found.',
      });
    }

    // Guard: If this is the last manager, reject removal
    if (member.role === 'manager') {
      const managerCount = await ProjectMember.countDocuments({
        project: projectId,
        role: 'manager',
      });
      if (managerCount <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot remove the final manager without assigning a replacement.',
        });
      }
    }

    await ProjectMember.findByIdAndDelete(member._id);

    // Unassign tasks assigned to this removed member in this project to prevent dangling references
    await Task.updateMany(
      { project: projectId, assignedTo: userId },
      { $set: { assignedTo: null } }
    );

    res.status(200).json({
      success: true,
      message: 'Member removed from project successfully.',
    });
  } catch (error) {
    next(error);
  }
};
