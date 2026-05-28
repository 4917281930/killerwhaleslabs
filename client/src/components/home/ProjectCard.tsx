import React from 'react';
import { Signal, Calendar, Layers, ShieldAlert, Award } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Project } from '../../lib/types.ts';
import { ProjectLogo } from './ProjectLogo.tsx';
import { Card } from '../ui/Card.tsx';
import { Badge } from '../ui/Badge.tsx';

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const cardUrl = `/airdrops/${project.slug}`;

  return (
    <Link to={cardUrl} className="block group">
      <Card className="flex min-h-[260px] flex-col justify-between p-5 border border-white/[0.06] bg-[linear-gradient(145deg,rgba(255,255,255,0.03),rgba(255,255,255,0.005))] hover:-translate-y-1 hover:border-bitcoin/40 hover:shadow-lg hover:shadow-bitcoin/5 transition-all duration-300 cursor-pointer">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between gap-3">
            <ProjectLogo project={project} size="md" />
            <Badge variant="default" className="flex items-center gap-1 font-mono text-[9px] bg-white/[0.04] border-white/[0.08] text-zinc-300">
              <Signal size={10} className="text-bitcoin" />
              {project.category || 'Airdrop'}
            </Badge>
          </div>

          {/* Title & Bio */}
          <div className="mt-4">
            <h3 className="text-lg font-semibold tracking-tight text-white font-sans group-hover:text-bitcoin transition-colors duration-200 truncate">
              {project.name}
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-zinc-400 font-sans line-clamp-2 min-h-[32px]">
              {project.bio}
            </p>
          </div>

          {/* Metadata Badges */}
          <div className="mt-4 flex flex-wrap gap-1.5">
            {project.ecosystem && (
              <span className="inline-flex items-center gap-1 rounded bg-zinc-800/40 border border-white/[0.04] px-1.5 py-0.5 text-[9px] font-mono text-zinc-400">
                <Layers size={9} className="text-zinc-500" />
                {project.ecosystem}
              </span>
            )}
            {project.difficulty && (
              <span className="inline-flex items-center gap-1 rounded bg-zinc-800/40 border border-white/[0.04] px-1.5 py-0.5 text-[9px] font-mono text-zinc-400 capitalize">
                <Award size={9} className="text-zinc-500" />
                {project.difficulty}
              </span>
            )}
            {project.riskLevel && (
              <span className="inline-flex items-center gap-1 rounded bg-zinc-800/40 border border-white/[0.04] px-1.5 py-0.5 text-[9px] font-mono text-zinc-400 capitalize">
                <ShieldAlert size={9} className="text-zinc-500" />
                {project.riskLevel} risk
              </span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 flex items-center justify-between border-t border-white/[0.04] pt-3 text-[9px] font-mono uppercase tracking-[0.12em] text-zinc-500">
          <span className={project.status === 'active' ? 'text-emerald-400' : project.status === 'watching' ? 'text-yellow-400' : 'text-zinc-500'}>
            {project.status || 'active'}
          </span>
          {project.featured ? (
            <span className="text-bitcoin font-semibold tracking-wider text-[8px] border border-bitcoin/20 bg-bitcoin/5 px-1.5 py-0.5 rounded">
              FEATURED
            </span>
          ) : (
            <span className="h-[1px] w-10 bg-gradient-to-r from-bitcoin/25 to-transparent" />
          )}
        </div>
      </Card>
    </Link>
  );
}
