import React from 'react';
import { cn } from '../../lib/cn.ts';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'info';
}

export function Badge({ children, className = '', variant = 'default', ...props }: BadgeProps) {
  const baseStyle = 'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em]';
  
  const variants = {
    default: 'border-white/10 bg-black/20 text-zinc-400',
    success: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
    warning: 'border-yellow-400/20 bg-yellow-400/10 text-yellow-200',
    info: 'border-bitcoin/20 bg-bitcoin/10 text-bitcoin'
  };

  return (
    <span className={cn(baseStyle, variants[variant], className)} {...props}>
      {children}
    </span>
  );
}
