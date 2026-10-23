import User from '../model/User.js';

export const getUsers = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const query = {};

    // Search by name or email
    if (req.query.search) {
      const sanitized = req.query.search.trim().replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
      query.$or = [
        { name: { $regex: sanitized, $options: 'i' } },
        { email: { $regex: sanitized, $options: 'i' } },
      ];
    }

    // Filter by role
    if (req.query.role && ['admin', 'project_manager', 'team_member', 'viewer'].includes(req.query.role)) {
      query.role = req.query.role;
    }

    // Filter by isActive
    if (req.query.isActive !== undefined && req.query.isActive !== '') {
      query.isActive = req.query.isActive === 'true' || req.query.isActive === true;
    }

    const [users, total] = await Promise.all([
      User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required.',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'A user with this email already exists.',
      });
    }

    const validRoles = ['admin', 'project_manager', 'team_member', 'viewer'];
    const assignedRole = role && validRoles.includes(role) ? role : 'team_member';

    const passwordHash = await User.hashPassword(password);
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: assignedRole,
      isActive: true,
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully.',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const targetUserId = req.params.id;
    const isSelf = req.user._id.toString() === targetUserId;
    const isAdmin = req.user.role === 'admin';

    if (!isAdmin && !isSelf) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own profile.',
      });
    }

    const user = await User.findById(targetUserId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    const { name, email, password, role, isActive } = req.body;

    if (name) user.name = name.trim();
    if (email && isAdmin) {
      const normalizedEmail = email.toLowerCase().trim();
      if (normalizedEmail !== user.email) {
        const existing = await User.findOne({ email: normalizedEmail });
        if (existing) {
          return res.status(409).json({
            success: false,
            message: 'Email address already in use by another account.',
          });
        }
        user.email = normalizedEmail;
      }
    }

    if (password && password.trim().length >= 6) {
      user.passwordHash = await User.hashPassword(password.trim());
    }

    // Role and active status can ONLY be updated by Admin
    if (isAdmin) {
      if (role && ['admin', 'project_manager', 'team_member', 'viewer'].includes(role)) {
        // Prevent demoting the last active admin
        if (user.role === 'admin' && role !== 'admin') {
          const activeAdmins = await User.countDocuments({ role: 'admin', isActive: true });
          if (activeAdmins <= 1) {
            return res.status(400).json({
              success: false,
              message: 'Cannot demote the last remaining active administrator.',
            });
          }
        }
        user.role = role;
      }

      if (isActive !== undefined) {
        if (user.role === 'admin' && !isActive) {
          const activeAdmins = await User.countDocuments({ role: 'admin', isActive: true });
          if (activeAdmins <= 1) {
            return res.status(400).json({
              success: false,
              message: 'Cannot deactivate the last remaining active administrator.',
            });
          }
        }
        user.isActive = Boolean(isActive);
      }
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'User updated successfully.',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const updateUserStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    const { isActive } = req.body;
    if (isActive === undefined) {
      return res.status(400).json({
        success: false,
        message: 'isActive boolean flag is required.',
      });
    }

    if (user.role === 'admin' && !isActive) {
      const activeAdmins = await User.countDocuments({ role: 'admin', isActive: true });
      if (activeAdmins <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot deactivate the last remaining active administrator.',
        });
      }
    }

    user.isActive = Boolean(isActive);
    await user.save();

    res.status(200).json({
      success: true,
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully.`,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};
