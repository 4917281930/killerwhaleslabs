import React, { useMemo } from 'react';
import { Radar, AlertCircle, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Project } from '../../lib/types.ts';
import { ProjectCard } from './ProjectCard.tsx';
import { Button } from '../ui/Button.tsx';

interface AirdropSectionProps {
  projects: Project[];
  loading: boolean;
  error: string;
  onExploreClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

export function AirdropSection({ projects, loading, error }: AirdropSectionProps) {
  // Select featured projects, fallback to top priority ones if none marked as featured
  const displayProjects = useMemo(() => {
    const featured = projects.filter((p) => p.featured);
    if (featured.length > 0) {
      return featured.slice(0, 6);
    }
    // Fallback to top 6 by priority or updatedAt
    return projects
      .slice()
      .sort((a, b) => (b.priority || 0) - (a.priority || 0))
      .slice(0, 6);
  }, [projects]);

  return (
    <section id="airdrops" className="bg-ink px-4 py-16 sm:px-6 lg:px-8 border-t border-white/[0.04]">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-bitcoin">
              <Radar size={14} className="text-bitcoin" />
              <span>Curated Campaigns</span>
            </div>
            <h2 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-5xl font-sans">
              Early networks, filtered for signal.
            </h2>
          </div>
          <div className="flex flex-col gap-4 max-w-md">
            <p className="text-sm leading-relaxed text-zinc-400 font-sans">
              Zero-noise, high-fidelity monitoring for crypto airdrops, testnet checkpoints, and node tasks. Sorted by priority.
            </p>
            <Link to="/airdrops" className="self-start">
              <Button variant="outline" className="flex items-center gap-1 text-xs hover:border-bitcoin/50 hover:text-bitcoin transition-all duration-300">
                Explore All Airdrops
                <ChevronRight size={14} />
              </Button>
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-64 animate-pulse rounded-lg border border-white/[0.06] bg-white/[0.015]"
              />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-6 text-zinc-200">
            <div className="flex items-center gap-3">
              <AlertCircle className="text-red-400" size={20} />
              <p className="font-semibold font-mono">Airdrop feeds temporarily offline.</p>
            </div>
            <p className="mt-2 text-sm text-zinc-500">{error}</p>
          </div>
        ) : displayProjects.length === 0 ? (
          <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-8 text-center text-zinc-500 font-mono text-sm">
            No active project campaigns listed yet.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {displayProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
