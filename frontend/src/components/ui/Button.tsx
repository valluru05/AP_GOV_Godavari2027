import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'saffron' | 'secondary' | 'danger' | 'outline' | 'ghost';
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
    sm: 'px-2.5 py-1.5 text-xs font-medium rounded-lg',
    md: 'px-3.5 py-2 text-sm font-medium rounded-lg',
    lg: 'px-5 py-2.5 text-base font-semibold rounded-xl',
  };

  const variantClasses = {
    primary:
      'bg-brand text-white hover:bg-brand-hover shadow-sm border border-transparent focus:ring-2 focus:ring-brand/30',
    saffron:
      'bg-saffron text-white hover:bg-saffron-hover shadow-sm border border-transparent focus:ring-2 focus:ring-saffron/30',
    secondary:
      'bg-surface text-textPrimary hover:bg-[#FAF4EC] border border-borderLight shadow-subtle focus:ring-2 focus:ring-borderLight',
    outline:
      'bg-transparent text-brand border border-brand/40 hover:bg-brand-light focus:ring-2 focus:ring-brand/30',
    danger:
      'bg-govError text-white hover:bg-red-800 shadow-sm border border-transparent focus:ring-2 focus:ring-govError/30',
    ghost:
      'bg-transparent text-textSecondary hover:text-textPrimary hover:bg-[#FAF4EC] focus:ring-2 focus:ring-borderLight',
  };

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 transition-all active:scale-[0.98] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed select-none ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : icon ? <span className="shrink-0">{icon}</span> : null}
      {children}
    </button>
  );
};
