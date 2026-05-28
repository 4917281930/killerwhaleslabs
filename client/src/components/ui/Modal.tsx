import React from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn.ts';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  className = ''
}: ModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-center overflow-hidden overscroll-contain bg-black/72 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className={cn("w-full max-w-md rounded-lg border border-white/[0.1] bg-ink p-5 shadow-card", className)}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            {subtitle && <p className="text-xs font-medium uppercase tracking-[0.18em] text-bitcoin">{subtitle}</p>}
            <h2 className="mt-1 text-xl font-semibold text-white">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-zinc-300 hover:bg-white/10"
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
