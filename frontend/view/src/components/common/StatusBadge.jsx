import React from 'react';

const statusConfig = {
  // Task statuses
  todo: { label: 'To Do', bg: 'bg-slate-100 text-slate-700 border-slate-200' },
  in_progress: { label: 'In Progress', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
  done: { label: 'Done', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },

  // Priorities
  low: { label: 'Low', bg: 'bg-sky-50 text-sky-700 border-sky-200' },
  medium: { label: 'Medium', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  high: { label: 'High', bg: 'bg-rose-50 text-rose-700 border-rose-200' },

  // Roles
  admin: { label: 'Admin', bg: 'bg-purple-50 text-purple-700 border-purple-200' },
  project_manager: { label: 'Project Manager', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
  team_member: { label: 'Team Member', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  viewer: { label: 'Viewer', bg: 'bg-slate-100 text-slate-600 border-slate-200' },

  // Project member roles
  manager: { label: 'Manager', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
  member: { label: 'Member', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },

  // Project & User statuses
  active: { label: 'Active', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  archived: { label: 'Archived', bg: 'bg-slate-100 text-slate-600 border-slate-200' },
  deactivated: { label: 'Deactivated', bg: 'bg-rose-50 text-rose-700 border-rose-200' },
};

export const StatusBadge = ({ type, className = '', dot = true }) => {
  const config = statusConfig[type?.toLowerCase()] || {
    label: type || 'Unknown',
    bg: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${config.bg} ${className}`}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70 mr-1.5 shrink-0" />}
      {config.label}
    </span>
  );
};
