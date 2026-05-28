import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Button } from '../ui/Button.tsx';

interface CTASectionProps {
  onExploreAirdrops: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

export function CTASection({ onExploreAirdrops }: CTASectionProps) {
  return (
    <section className="bg-ink py-20 border-t border-white/[0.04] relative overflow-hidden">
      <div className="absolute right-0 top-0 -z-10 h-64 w-64 bg-bitcoin/5 rounded-full blur-[100px]" />
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8 font-sans">
        <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-5xl">
          Track markets. Discover opportunities. <span className="text-bitcoin font-mono font-medium">Move earlier.</span>
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-zinc-400">
          Join the anonymous terminal, stay updated with the fastest rates, and access early-stage information updates first.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button variant="primary" onClick={onExploreAirdrops} className="flex items-center gap-1.5 text-xs">
            Access Curations
            <ArrowUpRight size={14} />
          </Button>
        </div>
      </div>
    </section>
  );
}
