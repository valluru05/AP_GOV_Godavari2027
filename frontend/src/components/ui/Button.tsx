import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const sizeClasses = {
    sm: 'px-2.5 py-1.5 text-xs',
    md: 'px-3.5 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  };

  const variantClasses = {
    primary: 'bg-brand text-white hover:bg-brand-hover shadow-sm border border-transparent focus:ring-brand-light',
    secondary: 'bg-white text-textPrimary hover:bg-slate-50 border border-borderLight shadow-subtle focus:ring-slate-100',
    outline: 'bg-transparent text-brand border border-brand/30 hover:bg-brand-light focus:ring-brand-light',
    danger: 'bg-govError text-white hover:bg-red-800 shadow-sm border border-transparent focus:ring-govError-light',
    ghost: 'bg-transparent text-textSecondary hover:text-textPrimary hover:bg-slate-100 focus:ring-slate-200',
  };

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed select-none ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : icon ? <span className="shrink-0">{icon}</span> : null}
      {children}
    </button>
  );
};
