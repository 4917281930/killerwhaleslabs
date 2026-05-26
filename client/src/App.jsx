import { useEffect, useRef, useState } from 'react';
import { LoadingSpinner } from './components/LoadingSpinner.jsx';
import { AdminPage } from './pages/AdminPage.jsx';
import { AirdropsPage } from './pages/AirdropsPage.jsx';
import { HomePage } from './pages/HomePage.jsx';

const MIN_TRANSITION_MS = 260;
const PAGE_SWAP_DELAY_MS = 40;

function NotFoundPage() {
  return (
    <div className="grid min-h-screen place-items-center bg-ink px-4 text-center text-white">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.24em] text-bitcoin">404</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">Page not found</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">The link is invalid or no longer exists.</p>
        <button
          type="button"
          onClick={() => { window.history.pushState({}, '', '/'); window.dispatchEvent(new PopStateEvent('popstate')); }}
          className="mt-6 rounded bg-bitcoin px-5 py-3 text-sm font-semibold text-black transition hover:bg-ember"
        >
          Back home
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [path, setPath] = useState(() => window.location.pathname);
  const [transitioning, setTransitioning] = useState(true);
  const transitionStartedAt = useRef(Date.now());
  const timers = useRef([]);

  useEffect(() => {
    document.getElementById('boot-loader')?.remove();
    function clearTimers() {
      timers.current.forEach((timer) => window.clearTimeout(timer));
      timers.current = [];
    }

    function finishTransition() {
      const elapsed = Date.now() - transitionStartedAt.current;
      const timer = window.setTimeout(() => setTransitioning(false), Math.max(0, MIN_TRANSITION_MS - elapsed));
      timers.current.push(timer);
    }

    function startTransition(nextPath = window.location.pathname) {
      clearTimers();
      transitionStartedAt.current = Date.now();
      setTransitioning(true);

      const swapTimer = window.setTimeout(() => {
        setPath(nextPath);
        finishTransition();
      }, PAGE_SWAP_DELAY_MS);
      timers.current.push(swapTimer);
    }

    function handlePopState() {
      startTransition();
    }

    finishTransition();
    window.addEventListener('popstate', handlePopState);

    return () => {
      clearTimers();
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const isAdmin = path.startsWith('/lab-console') || path.startsWith('/admin/login') || path.startsWith('/admin');
  const isAirdrops = path === '/airdrops' || path.startsWith('/airdrops/');
  const isHome = path === '/' || path.startsWith('/#');
  const page = isAdmin ? <AdminPage /> : isAirdrops ? <AirdropsPage /> : isHome ? <HomePage /> : <NotFoundPage />;

  return (
    <div className="min-h-screen bg-ink text-white">
      <div className={`transition-opacity duration-150 ${transitioning ? 'opacity-75' : 'opacity-100'}`}>{page}</div>
      <div
        className={`fixed inset-0 z-50 grid place-items-center bg-ink/88 backdrop-blur-[2px] transition-opacity duration-150 ${transitioning ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        aria-hidden={!transitioning}
      >
        <LoadingSpinner size="lg" />
      </div>
    </div>
  );
}
