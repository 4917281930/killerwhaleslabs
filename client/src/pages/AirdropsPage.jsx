import { AlertCircle, ArrowLeft, ChevronRight, Clock3, ExternalLink, Radar, Search, Signal, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Header } from '../components/Header.jsx';
import { LoadingSpinner } from '../components/LoadingSpinner.jsx';
import { getProjects } from '../lib/api.js';
import { formatDate } from '../lib/format.js';

function useDelayedLoading(loading) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!loading) {
      setShow(false);
      return undefined;
    }

    const timer = window.setTimeout(() => setShow(true), 180);
    return () => window.clearTimeout(timer);
  }, [loading]);

  return show;
}

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function projectPath(project) {
  return `/airdrops/${slugify(project.name)}`;
}

function navigateTo(href) {
  window.history.pushState({}, '', href);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function ensureLogoPreconnect(logoUrl) {
  try {
    const origin = new URL(logoUrl, window.location.origin).origin;
    if (origin === window.location.origin || document.querySelector(`link[rel="preconnect"][href="${origin}"]`)) return;

    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = origin;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  } catch {
    // Ignore malformed URLs; validation happens on the server.
  }
}

function preloadProjectLogos(projects) {
  const seen = new Set();
  const logoProjects = projects.filter((project) => {
    if (!project.logoUrl || seen.has(project.logoUrl)) return false;
    seen.add(project.logoUrl);
    return true;
  });

  logoProjects.slice(0, 12).forEach((project, index) => {
    ensureLogoPreconnect(project.logoUrl);

    if (index < 6 && !document.querySelector(`link[rel="preload"][href="${project.logoUrl}"]`)) {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = project.logoUrl;
      link.fetchPriority = 'high';
      document.head.appendChild(link);
    }

    const image = new Image();
    image.decoding = 'async';
    image.fetchPriority = index < 6 ? 'high' : 'low';
    image.src = project.logoUrl;
  });
}

function ProjectLogo({ project, size = 'md', index = 0 }) {
  const [loaded, setLoaded] = useState(false);
  const imageRef = useRef(null);
  const sizeClass = size === 'lg' ? 'h-12 w-12 text-sm sm:h-14 sm:w-14 sm:text-base' : 'h-10 w-10 text-xs sm:h-11 sm:w-11';
  const priority = size === 'lg' || index < 6;

  useEffect(() => {
    const image = imageRef.current;
    setLoaded(Boolean(image?.complete && image.naturalWidth > 0));
  }, [project.logoUrl]);

  if (project.logoUrl) {
    return (
      <span className={`relative block ${sizeClass} shrink-0 overflow-hidden rounded ring-1 ring-white/10`}>
        <span className={`kwl-logo-skeleton absolute inset-0 transition-opacity duration-150 ${loaded ? 'opacity-0' : 'opacity-100'}`} />
        <img
          ref={imageRef}
          src={project.logoUrl}
          alt=""
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-200 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
          onLoad={() => setLoaded(true)}
          onError={() => setLoaded(false)}
        />
      </span>
    );
  }

  return (
    <div className={`grid ${sizeClass} shrink-0 place-items-center rounded border border-bitcoin/25 bg-bitcoin/10 font-mono font-semibold text-bitcoin`}>
      {project.name.slice(0, 2).toUpperCase()}
    </div>
  );
}

function statusTone(status) {
  if (status === 'watching') return 'border-yellow-400/20 bg-yellow-400/10 text-yellow-200';
  if (status === 'paused') return 'border-zinc-400/15 bg-zinc-400/10 text-zinc-300';
  return 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300';
}

function AirdropRow({ project, index }) {
  const href = projectPath(project);

  function openProject(event) {
    event.preventDefault();
    navigateTo(href);
  }

  return (
    <article className="relative border-b border-white/[0.06] px-3 py-3 pr-4 transition hover:bg-white/[0.025] last:border-b-0 sm:grid sm:min-h-[72px] sm:grid-cols-[2rem_2.75rem_minmax(0,1fr)_8.5rem_7rem_10rem] sm:items-center sm:gap-3 sm:px-4">
      <div className="flex min-w-0 items-start gap-3 sm:contents">
        <span className="mt-3 hidden text-xs font-medium text-zinc-600 sm:block">{index + 1}</span>
        <ProjectLogo project={project} index={index} />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start justify-between gap-2 sm:block">
            <div className="min-w-0 pr-20 sm:pr-0">
              <a href={href} onClick={openProject} className="group inline-flex max-w-full items-center gap-1.5 text-base font-semibold text-white transition hover:text-bitcoin sm:text-base">
                <span className="truncate">{project.name}</span>
                <ChevronRight size={15} className="shrink-0 text-zinc-500 transition group-hover:text-bitcoin" />
              </a>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 sm:hidden">
                <span className="inline-flex items-center gap-1 rounded border border-white/[0.07] bg-black/18 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-400">
                  <Signal size={10} className="text-bitcoin" />
                  {project.category || 'Airdrop'}
                </span>
              </div>
            </div>
          </div>
          <p className="mt-2 line-clamp-2 text-sm leading-5 text-zinc-400 sm:mt-1 sm:line-clamp-1">{project.bio}</p>
          <p className="mt-2 text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-600 sm:hidden">Updated {formatDate(project.updatedAt || project.createdAt)}</p>
        </div>
      </div>
      <span className="hidden min-w-0 items-center gap-1.5 truncate rounded border border-white/[0.07] bg-black/18 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-400 sm:inline-flex">
        <Signal size={11} className="shrink-0 text-bitcoin" />
        <span className="truncate">{project.category || 'Airdrop'}</span>
      </span>
      <span className={`absolute right-3 top-3 rounded border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] sm:static sm:inline-flex sm:justify-center sm:px-2.5 sm:py-1 sm:tracking-[0.14em] ${statusTone(project.status)}`}>
        {project.status || 'active'}
      </span>
      <span className="hidden truncate text-right text-xs text-zinc-500 sm:block">{formatDate(project.updatedAt || project.createdAt)}</span>
    </article>
  );
}

function ExternalLinkConfirm({ url, onCancel }) {
  if (!url) return null;

  function openLink() {
    window.open(url, '_blank', 'noopener,noreferrer');
    onCancel();
  }

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/70 px-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-lg border border-white/[0.1] bg-ink p-5 shadow-card">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-bitcoin">External website</p>
        <h2 className="mt-2 text-xl font-semibold text-white">Open project link?</h2>
        <p className="mt-3 text-sm leading-6 text-zinc-400">You are leaving killerwhaleslabs. Check the URL before continuing.</p>
        <code className="mt-4 block max-h-24 overflow-auto rounded border border-white/[0.07] bg-black/24 p-3 text-xs leading-5 text-zinc-300">{url}</code>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button onClick={onCancel} className="rounded border border-white/10 px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-white/[0.06]" type="button">Cancel</button>
          <button onClick={openLink} className="rounded bg-bitcoin px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-ember" type="button">Open link</button>
        </div>
      </div>
    </div>
  );
}

