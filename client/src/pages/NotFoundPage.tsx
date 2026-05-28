import React from 'react';
import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="grid min-h-screen place-items-center bg-ink px-4 text-center text-white">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-bitcoin font-mono animate-pulse">404</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl font-sans">Page not found</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400 font-sans">The link is invalid or no longer exists.</p>
        <Link
          to="/"
          className="mt-6 inline-block rounded-full bg-bitcoin px-6 py-3 text-xs font-semibold text-black transition hover:bg-ember uppercase tracking-wider font-mono shadow-lg hover:shadow-bitcoin/20 hover:scale-[1.02]"
        >
          Back home
        </Link>
      </div>
    </div>
  );
}
