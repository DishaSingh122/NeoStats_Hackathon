import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Layers, Lock, Mail, ArrowRight, ShieldCheck, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { Button } from '../components/common/Button.jsx';
import { Input } from '../components/common/Input.jsx';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!email.trim() || !password) {
      setFormError('Please enter both email and password.');
      return;
    }

    setSubmitting(true);
    const result = await login(email.trim(), password);
    setSubmitting(false);

    if (result.success) {
      navigate(from, { replace: true });
    } else {
      setFormError(result.message || 'Invalid credentials.');
    }
  };

  const handleQuickFill = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setFormError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-850 to-indigo-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white mx-auto shadow-lg shadow-indigo-500/30 mb-4">
          <Layers className="w-7 h-7" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Welcome to CollabFlow
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Collaborative Project Management Platform (MERN Stack)
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-slate-100">
          {formError && (
            <div className="mb-5 p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-600 mr-2 shrink-0" />
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              placeholder="user@collabflow.dev"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={submitting}
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={submitting}
            />

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={submitting}
                className="w-full text-base py-2.5"
                icon={ArrowRight}
              >
                Sign In to Workspace
              </Button>
            </div>
          </form>

          {/* Quick Demo Credentials for Hackathon Evaluators */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-center mb-3">
              One-Click Demo Credentials
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickFill('admin@collabflow.dev', 'Password@123')}
                className="p-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-left transition-colors"
              >
                <span className="font-bold block">Admin</span>
                <span className="text-[10px] text-purple-600 truncate block">admin@collabflow.dev</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('pm@collabflow.dev', 'Password@123')}
                className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-left transition-colors"
              >
                <span className="font-bold block">Project Manager</span>
                <span className="text-[10px] text-blue-600 truncate block">pm@collabflow.dev</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('dev1@collabflow.dev', 'Password@123')}
                className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-left transition-colors"
              >
                <span className="font-bold block">Team Member</span>
                <span className="text-[10px] text-emerald-600 truncate block">dev1@collabflow.dev</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('viewer@collabflow.dev', 'Password@123')}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-left transition-colors"
              >
                <span className="font-bold block">Viewer</span>
                <span className="text-[10px] text-slate-600 truncate block">viewer@collabflow.dev</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400 text-center mt-2">
              Default password for all demo accounts: <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">Password@123</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
