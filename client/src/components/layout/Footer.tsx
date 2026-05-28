import React from 'react';

export function Footer() {
  return (
    <footer className="border-t border-white/[0.07] bg-ink px-4 py-12 text-sm text-zinc-500 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <span className="font-semibold text-zinc-300 font-mono tracking-wider">killerwhaleslabs</span>
          <span className="text-xs text-zinc-600">© {new Date().getFullYear()} killerwhaleslabs. All rights reserved.</span>
        </div>
        <div className="text-zinc-500 text-xs sm:text-sm">
          <span>anonymous Bitcoin-native intelligence layer.</span>
        </div>
      </div>
    </footer>
  );
}
