import { Project } from './types.ts';

const projectsCacheKey = 'kwl.projects';
const maxProjectCacheAgeMs = 5 * 60 * 1000;

interface CachedProjects {
  savedAt: number;
  data: Project[];
}

export function readCachedProjects(): Project[] {
  try {
    const cached = JSON.parse(sessionStorage.getItem(projectsCacheKey) || 'null') as CachedProjects | null;
    if (!cached || !Array.isArray(cached.data)) return [];
    if (Date.now() - Number(cached.savedAt || 0) > maxProjectCacheAgeMs) return [];
    return cached.data;
  } catch {
    return [];
  }
}

export function writeCachedProjects(projects: Project[]): void {
  try {
    const cacheData: CachedProjects = { savedAt: Date.now(), data: projects };
    sessionStorage.setItem(projectsCacheKey, JSON.stringify(cacheData));
  } catch {
    // Ignore storage failures; fresh data still renders.
  }
}

export function clearCachedProjects(): void {
  try {
    sessionStorage.removeItem(projectsCacheKey);
  } catch {
    // Ignore storage failures.
  }
}
