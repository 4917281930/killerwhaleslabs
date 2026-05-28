import React from 'react';
import { Waves, BarChart3, ArrowDown } from 'lucide-react';
import { Button } from '../ui/Button.tsx';

interface HeroSectionProps {
  onExploreAirdrops: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  onViewMarket: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  rightPanel?: React.ReactNode;
}

export function HeroSection({ onExploreAirdrops, onViewMarket, rightPanel }: HeroSectionProps) {
  return (
    <section className="relative isolate overflow-hidden bg-ink py-10 sm:py-16 lg:py-24">
      {/* Background gradients and grid */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_16%_18%,rgba(247,147,26,0.12),transparent_30%),radial-gradient(circle_at_80%_26%,rgba(52,211,153,0.06),transparent_35%)]" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-ink to-transparent" />
      
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center">
          {/* Left content */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-zinc-300">
              <Waves size={14} className="shrink-0 text-bitcoin animate-pulse" />
              <span>Bitcoin-native Intelligence Layer</span>
            </div>
            
            <h1 className="text-3xl min-[380px]:text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl font-sans">
              Decode the waves of <span className="text-transparent bg-clip-text bg-gradient-to-r from-bitcoin to-ember">Whale Market</span> intelligence.
            </h1>
            
            <p className="max-w-2xl text-pretty text-base leading-7 text-zinc-400 sm:text-lg">
              killerwhaleslabs tracks live BTC and ETH market structure, sentiment, gas pressure, dominance, and curated early crypto opportunities with a clean, anonymous lab terminal workflow.
            </p>
            
            <div className="flex flex-col gap-3.5 sm:flex-row pt-4">
              <a href="#market" onClick={onViewMarket} className="w-full sm:w-auto">
                <Button variant="primary" className="w-full justify-center flex items-center gap-2">
                  <BarChart3 size={15} />
                  View live market
                </Button>
              </a>
              <a href="/airdrops" onClick={onExploreAirdrops} className="w-full sm:w-auto">
                <Button variant="secondary" className="w-full justify-center flex items-center gap-2">
                  <ArrowDown size={15} />
                  Explore airdrops
                </Button>
              </a>
            </div>
            
            <div className="grid max-w-xl grid-cols-3 gap-3 pt-6 text-[10px] uppercase tracking-[0.18em] text-zinc-500 sm:text-xs font-mono">
              <div className="rounded border border-white/[0.05] bg-white/[0.015] px-3 py-3 text-center backdrop-blur-sm">
                Realtime Market
              </div>
              <div className="rounded border border-white/[0.05] bg-white/[0.015] px-3 py-3 text-center backdrop-blur-sm">
                Early Airdrops
              </div>
              <div className="rounded border border-white/[0.05] bg-white/[0.015] px-3 py-3 text-center backdrop-blur-sm">
                Whale Signal
              </div>
            </div>
          </div>
          
          {/* Right visual panel */}
          <div className="lg:col-span-5 w-full flex flex-col justify-center">
            {rightPanel}
          </div>
        </div>
      </div>
    </section>
  );
}
