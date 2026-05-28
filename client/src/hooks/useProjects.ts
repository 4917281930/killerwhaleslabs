import { useCallback, useEffect, useState, useRef } from 'react';
import { Project } from '../lib/types.ts';
import { getProjects, deleteProject as apiDeleteProject } from '../lib/api.ts';
import { readCachedProjects, writeCachedProjects } from '../lib/projectCache.ts';

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>(readCachedProjects);
  const [loading, setLoading] = useState<boolean>(() => readCachedProjects().length === 0);
  const [error, setError] = useState<string>('');
  const activeRef = useRef(true);

  const load = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const data = await getProjects();
      if (activeRef.current) {
        writeCachedProjects(data);
        setProjects(data);
        setError('');
      }
    } catch (err: any) {
      if (activeRef.current) {
        setError(err.message || 'Unable to load projects');
      }
    } finally {
      if (activeRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    activeRef.current = true;
    load(projects.length === 0);
    return () => {
      activeRef.current = false;
    };
  }, [load]);

  const deleteProject = useCallback(async (id: number) => {
    await apiDeleteProject(id);
    await load(false);
  }, [load]);

  return {
    projects,
    loading,
    error,
    reload: load,
    deleteProject
  };
}
