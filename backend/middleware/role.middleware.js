import Project from '../model/Project.js';
import ProjectMember from '../model/ProjectMember.js';

// Require one of the specified global roles
export const requireRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden. Requires one of: [${roles.join(', ')}]. Your role is: ${req.user.role}.`,
      });
    }

    next();
  };
};

// Check project access and permissions
export const requireProjectAccess = (requiredRole = 'viewer') => {
  return async (req, res, next) => {
    try {
      const projectId = req.params.projectId || req.params.id || req.body.project;
      if (!projectId) {
        return res.status(400).json({
          success: false,
          message: 'Project ID is required.',
        });
      }

      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found.',
        });
      }

      // Admin has full access to all projects
      if (req.user.role === 'admin') {
        req.project = project;
        req.projectMemberRole = 'manager';
        return next();
      }

      // If user is project manager on the project document
      if (project.manager.toString() === req.user._id.toString()) {
        req.project = project;
        req.projectMemberRole = 'manager';
        return next();
      }

      // Check ProjectMember entry
      const membership = await ProjectMember.findOne({
        project: projectId,
        user: req.user._id,
      });

      if (!membership) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this project.',
        });
      }

      const roleHierarchy = { viewer: 1, member: 2, manager: 3 };
      const userLevel = roleHierarchy[membership.role] || 0;
      const requiredLevel = roleHierarchy[requiredRole] || 1;

      if (userLevel < requiredLevel) {
        return res.status(403).json({
          success: false,
          message: `Insufficient project permissions. Requires ${requiredRole} or higher.`,
        });
      }

      req.project = project;
      req.projectMemberRole = membership.role;
      next();
    } catch (error) {
      next(error);
    }
  };
};
