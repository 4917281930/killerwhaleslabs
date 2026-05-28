import React from 'react';
import { cn } from '../../lib/cn.ts';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  glow?: boolean;
}

export function Card({ children, className = '', glow = false, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-white/[0.08] bg-[linear-gradient(145deg,rgba(255,255,255,0.058),rgba(255,255,255,0.026))] p-5 shadow-card transition-all duration-300 hover:border-white/[0.12]',
        glow && 'shadow-glow',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