function ProjectGuide({ project }) {
  const [confirmUrl, setConfirmUrl] = useState('');
  const steps = [
    'Read the project summary and confirm the campaign status before taking action.',
    'Track the core task type: quests, testnet usage, bridge activity, research contribution, or node participation.',
    'Use a fresh wallet profile when the campaign requires on-chain activity and keep notes for proof of contribution.',
    'Recheck the official campaign source before connecting wallets or submitting private information.'
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <section className="overflow-hidden rounded-lg border border-white/[0.08] bg-[linear-gradient(145deg,rgba(255,255,255,0.055),rgba(255,255,255,0.026))] p-3 shadow-card backdrop-blur sm:p-5">
        <button onClick={() => navigateTo('/airdrops')} className="mb-4 inline-flex items-center gap-2 rounded border border-white/10 px-3 py-2 text-sm text-zinc-300 transition hover:border-bitcoin/40 hover:text-bitcoin" type="button">
          <ArrowLeft size={15} />
          Back
        </button>
        <div className="relative flex min-w-0 items-start gap-3 pr-20 sm:gap-4 sm:pr-0">
          <ProjectLogo project={project} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap gap-1.5">
              <span className="rounded border border-white/[0.07] bg-black/18 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-400">{project.category || 'Airdrop'}</span>
              <span className={`absolute right-0 top-0 rounded border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] sm:static ${statusTone(project.status)}`}>{project.status || 'active'}</span>
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500"><Clock3 size={11} className="text-zinc-600" /> Updated {formatDate(project.updatedAt || project.createdAt)}</p>
            <h1 className="mt-3 break-words text-2xl font-semibold tracking-tight text-white sm:text-4xl">{project.name}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400 sm:text-base">{project.bio}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:mt-6 sm:grid-cols-2">
          <div className="rounded border border-white/[0.07] bg-black/18 p-3 sm:p-4">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">Focus</p>
            <p className="mt-2 text-sm leading-6 text-zinc-300">{project.category || 'Airdrop'} campaign tracking with a practical contribution checklist.</p>
          </div>
          <div className="rounded border border-white/[0.07] bg-black/18 p-3 sm:p-4">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">Status</p>
            <p className="mt-2 text-sm leading-6 text-zinc-300">Current lab state is <span className="text-white">{project.status || 'active'}</span>. Recheck before spending time or gas.</p>
          </div>
        </div>

        {project.websiteUrl ? (
          <button
            onClick={() => setConfirmUrl(project.websiteUrl)}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded border border-bitcoin/30 bg-bitcoin/10 px-4 py-3 text-sm font-semibold text-bitcoin transition hover:border-bitcoin/60 hover:bg-bitcoin/15 sm:w-auto"
            type="button"
          >
            Open project website
            <ExternalLink size={15} />
          </button>
        ) : null}

        <div className="mt-5 rounded border border-white/[0.07] bg-black/18 p-3 sm:mt-6 sm:p-4">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">How to work this setup</p>
          <div className="mt-4 space-y-3">
            {steps.map((step, index) => (
              <div key={step} className="flex gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-bitcoin/10 font-mono text-xs font-semibold text-bitcoin">{index + 1}</span>
                <p className="text-sm leading-6 text-zinc-300">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <ExternalLinkConfirm url={confirmUrl} onCancel={() => setConfirmUrl('')} />
    </div>
  );
}

export function AirdropsPage() {
  const [projects, setProjects] = useState([]);
  const projectsRef = useRef([]);
  const [query, setQuery] = useState('');
  const [filtering, setFiltering] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const showSpinner = useDelayedLoading(loading);
  const activeSlug = window.location.pathname.startsWith('/airdrops/') ? window.location.pathname.split('/').filter(Boolean)[1] : '';
  const activeProject = useMemo(() => projects.find((project) => slugify(project.name) === activeSlug), [projects, activeSlug]);
  const filteredProjects = useMemo(() => {
    const source = projectsRef.current;
    const normalized = query.trim().toLowerCase();
    if (!normalized) return source;
    return source.filter((project) => project.name.toLowerCase().includes(normalized));
  }, [projects, query]);
  const visibleProjects = filteredProjects.length > 100 ? filteredProjects.slice(0, 100) : filteredProjects;

  useEffect(() => {
    let active = true;

    getProjects()
      .then((data) => {
        if (active) {
          preloadProjectLogos(data);
          projectsRef.current = data;
          setProjects(data);
        }
      })
      .catch((err) => {
        if (active) setError(err.message || 'Unable to load projects');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-ink">
      <Header />
      <section id="airdrops" className="flex-1 bg-ink px-3 py-8 text-white sm:px-6 sm:py-12 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {loading ? (
            <div className="grid min-h-48 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.035]">
              {showSpinner ? <LoadingSpinner size="lg" /> : null}
            </div>
          ) : error ? (
            <div className="rounded-lg border border-bitcoin/20 bg-bitcoin/10 p-5 text-zinc-200">
              <div className="flex items-center gap-3">
                <AlertCircle className="text-bitcoin" size={20} />
                <p className="font-medium">Airdrop feed is temporarily unavailable.</p>
              </div>
              <p className="mt-2 text-sm text-zinc-400">{error}</p>
            </div>
          ) : activeSlug ? (
            activeProject ? <ProjectGuide project={activeProject} /> : <MissingProject />
          ) : (
            <>
              <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-end">
                <div>
                  <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.22em] text-bitcoin">
                    <Radar size={14} />
                    Curated airdrops
                  </p>
                  <h1 className="mt-3 max-w-2xl text-2xl font-semibold tracking-tight text-white sm:text-4xl">
                    Early networks, filtered for signal.
                  </h1>
                </div>
                <p className="max-w-md text-sm leading-6 text-zinc-400">
                  Open a project to view the current guide. New and edited projects are sorted to the top.
                </p>
              </div>


              <div className="mb-4">
                <label className="relative block">
                  <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    value={query}
                    onChange={(event) => {
                      setFiltering(true);
                      setQuery(event.target.value);
                      window.setTimeout(() => setFiltering(false), 120);
                    }}
                    placeholder="Search projects..."
                    className="w-full rounded border border-white/[0.09] bg-black/20 py-3 pl-10 pr-10 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-bitcoin/60 focus:ring-2 focus:ring-bitcoin/15"
                  />
                  {query ? (
                    <button
                      type="button"
                      onClick={() => setQuery('')}
                      className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-zinc-500 transition hover:bg-white/[0.06] hover:text-white"
                      aria-label="Clear search"
                    >
                      <X size={15} />
                    </button>
                  ) : null}
                </label>
              </div>

              {projects.length === 0 ? (
                <div className="rounded-lg border border-white/[0.08] bg-white/[0.04] p-8 text-center text-zinc-400">
                  No airdrops listed yet.
                </div>
              ) : filteredProjects.length === 0 ? (
                <div className="rounded-lg border border-white/[0.08] bg-white/[0.04] p-8 text-center text-zinc-400">
                  <p className="font-medium text-white">No results</p>
                  <p className="mt-2 text-sm">No airdrop projects match your search.</p>
                </div>
              ) : (
                <div className={`overflow-hidden rounded-lg border border-white/[0.08] bg-[linear-gradient(145deg,rgba(255,255,255,0.055),rgba(255,255,255,0.026))] shadow-card backdrop-blur transition-opacity duration-150 ${filtering ? 'opacity-70' : 'opacity-100'}`}> 
                  <div className="hidden grid-cols-[2rem_2.75rem_minmax(0,1fr)_8.5rem_7rem_10rem] gap-3 border-b border-white/[0.06] px-4 py-2 text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-500 sm:grid">
                    <span>#</span>
                    <span></span>
                    <span>Project</span>
                    <span>Category</span>
                    <span>Status</span>
                    <span className="text-right">Updated</span>
                  </div>
                  {visibleProjects.map((project, index) => (
                    <AirdropRow key={project.id} project={project} index={index} />
                  ))}
                  {filteredProjects.length > visibleProjects.length ? (
                    <div className="border-t border-white/[0.06] px-4 py-3 text-center text-xs text-zinc-500">Showing first {visibleProjects.length} of {filteredProjects.length} matches</div>
                  ) : null}
                </div>
              )}
            </>
          )}
        </div>
      </section>
      <footer className="border-t border-white/[0.07] bg-ink px-4 py-8 text-sm text-zinc-500 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span>killerwhaleslabs</span>
          <span>curated crypto opportunity intelligence.</span>
        </div>
      </footer>
    </div>
  );
}

function MissingProject() {
  return (
    <div className="rounded-lg border border-white/[0.08] bg-white/[0.04] p-6 text-zinc-300">
      <button onClick={() => navigateTo('/airdrops')} className="mb-4 inline-flex items-center gap-2 rounded border border-white/10 px-3 py-2 text-sm text-zinc-300 transition hover:border-bitcoin/40 hover:text-bitcoin" type="button">
        <ArrowLeft size={15} />
        Back
      </button>
      <p className="text-xs font-medium uppercase tracking-[0.24em] text-bitcoin">404</p>
      <p className="mt-3 font-medium text-white">Project not found.</p>
      <p className="mt-2 text-sm text-zinc-400">The discussion link may be outdated or the project name changed.</p>
    </div>
  );
}
