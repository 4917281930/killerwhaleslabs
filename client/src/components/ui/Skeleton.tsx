import React from 'react';
import { cn } from '../../lib/cn.ts';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'rect' | 'circle';
}

export function Skeleton({ variant = 'rect', className = '', ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse bg-white/[0.04] border border-white/[0.06]',
        variant === 'rect' ? 'rounded' : 'rounded-full',
        className
      )}
      {...props}
    />
  );
}
