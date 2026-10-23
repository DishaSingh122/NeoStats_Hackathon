import React from 'react';
import { Menu, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { StatusBadge } from '../components/common/StatusBadge.jsx';

export const Navbar = ({ onOpenSidebar }) => {
  const { user, login } = useAuth();

  const handleQuickSwitch = async (email) => {
    await login(email, 'Password@123');
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6">
      <div className="flex items-center space-x-3">
        <button
          onClick={onOpenSidebar}
          className="p-2 -ml-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Workspace</span>
          <span className="text-slate-300">/</span>
          <span className="text-sm font-semibold text-slate-800">Collaborative Hub</span>
        </div>
      </div>

      {/* Quick Demo Switcher for Judges */}
      <div className="flex items-center space-x-2 sm:space-x-4">
        <div className="hidden md:flex items-center space-x-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200">
          <span className="text-[11px] font-semibold text-slate-500 px-2 flex items-center">
            <Zap className="w-3.5 h-3.5 mr-1 text-amber-500" /> Demo Switch:
          </span>
          <button
            onClick={() => handleQuickSwitch('admin@collabflow.dev')}
            className={`px-2 py-0.5 text-xs font-medium rounded ${
              user?.role === 'admin'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            Admin
          </button>
          <button
            onClick={() => handleQuickSwitch('pm@collabflow.dev')}
            className={`px-2 py-0.5 text-xs font-medium rounded ${
              user?.role === 'project_manager'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            PM
          </button>
          <button
            onClick={() => handleQuickSwitch('dev1@collabflow.dev')}
            className={`px-2 py-0.5 text-xs font-medium rounded ${
              user?.email === 'dev1@collabflow.dev'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            Dev 1
          </button>
          <button
            onClick={() => handleQuickSwitch('viewer@collabflow.dev')}
            className={`px-2 py-0.5 text-xs font-medium rounded ${
              user?.role === 'viewer'
                ? 'bg-slate-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            Viewer
          </button>
        </div>

        <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-slate-800">{user?.name}</p>
            <p className="text-[11px] text-slate-400">{user?.email}</p>
          </div>
          <StatusBadge type={user?.role} />
        </div>
      </div>
    </header>
  );
};
