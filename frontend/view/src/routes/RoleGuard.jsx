import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { Button } from '../components/common/Button.jsx';
import { useNavigate } from 'react-router-dom';

export const RoleGuard = ({ roles = [], children }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user || (roles.length > 0 && !roles.includes(user.role))) {
    return (
      <div className="bg-white border border-rose-200 rounded-xl p-8 max-w-lg mx-auto text-center space-y-4 shadow-sm my-12">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-slate-800">Access Restricted</h3>
        <p className="text-sm text-slate-600 leading-relaxed">
          Your current role (<span className="font-semibold text-rose-600">{user?.role || 'Guest'}</span>) does not have permission to view or manage this module. Required role(s):{' '}
          <span className="font-semibold">{roles.join(', ')}</span>.
        </p>
        <div className="pt-2">
          <Button variant="secondary" onClick={() => navigate('/dashboard')}>
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return children;
};
