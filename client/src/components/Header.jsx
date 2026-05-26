import { ShieldCheck } from 'lucide-react';

function navigate(event, href) {
  event.preventDefault();
  window.history.pushState({}, '', href);
  window.dispatchEvent(new PopStateEvent('popstate'));

  const hash = href.includes('#') ? href.slice(href.indexOf('#') + 1) : '';
  if (hash) {
    window.setTimeout(() => document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 230);
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-ink/86 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:h-16 sm:px-6 lg:px-8">
        <a
          href="/"
          onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/'); window.dispatchEvent(new PopStateEvent('popstate')); }}
          className="flex min-w-0 items-center gap-3 text-sm font-semibold tracking-[0.2em] text-white"
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-bitcoin/35 bg-bitcoin/10 text-bitcoin">
            <ShieldCheck size={16} strokeWidth={1.8} />
          </span>
          <span className="truncate">killerwhaleslabs</span>
        </a>
        <nav className="flex items-center gap-1 text-sm text-zinc-300 sm:gap-2">
          <a href="/#market" onClick={(event) => navigate(event, '/#market')} className="rounded-full px-2.5 py-2 transition hover:bg-white/[0.06] hover:text-white sm:px-3">
            Market
          </a>
          <a href="/airdrops" onClick={(event) => navigate(event, '/airdrops')} className="rounded-full px-2.5 py-2 transition hover:bg-white/[0.06] hover:text-white sm:px-3">
            Airdrops
          </a>
          <a href="/#about" onClick={(event) => navigate(event, '/#about')} className="hidden rounded-full px-3 py-2 transition hover:bg-white/[0.06] hover:text-white sm:inline-flex">
            About
          </a>
        </nav>
      </div>
    </header>
  );
}
