import { AlertCircle, Radar } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getProjects } from '../lib/api.js';
import { ProjectCard } from './ProjectCard.jsx';

export function AirdropSection() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    getProjects()
      .then((data) => {
        if (active) setProjects(data);
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
    <section id="airdrops" className="bg-ink px-4 py-14 text-white sm:px-6 sm:py-16 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.24em] text-bitcoin">
              <Radar size={14} />
              Curated airdrops
            </p>
            <h2 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-5xl">
              Curated early networks, filtered for signal.
            </h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-zinc-400">
            Lean discovery list for quests, labs, and protocol campaigns with clean signal.
          </p>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-56 animate-pulse rounded-lg border border-white/[0.08] bg-white/[0.04]" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-lg border border-bitcoin/20 bg-bitcoin/10 p-6 text-zinc-200">
            <div className="flex items-center gap-3">
              <AlertCircle className="text-bitcoin" size={20} />
              <p className="font-medium">Airdrop feed is temporarily unavailable.</p>
            </div>
            <p className="mt-2 text-sm text-zinc-400">{error}</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-lg border border-white/[0.08] bg-white/[0.04] p-8 text-center text-zinc-400">
            No airdrops listed yet.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
