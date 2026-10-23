import Comment from '../model/Comment.js';
import Task from '../model/Task.js';
import ProjectMember from '../model/ProjectMember.js';

export const getTaskComments = async (req, res, next) => {
  try {
    const taskId = req.params.id;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found.',
      });
    }

    const comments = await Comment.find({ task: taskId })
      .populate('author', 'name email role')
      .sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      data: comments,
    });
  } catch (error) {
    next(error);
  }
};

export const createComment = async (req, res, next) => {
  try {
    const taskId = req.params.id;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Comment content cannot be empty.',
      });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found.',
      });
    }

    // Check project access and role
    if (req.user.role === 'viewer') {
      return res.status(403).json({
        success: false,
        message: 'Viewers cannot add comments.',
      });
    }

    if (req.user.role !== 'admin') {
      const pm = await ProjectMember.findOne({
        project: task.project,
        user: req.user._id,
      });

      if (!pm) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this project.',
        });
      }

      if (pm.role === 'viewer') {
        return res.status(403).json({
          success: false,
          message: 'Viewers cannot add comments.',
        });
      }
    }

    const comment = await Comment.create({
      task: taskId,
      author: req.user._id,
      content: content.trim(),
    });

    const populated = await Comment.findById(comment._id).populate('author', 'name email role');

    res.status(201).json({
      success: true,
      message: 'Comment added successfully.',
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteComment = async (req, res, next) => {
  try {
    const commentId = req.params.id;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found.',
      });
    }

    const task = await Task.findById(comment.task);

    // Can delete if author, admin, or project manager
    const isAuthor = comment.author.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    let isManager = false;
    if (task) {
      const pm = await ProjectMember.findOne({
        project: task.project,
        user: req.user._id,
        role: 'manager',
      });
      if (pm) isManager = true;
    }

    if (!isAuthor && !isAdmin && !isManager) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this comment.',
      });
    }

    await Comment.findByIdAndDelete(commentId);

    res.status(200).json({
      success: true,
      message: 'Comment deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};
