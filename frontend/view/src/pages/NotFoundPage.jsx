import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { Button } from '../components/common/Button.jsx';

export const NotFoundPage = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8" />
      </div>
      <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">404 - Page Not Found</h1>
      <p className="mt-2 text-sm text-slate-500 max-w-sm leading-relaxed">
        The route you requested does not exist or may have been relocated.
      </p>
      <div className="mt-6">
        <Link to="/dashboard">
          <Button variant="primary">Return to Dashboard</Button>
        </Link>
      </div>
    </div>
  );
};
