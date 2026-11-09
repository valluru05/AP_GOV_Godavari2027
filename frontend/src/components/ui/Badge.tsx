import React from 'react';

export type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'brand' | 'saffron';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md' | 'lg';
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
  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-[11px] font-medium'
      : size === 'lg'
      ? 'px-3 py-1.5 text-xs font-semibold'
      : 'px-2.5 py-1 text-xs font-medium';

  const variantClasses: Record<BadgeVariant, string> = {
    brand: 'bg-[#FDF2EB] text-[#8F2D16] border border-[#F7DDD0]',
    saffron: 'bg-[#FEF3E8] text-[#E87512] border border-[#FCE4CB]',
    success: 'bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]',
    warning: 'bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]',
    error: 'bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA]',
    info: 'bg-[#FFF7ED] text-[#C25E09] border border-[#FED7AA]',
    neutral: 'bg-[#FAF4ED] text-[#7C7168] border border-[#E9DED2]',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md tracking-wide ${sizeClasses} ${variantClasses[variant] || variantClasses.neutral} ${className}`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </span>
  );
};
