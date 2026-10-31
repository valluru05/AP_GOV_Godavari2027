import React from 'react';

export type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'brand';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  icon,
  className = '',
}) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-medium';

  const variantClasses: Record<BadgeVariant, string> = {
    brand: 'bg-brand-light text-brand border border-brand-subtle',
    success: 'bg-govSuccess-light text-govSuccess border border-govSuccess-border',
    warning: 'bg-govWarning-light text-govWarning border border-govWarning-border',
    error: 'bg-govError-light text-govError border border-govError-border',
    info: 'bg-govInfo-light text-govInfo border border-govInfo-border',
    neutral: 'bg-slate-100 text-slate-700 border border-slate-200',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md tracking-wide ${sizeClasses} ${variantClasses[variant]} ${className}`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </span>
  );
};
