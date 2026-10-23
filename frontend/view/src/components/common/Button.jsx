import React from 'react';
import { Loader2 } from 'lucide-react';

const variants = {
  primary: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm focus:ring-indigo-500',
  secondary: 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-sm focus:ring-slate-400',
  danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm focus:ring-rose-500',
  outline: 'border border-indigo-600 text-indigo-600 hover:bg-indigo-50 focus:ring-indigo-500',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:ring-slate-400',
};

const sizes = {
  sm: 'px-2.5 py-1.5 text-xs font-medium rounded-md',
  md: 'px-3.5 py-2 text-sm font-medium rounded-lg',
  lg: 'px-5 py-2.5 text-base font-semibold rounded-lg',
};

export const Button = ({
  children,
  type = 'button',
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  onClick,
  className = '',
  icon: Icon,
  ...props
}) => {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin text-current" />
      ) : Icon ? (
        <Icon className="w-4 h-4 mr-1.5 shrink-0" />
      ) : null}
      {children}
    </button>
  );
};
