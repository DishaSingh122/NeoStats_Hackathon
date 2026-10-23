import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderKanban,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  ArrowUpRight,
  UserCheck,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { projectApi } from '../apis/project.api.js';
import { LoadingSpinner } from '../components/common/LoadingSpinner.jsx';
import { StatusBadge } from '../components/common/StatusBadge.jsx';
import { EmptyState } from '../components/common/EmptyState.jsx';

export const DashboardPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [assignedTasks, setAssignedTasks] = useState([]);
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    todoTasks: 0,
    inProgressTasks: 0,
    doneTasks: 0,
    myTasksCount: 0,
  });

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch accessible projects
      const res = await projectApi.getProjects();
      const projList = res.data || [];
      setProjects(projList);

      // 2. Fetch tasks across projects to calculate real live metrics
      let totalTodo = 0;
      let totalInProgress = 0;
      let totalDone = 0;
      let allUserTasks = [];

      for (const p of projList) {
        try {
          const taskRes = await projectApi.getProjectTasks(p._id);
          const pTasks = taskRes.data || [];
          for (const t of pTasks) {
            if (t.status === 'todo') totalTodo += 1;
            else if (t.status === 'in_progress') totalInProgress += 1;
            else if (t.status === 'done') totalDone += 1;

            if (t.assignedTo?._id === user?._id || t.assignedTo?.id === user?._id) {
              allUserTasks.push({ ...t, projectName: p.name });
            }
          }
        } catch (err) {
          console.warn(`Could not fetch tasks for project ${p._id}:`, err);
        }
      }

      setAssignedTasks(allUserTasks);
      setStats({
        totalProjects: projList.length,
        activeProjects: projList.filter((p) => p.status === 'active').length,
        todoTasks: totalTodo,
        inProgressTasks: totalInProgress,
        doneTasks: totalDone,
        myTasksCount: allUserTasks.length,
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Calculating real database metrics..." />;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-indigo-500/30 text-indigo-200 text-xs font-semibold mb-3 border border-indigo-400/20">
            Current Session
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome back, {user?.name}
          </h1>
          <p className="mt-2 text-sm text-indigo-200 max-w-2xl leading-relaxed">
            Role: <span className="font-semibold text-white uppercase">{user?.role}</span>. Here is your real-time project pulse, upcoming deadlines, and task distribution loaded directly from the database.
          </p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
            <FolderKanban className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Projects</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{stats.totalProjects}</p>
            <span className="text-[11px] text-emerald-600 font-medium">{stats.activeProjects} Active</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">My Assigned Tasks</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{stats.myTasksCount}</p>
            <span className="text-[11px] text-indigo-600 font-medium">Assigned to you</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">In Progress</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{stats.inProgressTasks}</p>
            <span className="text-[11px] text-amber-600 font-medium">{stats.todoTasks} in To Do</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Completed Tasks</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{stats.doneTasks}</p>
            <span className="text-[11px] text-emerald-600 font-medium">Verified in MongoDB</span>
          </div>
        </div>
      </div>

      {/* Main Grid: My Tasks & Accessible Projects */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Assigned to Me */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-800 flex items-center">
              <UserCheck className="w-5 h-5 mr-2 text-indigo-600" /> My Tasks
            </h2>
            <span className="text-xs text-slate-500 font-medium">{assignedTasks.length} Assigned</span>
          </div>

          {assignedTasks.length === 0 ? (
            <EmptyState
              title="No tasks assigned to you"
              description="You have no pending tasks assigned at this moment."
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {assignedTasks.slice(0, 5).map((task) => (
                <div key={task._id} className="py-3 flex items-center justify-between hover:bg-slate-50 px-2 rounded-lg transition-colors">
                  <div className="min-w-0 pr-3">
                    <Link
                      to={`/tasks/${task._id}`}
                      className="text-sm font-semibold text-slate-800 hover:text-indigo-600 truncate block"
                    >
                      {task.title}
                    </Link>
                    <div className="flex items-center space-x-2 text-xs text-slate-400 mt-1">
                      <span className="truncate max-w-[150px]">{task.projectName}</span>
                      <span>•</span>
                      <StatusBadge type={task.priority} dot={false} className="text-[10px] py-0" />
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center space-x-2">
                    <StatusBadge type={task.status} />
                    <Link
                      to={`/tasks/${task._id}`}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Accessible Projects Overview */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-800 flex items-center">
              <FolderKanban className="w-5 h-5 mr-2 text-indigo-600" /> Active Projects
            </h2>
            <Link to="/projects" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
              View All &rarr;
            </Link>
          </div>

          {projects.length === 0 ? (
            <EmptyState
              title="No accessible projects"
              description="You are not assigned to any projects yet."
            />
          ) : (
            <div className="space-y-4">
              {projects.slice(0, 4).map((p) => {
                const progress = p.metrics?.progress || 0;
                return (
                  <Link
                    key={p._id}
                    to={`/projects/${p._id}`}
                    className="block p-3.5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-xs transition-all bg-slate-50/50"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-800 truncate">{p.name}</h3>
                      <StatusBadge type={p.status} dot={false} className="text-[10px]" />
                    </div>
                    <p className="mt-1 text-xs text-slate-500 line-clamp-1">{p.description || 'No description provided'}</p>

                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-slate-500 mb-1">
                        <span>Progress</span>
                        <span className="font-semibold text-slate-700">{progress}%</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
