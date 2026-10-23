import React, { useState } from 'react';
import { UserCheck, Shield, Lock, Save, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { userApi } from '../apis/user.api.js';
import { Button } from '../components/common/Button.jsx';
import { Input } from '../components/common/Input.jsx';
import { StatusBadge } from '../components/common/StatusBadge.jsx';

export const ProfilePage = () => {
  const { user, refreshUser } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('Full name cannot be empty.');
      return;
    }

    if (password && password.length < 6) {
      setErrorMsg('New password must be at least 6 characters long.');
      return;
    }

    if (password && password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setSaving(true);
    try {
      const payload = { name: name.trim() };
      if (password) payload.password = password;

      await userApi.updateUser(user._id, payload);
      await refreshUser();
      setSuccessMsg('Profile updated successfully.');
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-150">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center">
          <UserCheck className="w-6 h-6 mr-2 text-indigo-600" /> Account Settings
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage your personal details and security credentials.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
        {/* Role & Account status badge banner */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-full bg-indigo-600 text-white font-bold text-lg flex items-center justify-center">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">{user?.name}</p>
              <p className="text-xs text-slate-400">{user?.email}</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-0.5">Global Role</span>
            <StatusBadge type={user?.role} />
          </div>
        </div>

        {successMsg && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 font-medium flex items-center">
            <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600 shrink-0" />
            {successMsg}
          </div>
        )}

        {errorMsg && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={saving}
          />

          <Input
            label="Email Address"
            type="email"
            value={user?.email || ''}
            disabled={true}
            helperText="Email changes must be requested through an administrator."
          />

          <div className="pt-4 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center">
              <Lock className="w-3.5 h-3.5 mr-1" /> Change Password
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="New Password"
                type="password"
                placeholder="Leave blank to keep current"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={saving}
              />

              <Input
                label="Confirm New Password"
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={saving}
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <Button type="submit" variant="primary" loading={saving} icon={Save}>
              Save Profile Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
