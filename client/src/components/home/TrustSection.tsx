import React from 'react';
import { Terminal, ShieldAlert, EyeOff, Cpu } from 'lucide-react';
import { Card } from '../ui/Card.tsx';

export function TrustSection() {
  const pillars = [
    {
      icon: Terminal,
      title: 'Minimalist Terminal',
      description: 'Focus on pure crypto metrics and raw signals. No social hype, no bloated graphics, just the data you need.'
    },
    {
      icon: ShieldAlert,
      title: 'Vetted Opportunities',
      description: 'Each tracking campaign is selected and scrutinized for authentic contribution rewards. We filter out spam and scams.'
    },
    {
      icon: EyeOff,
      title: 'Privacy Preserved',
      description: 'No telemetry, no user tracking, no cookies outside of basic operator security. A completely anonymous workflow.'
    },
    {
      icon: Cpu,
      title: 'Performance Optimized',
      description: 'Built with micro-throttled websocket channels and SSE streams to run smoothly on weak machines or mobile screens.'
    }
  ];

  return (
    <section id="about" className="relative bg-ink py-16 sm:py-24 border-t border-white/[0.04]">
      {/* Subtle background blur circle */}
      <div className="absolute left-1/2 top-1/2 -z-10 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-bitcoin/5 blur-[120px]" />
      
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-14 text-center max-w-2xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-bitcoin">Core Engine</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl font-sans">
            Engineered for high-frequency signal discovery.
          </h2>
          <p className="mt-4 text-sm text-zinc-400 font-sans">
            We bypass the noise of public media to provide clean logs of early network opportunities and live asset tracking.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {pillars.map((pillar, index) => {
            const Icon = pillar.icon;
            return (
              <Card key={index} className="flex flex-col justify-start border-white/[0.06] p-6 hover:border-zinc-800 duration-200">
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-bitcoin/10 text-bitcoin">
                  <Icon size={18} />
                </div>
                <h3 className="mt-5 text-base font-semibold text-white font-sans">{pillar.title}</h3>
                <p className="mt-2.5 text-xs leading-relaxed text-zinc-400 font-sans">
                  {pillar.description}
                </p>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
