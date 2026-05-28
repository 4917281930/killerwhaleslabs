import React, { useEffect, useRef, useState } from 'react';
import { Project } from '../../lib/types.ts';

const sizeClasses = {
  sm: 'h-10 w-10 text-xs sm:h-11 sm:w-11',
  md: 'h-11 w-11 text-xs',
  lg: 'h-12 w-12 text-sm sm:h-14 sm:w-14 sm:text-base',
  xl: 'h-16 w-16 text-base'
};

interface ProjectLogoProps {
  project?: Project;
  logoUrl?: string | null;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  priority?: boolean;
  className?: string;
}

export function ProjectLogo({
  project,
  logoUrl,
  name,
  size = 'md',
  priority = false,
  className = ''
}: ProjectLogoProps) {
  const [loaded, setLoaded] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const src = logoUrl ?? project?.logoUrl;
  const label = name ?? project?.name ?? '';
  const sizeClass = sizeClasses[size] || sizeClasses.md;

  useEffect(() => {
    const image = imageRef.current;
    setLoaded(Boolean(image?.complete && image.naturalWidth > 0));
  }, [src]);

  if (src) {
    return (
      <span className={`relative block ${sizeClass} shrink-0 overflow-hidden rounded bg-black/24 ring-1 ring-white/10 ${className}`}>
        <span className={`kwl-logo-skeleton absolute inset-0 transition-opacity duration-150 ${loaded ? 'opacity-0' : 'opacity-100'}`} />
        <img
          ref={imageRef}
          src={src}
          alt=""
          className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-200 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setLoaded(false)}
        />
      </span>
    );
  }

  return (
    <div className={`grid ${sizeClass} shrink-0 place-items-center rounded border border-bitcoin/25 bg-bitcoin/10 font-mono font-semibold text-bitcoin ${className}`}>
      {label.slice(0, 2).toUpperCase()}
    </div>
  );
}
