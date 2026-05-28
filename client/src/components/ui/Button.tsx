import React from 'react';
import { cn } from '../../lib/cn.ts';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) {
  const baseStyle = 'inline-flex items-center justify-center font-semibold rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-bitcoin/20 active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none disabled:active:scale-100';
  
  const variants = {
    primary: 'bg-bitcoin text-black shadow-glow hover:bg-ember',
    secondary: 'bg-white/[0.05] border border-white/10 text-white hover:bg-white/[0.08] hover:border-white/20',
    danger: 'bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:border-red-500/30',
    ghost: 'text-zinc-400 hover:text-white hover:bg-white/[0.05]',
    outline: 'border border-bitcoin/30 text-bitcoin hover:bg-bitcoin/10 hover:border-bitcoin/50'
  };

  const sizes = {
    sm: 'px-3.5 py-2 text-xs uppercase tracking-wider',
    md: 'px-5 py-3 text-sm uppercase tracking-wider',
    lg: 'px-7 py-3.5 text-base uppercase tracking-wider'
  };

  return (
    <button
      className={cn(baseStyle, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  );
}
