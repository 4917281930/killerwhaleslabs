import { useEffect, useState, useCallback } from 'react';
import { AdminSession } from '../lib/types.ts';
import { getAdminMe, loginAdmin as apiLoginAdmin, logoutAdmin as apiLogoutAdmin } from '../lib/api.ts';

function readCachedAdmin(): AdminSession | null {
  try {
    return JSON.parse(sessionStorage.getItem('kwl.admin') || 'null');
  } catch {
    return null;
  }
}

function writeCachedAdmin(admin: AdminSession | null): void {
  try {
    if (admin) sessionStorage.setItem('kwl.admin', JSON.stringify(admin));
    else sessionStorage.removeItem('kwl.admin');
  } catch {
    // Ignore storage failures.
  }
}

export function useAdminSession() {
  const [admin, setAdminState] = useState<AdminSession | null>(readCachedAdmin);
  const [checking, setChecking] = useState<boolean>(() => !readCachedAdmin());

  const setAdmin = useCallback((adminData: AdminSession | null) => {
    setAdminState(adminData);
    writeCachedAdmin(adminData);
  }, []);

  useEffect(() => {
    let active = true;
    getAdminMe()
      .then((data) => {
        if (active) setAdmin(data);
      })
      .catch(() => {
        if (active) setAdmin(null);
      })
      .finally(() => {
        if (active) setChecking(false);
      });

    return () => {
      active = false;
    };
  }, [setAdmin]);

  const login = useCallback(async (form: Record<string, string>) => {
    const data = await apiLoginAdmin(form);
    setAdmin(data);
    return data;
  }, [setAdmin]);

  const logout = useCallback(async () => {
    await apiLogoutAdmin().catch(() => null);
    setAdmin(null);
  }, [setAdmin]);

  return {
    admin,
    checking,
    setAdmin,
    login,
    logout
  };
}
