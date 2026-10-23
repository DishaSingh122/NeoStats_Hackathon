import mongoose from 'mongoose';

const projectMemberSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project reference is required'],
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    role: {
      type: String,
      enum: {
        values: ['manager', 'member', 'viewer'],
        message: '{VALUE} is not a valid project member role',
      },
      default: 'member',
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

// Unique compound index preventing duplicate membership
projectMemberSchema.index({ project: 1, user: 1 }, { unique: true });

const ProjectMember = mongoose.model('ProjectMember', projectMemberSchema);
export default ProjectMember;
