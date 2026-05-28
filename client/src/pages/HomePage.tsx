import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shell } from '../components/layout/Shell.tsx';
import { HeroSection } from '../components/home/HeroSection.tsx';
import { BitcoinPriceCard } from '../components/home/BitcoinPriceCard.tsx';
import { StatsStrip } from '../components/home/StatsStrip.tsx';
import { AirdropSection } from '../components/home/AirdropSection.tsx';
import { MarketTicker } from '../components/home/MarketTicker.tsx';
import { TrustSection } from '../components/home/TrustSection.tsx';
import { CTASection } from '../components/home/CTASection.tsx';
import { useMarketData } from '../hooks/useMarketData.ts';
import { useProjects } from '../hooks/useProjects.ts';

export function HomePage() {
  const navigate = useNavigate();
  const { marketStream, fearGreed, dominance, gas, trending } = useMarketData();
  const { projects, loading: projectsLoading, error: projectsError } = useProjects();

  React.useEffect(() => {
    document.title = 'killerwhaleslabs - Crypto Market Intelligence & Airdrop Tracker';
  }, []);

  const handleExploreAirdrops = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate('/airdrops');
  };

  const handleViewMarket = (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById('market-dashboard')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Right-hand panel for Hero: renders live price panels side-by-side or stacked
  const heroMarketPanel = (
    <div className="flex flex-col gap-4 animate-fade-in">
      <BitcoinPriceCard asset="BTC" snapshot={marketStream.btc} />
      <BitcoinPriceCard asset="ETH" snapshot={marketStream.eth} />
    </div>
  );

  return (
    <Shell>
      {/* 1. Hero Section with Live Price Panels */}
      <HeroSection
        onExploreAirdrops={handleExploreAirdrops}
        onViewMarket={handleViewMarket}
        rightPanel={heroMarketPanel}
      />

      {/* 2. Stats Strip */}
      <StatsStrip fearGreed={fearGreed} dominance={dominance} gas={gas} />

      {/* 3. Live Market Section */}
      <section id="market-dashboard" className="bg-ink px-4 py-16 border-t border-white/[0.04] sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10">
            <h2 className="text-2xl font-semibold text-white tracking-tight sm:text-4xl font-sans">
              Market Intelligence Terminal
            </h2>
            <p className="mt-2 text-sm text-zinc-400 font-sans">
              Direct feeds streaming real-time rates and ecosystem momentum benchmarks.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Live Cards */}
            <div className="lg:col-span-2 space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <BitcoinPriceCard asset="BTC" snapshot={marketStream.btc} />
                <BitcoinPriceCard asset="ETH" snapshot={marketStream.eth} />
              </div>
              <div className="rounded-lg border border-white/[0.08] bg-white/[0.01] p-5 font-mono text-xs text-zinc-500 leading-relaxed">
                <span className="text-bitcoin font-semibold uppercase tracking-wider block mb-2">Terminal Diagnostics</span>
                Market tickers query directly to the Binance WebSocket and backup REST layers. DOM/Fear & Greed indexes poll at standard caching boundaries to prevent API exhaustion.
              </div>
            </div>

            {/* Trending assets */}
            <div className="lg:col-span-1">
              <MarketTicker trending={trending} />
            </div>
          </div>
        </div>
      </section>

      {/* 4. Curated Airdrops Preview */}
      <AirdropSection
        projects={projects}
        loading={projectsLoading}
        error={projectsError}
      />

      {/* 5. Trust / Philosophy */}
      <TrustSection />

      {/* 6. CTA / Bottom */}
      <CTASection onExploreAirdrops={(e) => handleExploreAirdrops(e as any)} />
    </Shell>
  );
}
