import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  UserCheck,
  LogOut,
  ShieldAlert,
  Layers,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { StatusBadge } from '../components/common/StatusBadge.jsx';

export const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout, isAdmin } = useAuth();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Projects', href: '/projects', icon: FolderKanban },
    ...(isAdmin ? [{ name: 'User Management', href: '/users', icon: Users }] : []),
    { name: 'My Profile', href: '/profile', icon: UserCheck },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand header */}
        <div className="h-16 flex items-center px-6 border-b border-slate-800 bg-slate-950/40">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white mr-3 shadow-md shadow-indigo-500/20">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">CollabFlow</h1>
            <span className="text-[10px] text-indigo-400 font-semibold uppercase tracking-wider block">
              MERN Platform
            </span>
          </div>
        </div>

        {/* Navigation links */}
        <div className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Main Menu
          </div>
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`
              }
            >
              <item.icon className="w-5 h-5 mr-3 shrink-0" />
              {item.name}
            </NavLink>
          ))}
        </div>

        {/* User profile card & logout */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/30">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-white font-semibold text-sm">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <StatusBadge type={user?.role} className="mt-0.5 text-[10px] py-0" dot={false} />
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center px-3 py-2 text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors border border-slate-800"
          >
            <LogOut className="w-4 h-4 mr-1.5" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
};
