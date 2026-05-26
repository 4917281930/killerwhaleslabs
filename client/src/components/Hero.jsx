import { ArrowDown, BarChart3, Waves } from 'lucide-react';

export function Hero() {
  return (
    <main className="relative isolate overflow-hidden bg-ink text-white">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_16%_18%,rgba(247,147,26,0.18),transparent_24%),radial-gradient(circle_at_80%_26%,rgba(255,255,255,0.055),transparent_26%)]" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-ink to-transparent" />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
        <section className="max-w-4xl">
          <div className="mb-5 inline-flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-3 py-2 text-[11px] font-medium uppercase tracking-[0.22em] text-zinc-300">
            <Waves size={14} className="shrink-0 text-bitcoin" />
            <span>Bitcoin-native intelligence</span>
          </div>
          <h1 className="max-w-4xl text-4xl font-semibold leading-[1.02] tracking-tight text-white sm:text-6xl xl:text-7xl">
            Bitcoin-native signal lab for market intelligence.
          </h1>
          <p className="mt-5 max-w-2xl text-pretty text-base leading-7 text-zinc-300 sm:text-lg">
            killerwhaleslabs tracks live BTC and ETH market structure, sentiment, gas pressure, dominance, and curated early crypto opportunities with a clean anonymous lab workflow.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <a
              href="#market"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-bitcoin px-5 py-3 text-sm font-semibold text-black shadow-glow transition hover:bg-ember"
            >
              <BarChart3 size={16} />
              View live market
            </a>
            <a
              href="/airdrops"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/12 px-5 py-3 text-sm font-semibold text-white transition hover:border-bitcoin/40 hover:bg-white/[0.06]"
            >
              <ArrowDown size={16} />
              Explore airdrops
            </a>
          </div>
          <div id="about" className="mt-7 grid max-w-xl grid-cols-1 gap-2 text-[10px] uppercase tracking-[0.18em] text-zinc-500 min-[420px]:grid-cols-3 sm:text-xs">
            <span className="rounded border border-white/[0.07] bg-white/[0.03] px-3 py-3">Market</span>
            <span className="rounded border border-white/[0.07] bg-white/[0.03] px-3 py-3">Whale signal</span>
            <span className="rounded border border-white/[0.07] bg-white/[0.03] px-3 py-3">Airdrops</span>
          </div>
        </section>
      </div>
    </main>
  );
}
