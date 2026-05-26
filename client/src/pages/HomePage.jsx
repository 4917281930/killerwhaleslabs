import { Header } from '../components/Header.jsx';
import { Hero } from '../components/Hero.jsx';
import { HomeMarketDashboard } from '../components/HomeMarketDashboard.jsx';

export function HomePage() {
  return (
    <div className="min-h-screen bg-ink">
      <Header />
      <Hero />
      <HomeMarketDashboard />
      <footer className="border-t border-white/[0.07] bg-ink px-4 py-8 text-sm text-zinc-500 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span>killerwhaleslabs</span>
          <span>anonymous Bitcoin-native intelligence layer.</span>
        </div>
      </footer>
    </div>
  );
}
