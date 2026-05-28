import React, { useState, useEffect } from 'react';
import { ShieldCheck, Menu, X } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileMenuOpen]);

  const handleLinkClick = (event: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    event.preventDefault();
    setMobileMenuOpen(false);

    const hasHash = href.includes('#');
    const path = hasHash ? href.slice(0, href.indexOf('#')) : href;
    const hash = hasHash ? href.slice(href.indexOf('#') + 1) : '';

    const currentNormalized = location.pathname === '/' ? '' : location.pathname;
    const pathNormalized = path === '/' ? '' : path;

    if (currentNormalized === pathNormalized) {
      if (hash) {
        const el = document.getElementById(hash);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else {
      navigate(href);
      if (hash) {
        // Wait for page transition to finish before scrolling
        window.setTimeout(() => {
          const el = document.getElementById(hash);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 150);
      }
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-ink/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:h-16 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link
          to="/"
          onClick={(e) => handleLinkClick(e, '/')}
          className="flex min-w-0 items-center gap-3 text-sm font-semibold tracking-[0.2em] text-white animate-fade-in"
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-bitcoin/35 bg-bitcoin/10 text-bitcoin">
            <ShieldCheck size={16} strokeWidth={1.8} />
          </span>
          <span className="truncate font-mono">killerwhaleslabs</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1 text-sm text-zinc-300 sm:flex sm:gap-2">
          <a
            href="/#market-dashboard"
            onClick={(event) => handleLinkClick(event, '/#market-dashboard')}
            className={`rounded-full px-3 py-1.5 transition hover:bg-white/[0.06] hover:text-white ${location.hash === '#market-dashboard' ? 'text-white bg-white/[0.04]' : ''}`}
          >
            Market
          </a>
          <Link
            to="/airdrops"
            className={`rounded-full px-3 py-1.5 transition hover:bg-white/[0.06] hover:text-white ${location.pathname.startsWith('/airdrops') ? 'text-white bg-white/[0.04]' : ''}`}
          >
            Airdrops
          </Link>
          <a
            href="/#about"
            onClick={(event) => handleLinkClick(event, '/#about')}
            className={`rounded-full px-3 py-1.5 transition hover:bg-white/[0.06] hover:text-white ${location.hash === '#about' ? 'text-white bg-white/[0.04]' : ''}`}
          >
            About
          </a>
        </nav>

        {/* Mobile Menu Button */}
        <div className="flex sm:hidden">
          <button
            type="button"
            onClick={toggleMobileMenu}
            className="inline-flex items-center justify-center rounded-md p-2 text-zinc-400 hover:bg-white/[0.06] hover:text-white focus:outline-none"
            aria-controls="mobile-menu"
            aria-expanded={mobileMenuOpen}
          >
            <span className="sr-only">Open main menu</span>
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-b border-white/[0.06] bg-ink/95 backdrop-blur-xl animate-fade-in" id="mobile-menu">
          <div className="space-y-1 px-2 pb-4 pt-2">
            <a
              href="/#market-dashboard"
              onClick={(event) => handleLinkClick(event, '/#market-dashboard')}
              className="block rounded-md px-3 py-2 text-base font-medium text-zinc-300 hover:bg-white/[0.06] hover:text-white"
            >
              Market
            </a>
            <Link
              to="/airdrops"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-md px-3 py-2 text-base font-medium text-zinc-300 hover:bg-white/[0.06] hover:text-white"
            >
              Airdrops
            </Link>
            <a
              href="/#about"
              onClick={(event) => handleLinkClick(event, '/#about')}
              className="block rounded-md px-3 py-2 text-base font-medium text-zinc-300 hover:bg-white/[0.06] hover:text-white"
            >
              About
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
