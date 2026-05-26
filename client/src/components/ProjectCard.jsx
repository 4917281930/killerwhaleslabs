import { ExternalLink, Signal } from 'lucide-react';

function Logo({ logoUrl, name }) {
  if (logoUrl) {
    return <img src={logoUrl} alt="" className="h-11 w-11 rounded object-cover ring-1 ring-white/10" loading="lazy" />;
  }

  return (
    <div className="grid h-11 w-11 place-items-center rounded border border-bitcoin/25 bg-bitcoin/10 font-mono text-sm font-semibold text-bitcoin">
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

export function ProjectCard({ project }) {
  return (
    <article className="group flex min-h-56 flex-col rounded-lg border border-white/[0.08] bg-[linear-gradient(145deg,rgba(255,255,255,0.058),rgba(255,255,255,0.026))] p-5 transition duration-200 hover:-translate-y-1 hover:border-bitcoin/28 hover:bg-white/[0.06]">
      <div className="flex items-center justify-between gap-3">
        <Logo logoUrl={project.logoUrl} name={project.name} />
        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-400">
          <Signal size={12} className="text-bitcoin" />
          {project.category || 'Airdrop'}
        </span>
      </div>
      <div className="mt-5 flex items-start justify-between gap-3">
        <h3 className="text-xl font-semibold tracking-tight text-white">{project.name}</h3>
        {project.websiteUrl ? (
          <a
            href={project.websiteUrl}
            target="_blank"
            rel="noreferrer"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 text-zinc-300 transition hover:border-bitcoin/40 hover:text-bitcoin"
            aria-label={`Open ${project.name}`}
          >
            <ExternalLink size={16} />
          </a>
        ) : null}
      </div>
      <p className="mt-3 flex-1 text-sm leading-6 text-zinc-400">{project.bio}</p>
      <div className="mt-5 flex items-center justify-between border-t border-white/[0.07] pt-4 text-xs uppercase tracking-[0.16em] text-zinc-500">
        <span>{project.status || 'active'}</span>
        <span className="h-px w-16 bg-gradient-to-r from-bitcoin/55 to-transparent" />
      </div>
    </article>
  );
}
