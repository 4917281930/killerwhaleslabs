import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AirdropsPage } from '../pages/AirdropsPage.tsx';
import { HomePage } from '../pages/HomePage.tsx';
import { NotFoundPage } from '../pages/NotFoundPage.tsx';
import { useAdminSession } from '../hooks/useAdminSession.ts';
import { ScrollRestoration } from '../components/layout/ScrollRestoration.tsx';

const AdminPage = React.lazy(() =>
  import('../pages/AdminPage.tsx').then((module) => ({ default: module.AdminPage }))
);

export default function App() {
  const { admin, checking, setAdmin } = useAdminSession();

  if (checking) {
    return (
      <div className="grid min-h-screen place-items-center bg-ink text-sm text-zinc-500 font-mono">
        initializing terminal...
      </div>
    );
  }

  return (
    <BrowserRouter>
      <ScrollRestoration />
      <div className="min-h-screen bg-ink text-white font-sans">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/airdrops" element={<AirdropsPage isAdmin={Boolean(admin)} />} />
          <Route path="/airdrops/:slug" element={<AirdropsPage isAdmin={Boolean(admin)} />} />
          <Route path="/lab-console" element={
            <React.Suspense fallback={<div className="grid min-h-screen place-items-center bg-ink text-sm text-zinc-500 font-mono">loading console...</div>}>
              <AdminPage onAdminChange={setAdmin} />
            </React.Suspense>
          } />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
