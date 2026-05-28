import React from 'react';
import { cn } from '../../lib/cn.ts';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', error, ...props }, ref) => {
    return (
      <div className="w-full">
        <input
          ref={ref}
          className={cn(
            'w-full rounded border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-bitcoin/60 focus:ring-2 focus:ring-bitcoin/15 disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-red-400/50 focus:border-red-400 focus:ring-red-400/15',
            className
          )}
          {...props}
        />
        {error && <span className="mt-1.5 block text-xs text-red-300">{error}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';
