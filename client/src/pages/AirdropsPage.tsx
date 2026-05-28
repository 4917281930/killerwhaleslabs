import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  AlertCircle, ArrowLeft, ChevronRight, Clock3, ExternalLink, 
  Radar, Search, Signal, Trash2, SlidersHorizontal, ArrowUpDown,
  BookOpen, Globe, MessageSquare, Send, Zap, ShieldAlert, Award,
  CheckCircle2, RefreshCw
} from 'lucide-react';
import { Header } from '../components/layout/Header.tsx';
import { LoadingSpinner } from '../components/ui/LoadingSpinner.tsx';
import { ProjectLogo } from '../components/home/ProjectLogo.tsx';
import { deleteProject, getProjects, getProjectBySlug } from '../lib/api.ts';
import { readCachedProjects, writeCachedProjects } from '../lib/projectCache.ts';
import { formatDate } from '../lib/format.ts';
import { Project } from '../lib/types.ts';

function useDelayedLoading(loading: boolean): boolean {
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

function statusTone(status: string): string {
  if (status === 'watching') return 'border-yellow-400/20 bg-yellow-400/10 text-yellow-200';
  if (status === 'paused') return 'border-zinc-400/15 bg-zinc-400/10 text-zinc-300';
  return 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300';
}

function difficultyColor(diff: string): string {
  if (diff === 'hard') return 'text-red-400 bg-red-400/5 border-red-500/20';
  if (diff === 'medium') return 'text-yellow-400 bg-yellow-400/5 border-yellow-500/20';
  return 'text-emerald-400 bg-emerald-400/5 border-emerald-500/20';
}

function riskColor(risk: string): string {
  if (risk === 'high') return 'text-red-400 bg-red-400/5 border-red-500/20';
  if (risk === 'medium') return 'text-yellow-400 bg-yellow-400/5 border-yellow-500/20';
  return 'text-emerald-400 bg-emerald-400/5 border-emerald-500/20';
}

export function AirdropsPage({ isAdmin = false }: { isAdmin?: boolean }) {
  const { slug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();

  const cachedProjects = useMemo(readCachedProjects, []);
  const [projects, setProjects] = useState<Project[]>(cachedProjects);
  const [loading, setLoading] = useState(cachedProjects.length === 0);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  // Detail Project States
  const [detailProject, setDetailProject] = useState<Project | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEcosystem, setSelectedEcosystem] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedRisk, setSelectedRisk] = useState('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [sortBy, setSortBy] = useState<'priority' | 'updatedAt' | 'name' | 'status'>('priority');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const showSpinner = useDelayedLoading(loading);

  const loadProjects = useCallback(async () => {
    setLoading(projects.length === 0);
    try {
      const data = await getProjects();
      writeCachedProjects(data);
      setProjects(data);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Unable to load projects');
    } finally {
      setLoading(false);
    }
  }, [projects.length]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects, retryCount]);

  // Dynamic Document Title for SEO
  useEffect(() => {
    if (!slug) {
      document.title = 'Airdrop Strategy Tracker & Tasks - killerwhaleslabs';
    }
  }, [slug]);

  useEffect(() => {
    if (detailProject) {
      document.title = `${detailProject.name} Airdrop Checkpoints & Tasks - killerwhaleslabs`;
    }
  }, [detailProject, slug]);

  // Fetch project details if slug is active
  useEffect(() => {
    if (!slug) {
      setDetailProject(null);
      return;
    }

    // Try to find in loaded list first
    const matched = projects.find((p) => p.slug === slug);
    if (matched) {
      setDetailProject(matched);
      return;
    }

    // If not found or list empty, fetch direct
    async function fetchDetail() {
      setDetailLoading(true);
      try {
        const project = await getProjectBySlug(slug!);
        setDetailProject(project);
      } catch (err) {
        setDetailProject(null);
      } finally {
        setDetailLoading(false);
      }
    }
    fetchDetail();
  }, [slug, projects]);

  // Extract unique filter fields from list
  const uniqueEcosystems = useMemo(() => {
    const ecosystems = new Set<string>();
    projects.forEach((p) => p.ecosystem && ecosystems.add(p.ecosystem));
    return ['All', ...Array.from(ecosystems)];
  }, [projects]);

  const uniqueCategories = useMemo(() => {
    const categories = new Set<string>();
    projects.forEach((p) => p.category && categories.add(p.category));
    return ['All', ...Array.from(categories)];
  }, [projects]);

  // Handle delete operation
  const handleDeleteProject = async (project: Project) => {
    if (!isAdmin) return;
    if (!window.confirm(`Delete ${project.name} from the public airdrop feed?`)) return;

    try {
      await deleteProject(project.id);
      if (slug) navigate('/airdrops');
      await loadProjects();
    } catch (err: any) {
      setError(err.message || 'Unable to delete project');
    }
  };

  // Search & Filter computation
  const processedProjects = useMemo(() => {
    let result = [...projects];

    // Search
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      result = result.filter((p) => 
        p.name.toLowerCase().includes(q) ||
        p.bio.toLowerCase().includes(q) ||
        (p.shortDescription && p.shortDescription.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q)) ||
        (p.ecosystem && p.ecosystem.toLowerCase().includes(q)) ||
        (p.chain && p.chain.toLowerCase().includes(q)) ||
        (p.status && p.status.toLowerCase().includes(q))
      );
    }

    // Filters
    if (selectedEcosystem !== 'All') {
      result = result.filter((p) => p.ecosystem === selectedEcosystem);
    }
    if (selectedCategory !== 'All') {
      result = result.filter((p) => p.category === selectedCategory);
    }
    if (selectedStatus !== 'All') {
      result = result.filter((p) => p.status === selectedStatus);
    }
    if (selectedRisk !== 'All') {
      result = result.filter((p) => p.riskLevel === selectedRisk);
    }
    if (selectedDifficulty !== 'All') {
      result = result.filter((p) => p.difficulty === selectedDifficulty);
    }

    // Sorting
    result.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'priority') {
        comparison = (a.priority || 0) - (b.priority || 0);
      } else if (sortBy === 'updatedAt') {
        const timeA = new Date(a.updatedAt || a.createdAt).getTime();
        const timeB = new Date(b.updatedAt || b.createdAt).getTime();
        comparison = timeA - timeB;
      } else if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === 'status') {
        comparison = (a.status || '').localeCompare(b.status || '');
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return result;
  }, [projects, searchQuery, selectedEcosystem, selectedCategory, selectedStatus, selectedRisk, selectedDifficulty, sortBy, sortOrder]);

  return (
    <div className="flex min-h-screen flex-col bg-ink text-white">
      <Header />
      <section className="flex-1 bg-ink px-4 py-8 sm:py-12 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {slug ? (
            /* Detail View */
            detailLoading ? (
              <div className="grid min-h-[350px] place-items-center rounded-lg border border-white/[0.08] bg-white/[0.02]">
                <LoadingSpinner size="lg" />
              </div>
            ) : detailProject ? (
              <ProjectDetailView project={detailProject} isAdmin={isAdmin} onDelete={handleDeleteProject} />
            ) : (
              <ProjectNotFound />
            )
          ) : (
            /* List View */
            <>
              {/* Heading */}
              <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
                <div>
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-bitcoin font-mono animate-pulse">
                    <Radar size={14} />
                    Curated campaigns
                  </p>
                  <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-5xl font-sans">
                    Crypto Airdrop Tracker
                  </h1>
                </div>
                <p className="max-w-md text-sm leading-relaxed text-zinc-400 font-sans">
                  Monitor active networks, bridge campaigns, and testnet contribution checklists. Sorted by priority.
                </p>
              </div>

              {/* Search & Filter Toolbar */}
              <div className="mb-6 space-y-4 rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 font-mono text-xs">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                  {/* Search input */}
                  <div className="relative md:col-span-2">
                    <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search name, bio, ecosystem, chain..."
                      className="w-full rounded border border-white/[0.08] bg-black/30 py-2.5 pl-9 pr-4 text-xs text-white outline-none transition placeholder:text-zinc-600 focus:border-bitcoin/50"
                    />
                  </div>

                  {/* Ecosystem filter */}
                  <div>
                    <select
                      value={selectedEcosystem}
                      onChange={(e) => setSelectedEcosystem(e.target.value)}
                      className="w-full rounded border border-white/[0.08] bg-black/30 px-3 py-2.5 text-white outline-none focus:border-bitcoin/50"
                    >
                      <option value="All">Ecosystem: All</option>
                      {uniqueEcosystems.filter(e => e !== 'All').map((eco) => (
                        <option key={eco} value={eco}>{eco}</option>
                      ))}
                    </select>
                  </div>

                  {/* Category filter */}
                  <div>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full rounded border border-white/[0.08] bg-black/30 px-3 py-2.5 text-white outline-none focus:border-bitcoin/50"
                    >
                      <option value="All">Category: All</option>
                      {uniqueCategories.filter(c => c !== 'All').map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Additional Filters & Sorting */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.05] pt-3">
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Status filter */}
                    <div className="flex items-center gap-1">
                      <span className="text-zinc-500">Status:</span>
                      <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                        className="rounded border border-white/[0.06] bg-black/20 px-2 py-1 text-zinc-300 outline-none"
                      >
                        <option value="All">All</option>
                        <option value="active">Active</option>
                        <option value="watching">Watching</option>
                        <option value="paused">Paused</option>
                      </select>
                    </div>

                    {/* Difficulty filter */}
                    <div className="flex items-center gap-1">
                      <span className="text-zinc-500">Difficulty:</span>
                      <select
                        value={selectedDifficulty}
                        onChange={(e) => setSelectedDifficulty(e.target.value)}
                        className="rounded border border-white/[0.06] bg-black/20 px-2 py-1 text-zinc-300 outline-none"
                      >
                        <option value="All">All</option>
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>

                    {/* Risk filter */}
                    <div className="flex items-center gap-1">
                      <span className="text-zinc-500">Risk:</span>
                      <select
                        value={selectedRisk}
                        onChange={(e) => setSelectedRisk(e.target.value)}
                        className="rounded border border-white/[0.06] bg-black/20 px-2 py-1 text-zinc-300 outline-none"
                      >
                        <option value="All">All</option>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                  </div>

                  {/* Sorting settings */}
                  <div className="flex items-center gap-2">
                    <ArrowUpDown size={12} className="text-zinc-500" />
                    <span className="text-zinc-500">Sort:</span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="rounded border border-white/[0.06] bg-black/20 px-2 py-1 text-zinc-300 outline-none"
                    >
                      <option value="priority">Priority</option>
                      <option value="updatedAt">Updated</option>
                      <option value="name">Name</option>
                      <option value="status">Status</option>
                    </select>
                    <button
                      onClick={() => setSortOrder(current => current === 'asc' ? 'desc' : 'asc')}
                      className="rounded border border-white/[0.06] bg-black/20 p-1 text-zinc-300 hover:border-bitcoin/30"
                      title={sortOrder === 'asc' ? 'Sort Ascending' : 'Sort Descending'}
                    >
                      <span className="uppercase text-[9px] font-semibold">{sortOrder}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Main List Area */}
              {loading ? (
                <div className="grid min-h-[300px] place-items-center rounded-lg border border-white/[0.08] bg-white/[0.02]">
                  {showSpinner ? <LoadingSpinner size="lg" /> : null}
                </div>
              ) : error ? (
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-5 text-zinc-200">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="text-red-400" size={20} />
                    <p className="font-semibold font-mono">Airdrop feed is temporarily offline.</p>
                  </div>
                  <p className="mt-2 text-sm text-zinc-500">{error}</p>
                  <button
                    onClick={() => setRetryCount(c => c + 1)}
                    className="mt-4 inline-flex items-center gap-2 rounded border border-white/10 px-4 py-2 text-xs font-mono text-zinc-300 hover:border-bitcoin/40 hover:text-bitcoin"
                  >
                    <RefreshCw size={12} /> Retry Connection
                  </button>
                </div>
              ) : projects.length === 0 ? (
                <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-12 text-center text-zinc-500 font-mono text-sm">
                  No campaigns registered yet.
                </div>
              ) : processedProjects.length === 0 ? (
                <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-12 text-center text-zinc-500 font-mono text-sm">
                  <p className="font-semibold text-white">No campaigns matched your search filter.</p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedEcosystem('All');
                      setSelectedCategory('All');
                      setSelectedStatus('All');
                      setSelectedRisk('All');
                      setSelectedDifficulty('All');
                    }}
                    className="mt-4 rounded border border-white/10 px-3 py-1.5 text-xs text-zinc-300 hover:border-bitcoin/30"
                  >
                    Clear all filters
                  </button>
                </div>
              ) : (
                /* Projects Card Grid (Mobile & Desktop) */
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {processedProjects.map((project, index) => (
                    <article key={project.id} className="relative group">
                      <Link to={`/airdrops/${project.slug}`} className="block h-full">
                        <div className="flex h-full flex-col justify-between rounded-lg border border-white/[0.06] bg-black/20 p-5 hover:border-bitcoin/40 hover:bg-white/[0.01] hover:-translate-y-0.5 transition-all duration-300">
                          <div>
                            <div className="flex items-center justify-between gap-3">
                              <ProjectLogo project={project} size="md" />
                              <span className="rounded border border-white/[0.07] bg-white/[0.02] px-2 py-0.5 text-[9px] font-medium tracking-[0.1em] text-zinc-400 font-mono">
                                {project.category || 'Airdrop'}
                              </span>
                            </div>

                            <div className="mt-4">
                              <h3 className="text-base font-semibold text-white group-hover:text-bitcoin transition-colors">
                                {project.name}
                              </h3>
                              <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-zinc-400">
                                {project.bio}
                              </p>
                            </div>

                            {/* Upgraded metadata badges */}
                            <div className="mt-4 flex flex-wrap gap-1">
                              {project.ecosystem && (
                                <span className="inline-flex rounded border border-white/[0.04] bg-white/[0.01] px-1.5 py-0.5 text-[8px] font-mono text-zinc-500">
                                  {project.ecosystem}
                                </span>
                              )}
                              {project.chain && (
                                <span className="inline-flex rounded border border-white/[0.04] bg-white/[0.01] px-1.5 py-0.5 text-[8px] font-mono text-zinc-500">
                                  {project.chain}
                                </span>
                              )}
                              {project.difficulty && (
                                <span className={`inline-flex rounded border px-1.5 py-0.5 text-[8px] font-mono capitalize ${difficultyColor(project.difficulty)}`}>
                                  {project.difficulty}
                                </span>
                              )}
                              {project.riskLevel && (
                                <span className={`inline-flex rounded border px-1.5 py-0.5 text-[8px] font-mono capitalize ${riskColor(project.riskLevel)}`}>
                                  {project.riskLevel} risk
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="mt-5 flex items-center justify-between border-t border-white/[0.05] pt-3 text-[9px] font-mono uppercase tracking-[0.1em]">
                            <span className={project.status === 'active' ? 'text-emerald-400' : project.status === 'watching' ? 'text-yellow-400' : 'text-zinc-500'}>
                              {project.status || 'active'}
                            </span>
                            <span className="text-zinc-600">
                              Priority: {project.priority || 0}
                            </span>
                          </div>
                        </div>
                      </Link>

                      {isAdmin && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDeleteProject(project);
                          }}
                          className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full border border-white/5 bg-black/40 text-zinc-500 transition hover:border-red-400/40 hover:text-red-300"
                          aria-label={`Delete ${project.name}`}
                          title="Delete project"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.07] bg-ink px-4 py-8 text-xs text-zinc-500 sm:px-6 lg:px-8 font-mono">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <span className="font-semibold text-zinc-300 tracking-wider">killerwhaleslabs</span>
            <span>© {new Date().getFullYear()} killerwhaleslabs. All rights reserved.</span>
          </div>
          <div>
            <span>curated crypto opportunity intelligence.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* Detail View Component */
function ProjectDetailView({ project, isAdmin, onDelete }: { project: Project; isAdmin: boolean; onDelete: (p: Project) => void }) {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-4xl font-sans">
      {/* Back button */}
      <div className="mb-6 flex items-center justify-between gap-3">
        <button
          onClick={() => navigate('/airdrops')}
          className="inline-flex items-center gap-2 rounded border border-white/10 bg-black/10 px-3.5 py-2 text-xs font-mono text-zinc-300 transition hover:border-bitcoin/40 hover:text-bitcoin"
          type="button"
        >
          <ArrowLeft size={13} />
          Back to feed
        </button>

        {isAdmin && (
          <div className="flex items-center gap-2">
            <Link
              to="/lab-console"
              className="inline-flex items-center gap-2 rounded border border-white/10 px-3 py-2 text-xs text-zinc-300 transition hover:border-bitcoin/40 hover:text-bitcoin"
            >
              Console Edit
            </Link>
            <button
              type="button"
              onClick={() => onDelete(project)}
              className="grid h-8 w-8 place-items-center rounded-full border border-white/10 text-zinc-500 hover:border-red-400/40 hover:text-red-300"
              aria-label={`Delete ${project.name}`}
              title="Delete project"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Main card box */}
      <section className="overflow-hidden rounded-lg border border-white/[0.08] bg-[linear-gradient(145deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))] p-6 shadow-xl backdrop-blur sm:p-8">
        
        {/* Intro */}
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <ProjectLogo project={project} size="lg" priority />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded border border-white/[0.07] bg-white/[0.02] px-2 py-0.5 text-[9px] font-medium tracking-[0.14em] text-zinc-400 font-mono uppercase">
                  {project.category || 'Airdrop'}
                </span>
                <span className={`rounded border px-2 py-0.5 text-[9px] font-medium tracking-[0.12em] font-mono uppercase ${statusTone(project.status)}`}>
                  {project.status || 'active'}
                </span>
              </div>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                {project.name}
              </h1>
              <p className="mt-1 flex items-center gap-1.5 text-[10px] font-mono text-zinc-500">
                <Clock3 size={11} /> Updated {formatDate(project.updatedAt || project.createdAt)}
              </p>
            </div>
          </div>

          {/* Featured Badge */}
          {project.featured && (
            <span className="self-start rounded border border-bitcoin/30 bg-bitcoin/5 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-bitcoin font-mono">
              ★ Featured
            </span>
          )}
        </div>

        {/* Short description / Bio */}
        <div className="mt-6 border-t border-white/[0.05] pt-6">
          <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 font-mono">Mission Bio</h3>
          <p className="mt-2 text-sm leading-relaxed text-zinc-300">
            {project.shortDescription || project.bio}
          </p>
        </div>

        {/* Metadata stats matrix */}
        <div className="mt-8 grid gap-3 grid-cols-2 md:grid-cols-4 text-xs font-mono">
          <div className="rounded border border-white/[0.06] bg-black/15 p-3">
            <span className="block text-[8px] uppercase tracking-wider text-zinc-500">Ecosystem</span>
            <span className="mt-1 block font-semibold text-zinc-200">{project.ecosystem || '--'}</span>
          </div>
          <div className="rounded border border-white/[0.06] bg-black/15 p-3">
            <span className="block text-[8px] uppercase tracking-wider text-zinc-500">Chain Network</span>
            <span className="mt-1 block font-semibold text-zinc-200">{project.chain || '--'}</span>
          </div>
          <div className="rounded border border-white/[0.06] bg-black/15 p-3">
            <span className="block text-[8px] uppercase tracking-wider text-zinc-500">Task Protocol</span>
            <span className="mt-1 block font-semibold text-zinc-200">{project.taskType || '--'}</span>
          </div>
          <div className="rounded border border-white/[0.06] bg-black/15 p-3">
            <span className="block text-[8px] uppercase tracking-wider text-zinc-500">Complexity / Risk</span>
            <div className="mt-1 flex items-center gap-1.5 font-semibold">
              <span className={`capitalize ${difficultyColor(project.difficulty || '')}`} title="Difficulty">
                {project.difficulty || 'Easy'}
              </span>
              <span className="text-zinc-600">/</span>
              <span className={`capitalize ${riskColor(project.riskLevel || '')}`} title="Risk level">
                {project.riskLevel || 'Low'} Risk
              </span>
            </div>
          </div>
        </div>

        {/* Action Button & Links */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          {project.websiteUrl && (
            <a
              href={project.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded bg-bitcoin px-5 py-3 text-xs font-bold text-black transition hover:bg-ember uppercase tracking-wider font-mono"
            >
              Go to Website
              <ExternalLink size={13} />
            </a>
          )}

          {/* Social connections bar */}
          <div className="flex flex-wrap gap-2">
            {project.officialXUrl && (
              <a
                href={project.officialXUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center gap-1.5 rounded border border-white/10 px-3 text-xs text-zinc-300 hover:border-white/20 hover:text-white"
                title="Twitter / X"
              >
                <span className="font-mono text-[9px] uppercase tracking-wider font-semibold">Twitter</span>
                <ExternalLink size={10} />
              </a>
            )}
            {project.discordUrl && (
              <a
                href={project.discordUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center gap-1.5 rounded border border-white/10 px-3 text-xs text-zinc-300 hover:border-white/20 hover:text-white"
                title="Discord"
              >
                <MessageSquare size={12} />
                <span className="font-mono text-[9px] uppercase tracking-wider font-semibold">Discord</span>
              </a>
            )}
            {project.telegramUrl && (
              <a
                href={project.telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center gap-1.5 rounded border border-white/10 px-3 text-xs text-zinc-300 hover:border-white/20 hover:text-white"
                title="Telegram"
              >
                <Send size={12} />
                <span className="font-mono text-[9px] uppercase tracking-wider font-semibold">Telegram</span>
              </a>
            )}
            {project.docsUrl && (
              <a
                href={project.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center gap-1.5 rounded border border-white/10 px-3 text-xs text-zinc-300 hover:border-white/20 hover:text-white"
                title="Documentation"
              >
                <BookOpen size={12} />
                <span className="font-mono text-[9px] uppercase tracking-wider font-semibold">Docs</span>
              </a>
            )}
            {project.appUrl && (
              <a
                href={project.appUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center gap-1.5 rounded border border-white/10 px-3 text-xs text-zinc-300 hover:border-white/20 hover:text-white"
                title="Web App"
              >
                <Globe size={12} />
                <span className="font-mono text-[9px] uppercase tracking-wider font-semibold">Launch App</span>
              </a>
            )}
          </div>
        </div>

        {/* Task Checklist & Notes */}
        <div className="mt-8 space-y-6 border-t border-white/[0.05] pt-6">
          
          {/* Action Strategy Guidelines */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 font-mono">Action Strategy Guidelines</h3>
            <div className="mt-3 space-y-3 font-sans text-xs">
              <div className="flex gap-3 rounded border border-white/[0.04] bg-white/[0.005] p-3 text-zinc-400">
                <CheckCircle2 size={16} className="shrink-0 text-bitcoin" />
                <div>
                  <span className="font-semibold text-zinc-200 block mb-0.5">Campaign Verification</span>
                  Always verify official URLs, campaigns, and contracts on the project's official Twitter/X or Discord handles before interacting or connecting any wallet profiles.
                </div>
              </div>
              <div className="flex gap-3 rounded border border-white/[0.04] bg-white/[0.005] p-3 text-zinc-400">
                <CheckCircle2 size={16} className="shrink-0 text-bitcoin" />
                <div>
                  <span className="font-semibold text-zinc-200 block mb-0.5">Wallet Profile Isolation</span>
                  Use dedicated burner or secondary web3 profiles for testnets, dApp interactions, and quests to prevent primary asset exposure.
                </div>
              </div>
            </div>
          </div>

          {/* Project Notes section */}
          {project.notes ? (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 font-mono">Tactical Operations Notes</h3>
              <div className="mt-3 overflow-auto rounded border border-white/[0.06] bg-black/25 p-4 text-sm leading-relaxed text-zinc-300 whitespace-pre-wrap font-sans">
                {project.notes}
              </div>
            </div>
          ) : (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 font-mono">Tactical Operations Notes</h3>
              <p className="mt-2 text-xs italic text-zinc-500 font-mono">No specific operational notes provided for this network campaign.</p>
            </div>
          )}

          {/* Last checked indicator */}
          {project.lastCheckedAt && (
            <div className="flex items-center gap-1.5 text-[9px] font-mono text-zinc-600 justify-end">
              <Clock3 size={10} />
              Last Verified Check: {formatDate(project.lastCheckedAt)}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

/* Fallback Page when Project is not found */
function ProjectNotFound() {
  return (
    <div className="mx-auto max-w-md rounded-lg border border-white/[0.08] bg-white/[0.03] p-8 text-center font-sans">
      <Link
        to="/airdrops"
        className="mb-6 inline-flex items-center gap-2 rounded border border-white/10 px-3 py-2 text-xs font-mono text-zinc-300 transition hover:border-bitcoin/40 hover:text-bitcoin"
      >
        <ArrowLeft size={13} />
        Back to Airdrops
      </Link>
      <p className="text-2xl font-bold text-white mt-4 font-sans">404 - Project not found</p>
      <p className="mt-2 text-sm text-zinc-400 font-sans">
        The requested project doesn't exist, is unpublished, or the link has changed.
      </p>
    </div>
  );
}
