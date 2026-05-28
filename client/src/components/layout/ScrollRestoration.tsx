import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function ScrollRestoration() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Standard scroll restoration to top
    window.scrollTo({ top: 0 });
  }, [pathname]);

  return null;
}
