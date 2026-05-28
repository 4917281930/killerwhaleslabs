import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { 
  ExternalLink, ImageIcon, Lock, LogOut, Pencil, Plus, Save, Trash2, 
  Upload, X, Copy, Eye, Archive, CheckCircle, Flame, AlertTriangle, Info, Search
} from 'lucide-react';
import {
  createProject,
  deleteProject,
  getAdminMe,
  getProjects,
  loginAdmin,
  logoutAdmin,
  updateProject,
  uploadProjectLogo,
  ApiError
} from '../lib/api.ts';
import { ProjectCard } from '../components/home/ProjectCard.tsx';
import { ProjectLogo } from '../components/home/ProjectLogo.tsx';
import { clearCachedProjects, writeCachedProjects } from '../lib/projectCache.ts';
import { Project, AdminSession } from '../lib/types.ts';

interface FormState {
  name: string;
  slug: string;
  bio: string;
  category: string;
  status: 'active' | 'watching' | 'paused';
  logoUrl: string;
  logoSourceUrl: string;
  logoCropMode: 'cover' | 'fit';
  logoCropX: number;
  logoCropY: number;
  logoCropZoom: number;
  websiteUrl: string;

  // Upgraded Fields
  shortDescription: string;
  ecosystem: string;
  chain: string;
  taskType: string;
  difficulty: 'easy' | 'medium' | 'hard' | '';
  riskLevel: 'low' | 'medium' | 'high' | '';
  priority: number;
  featured: boolean;
  published: boolean;
  archived: boolean;
  officialXUrl: string;
  discordUrl: string;
  telegramUrl: string;
  docsUrl: string;
  appUrl: string;
  notes: string;
  adminNotes: string;
  lastCheckedAt: string;
}

const emptyForm: FormState = {
  name: '',
  slug: '',
  bio: '',
  category: 'Airdrop',
  status: 'active',
  logoUrl: '',
  logoSourceUrl: '',
  logoCropMode: 'cover',
  logoCropX: 0,
  logoCropY: 0,
  logoCropZoom: 1,
  websiteUrl: '',
  
  shortDescription: '',
  ecosystem: '',
  chain: '',
  taskType: '',
  difficulty: 'easy',
  riskLevel: 'low',
  priority: 0,
  featured: false,
  published: true,
  archived: false,
  officialXUrl: '',
  discordUrl: '',
  telegramUrl: '',
  docsUrl: '',
  appUrl: '',
  notes: '',
  adminNotes: '',
  lastCheckedAt: new Date().toISOString().split('T')[0]
};

const logoOutputSize = 160;
const logoCropViewportSize = 224;

function validate(form: FormState) {
  const errors: Record<string, string> = {};
  if (!form.name.trim()) errors.name = 'Project name is required.';
  if (!form.category.trim()) errors.category = 'Category is required.';
  if (!form.bio.trim()) errors.bio = 'Bio is required.';
  if (form.bio.trim().length > 220) errors.bio = 'Bio should stay under 220 characters.';

  if (form.slug.trim() && !/^[a-z0-9-]+$/.test(form.slug.trim())) {
    errors.slug = 'Slug must only contain lowercase letters, numbers, and hyphens.';
  }

  // URL formatting scanner
  const checkUrl = (url: string, fieldName: string) => {
    if (url && !/^https?:\/\/\S+\.\S+/.test(url)) {
      errors[fieldName] = 'Use a valid http:// or https:// URL.';
    }
  };

  checkUrl(form.websiteUrl, 'websiteUrl');
  checkUrl(form.officialXUrl, 'officialXUrl');
  checkUrl(form.discordUrl, 'discordUrl');
  checkUrl(form.telegramUrl, 'telegramUrl');
  checkUrl(form.docsUrl, 'docsUrl');
  checkUrl(form.appUrl, 'appUrl');

  return errors;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Unable to read logo image'));
    image.src = url;
  });
}

function sourceToUrl(source: File | string): { url: string; revoke: boolean } {
  if (source instanceof File) return { url: URL.createObjectURL(source), revoke: true };
  return { url: source, revoke: false };
}

async function renderLogoFile(source: File | string, mode: 'cover' | 'fit', crop: { zoom: number; x: number; y: number } = { zoom: 1, x: 0, y: 0 }) {
  if (!source) throw new Error('Logo image is required');
  const sourceUrl = sourceToUrl(source);
  try {
    const image = await loadImage(sourceUrl.url);
    const canvas = document.createElement('canvas');
    canvas.width = logoOutputSize;
    canvas.height = logoOutputSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');
    
    ctx.fillStyle = '#060708';
    ctx.fillRect(0, 0, logoOutputSize, logoOutputSize);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const zoom = Number(crop.zoom) || 1;
    const offsetX = Number(crop.x) || 0;
    const offsetY = Number(crop.y) || 0;
    const baseScale = mode === 'fit'
      ? Math.min(logoCropViewportSize / image.width, logoCropViewportSize / image.height)
      : Math.max(logoCropViewportSize / image.width, logoCropViewportSize / image.height);
    const scale = baseScale * zoom;
    const viewWidth = image.width * scale;
    const viewHeight = image.height * scale;
    const viewX = (logoCropViewportSize - viewWidth) / 2 + offsetX;
    const viewY = (logoCropViewportSize - viewHeight) / 2 + offsetY;
    const outputScale = logoOutputSize / logoCropViewportSize;

    ctx.drawImage(
      image,
      Math.round(viewX * outputScale),
      Math.round(viewY * outputScale),
      Math.round(viewWidth * outputScale),
      Math.round(viewHeight * outputScale)
    );

    return canvas.toDataURL('image/webp', 0.86);
  } finally {
    if (sourceUrl.revoke) URL.revokeObjectURL(sourceUrl.url);
  }
}

async function renderLogoSourceFile(file: File) {
  const sourceUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(sourceUrl);
    const maxSide = 512;
    const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');
    
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, 0, 0, width, height);

    for (const quality of [0.82, 0.74, 0.66]) {
      const dataUrl = canvas.toDataURL('image/webp', quality);
      if (dataUrl.length < 520000) return dataUrl;
    }
    return canvas.toDataURL('image/webp', 0.58);
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

function revokeObjectUrl(url: string) {
  if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
}

function readCachedAdmin(): AdminSession | null {
  try {
    return JSON.parse(sessionStorage.getItem('kwl.admin') || 'null');
  } catch {
    return null;
  }
}

function writeCachedAdmin(admin: AdminSession | null) {
  try {
    if (admin) sessionStorage.setItem('kwl.admin', JSON.stringify(admin));
    else sessionStorage.removeItem('kwl.admin');
  } catch {
    // Ignore storage failures.
  }
}

export function AdminPage({ onAdminChange }: { onAdminChange?: (admin: AdminSession | null) => void }) {
  const cachedAdmin = readCachedAdmin();
  const [admin, setAdminState] = useState<AdminSession | null>(cachedAdmin);
  const [checking, setChecking] = useState(!cachedAdmin);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');

  function setAdmin(adminData: AdminSession | null) {
    setAdminState(adminData);
    writeCachedAdmin(adminData);
    onAdminChange?.(adminData);
  }

  useEffect(() => {
    getAdminMe()
      .then(setAdmin)
      .catch(() => setAdmin(null))
      .finally(() => setChecking(false));
  }, []);

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setLoginError('');
    try {
      const data = await loginAdmin(loginForm);
      setAdmin(data);
    } catch (err: any) {
      setLoginError(err.message || 'Unable to login');
    }
  }

  if (checking) {
    return <div className="grid min-h-screen place-items-center bg-ink text-sm text-zinc-500 font-mono">checking lab session...</div>;
  }

  if (!admin) {
    return (
      <div className="min-h-screen bg-ink px-4 text-white font-sans">
        <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center animate-fade-in">
          <a
            href="/"
            onClick={(event) => { event.preventDefault(); window.history.pushState({}, '', '/'); window.dispatchEvent(new PopStateEvent('popstate')); }}
            className="mb-8 text-sm font-semibold tracking-[0.22em] text-white font-mono"
          >
            killerwhaleslabs
          </a>
          <form onSubmit={handleLogin} className="rounded-lg border border-white/[0.09] bg-white/[0.045] p-6 shadow-card">
            <div className="mb-6">
              <div className="mb-4 grid h-10 w-10 place-items-center rounded-full border border-bitcoin/30 bg-bitcoin/10 text-bitcoin">
                <Lock size={18} />
              </div>
              <p className="text-xs uppercase tracking-[0.24em] text-bitcoin font-mono">private lab console</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight">Operator login</h1>
            </div>
            {loginError ? (
              <div className="mb-4 rounded border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200 font-mono">{loginError}</div>
            ) : null}
            <label className="mb-4 block">
              <span className="mb-2 block text-sm text-zinc-300">Username</span>
              <input
                value={loginForm.username}
                onChange={(event) => setLoginForm((current) => ({ ...current, username: event.target.value }))}
                className="w-full rounded border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-bitcoin/60"
                autoComplete="username"
              />
            </label>
            <label className="mb-5 block">
              <span className="mb-2 block text-sm text-zinc-300">Password</span>
              <input
                type="password"
                value={loginForm.password}
                onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
                className="w-full rounded border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-bitcoin/60"
                autoComplete="current-password"
              />
            </label>
            <button className="inline-flex w-full items-center justify-center rounded-full bg-bitcoin px-5 py-3 text-sm font-semibold text-black transition hover:bg-ember">
              Enter console
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <Dashboard admin={admin} onLogout={() => setAdmin(null)} />;
}

function Dashboard({ admin, onLogout }: { admin: AdminSession; onLogout: () => void }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  
  // Search / Filter lists states
  const [adminSearch, setAdminSearch] = useState('');

  // Logo upload state
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [logoSourceUrl, setLogoSourceUrl] = useState('');
  const [logoDirty, setLogoDirty] = useState(false);
  const [logoMode, setLogoMode] = useState<'cover' | 'fit'>('cover');
  const [logoCrop, setLogoCrop] = useState({ zoom: 1, x: 0, y: 0 });
  const logoCropRef = useRef({ zoom: 1, x: 0, y: 0 });
  const logoPreviewRef = useRef<HTMLImageElement>(null);
  const dragStateRef = useRef<{ startX: number; startY: number; cropX: number; cropY: number } | null>(null);
  const zoomValueRef = useRef<HTMLSpanElement>(null);
  const logoFrame = useRef<number | null>(null);
  const [logoError, setLogoError] = useState('');
  const [logoCropOpen, setLogoCropOpen] = useState(false);
  
  // Draft restore state
  const [hasDraft, setHasDraft] = useState(false);

  const title = useMemo(() => (editingId ? 'Edit Operations' : 'Register New Campaign'), [editingId]);
  
  const isFormDirty = useMemo(() => {
    // Basic checks against empty or original data
    if (!editingId) {
      return Object.keys(emptyForm).some(
        (k) => form[k as keyof FormState] !== emptyForm[k as keyof FormState]
      );
    }
    const orig = projects.find(p => p.id === editingId);
    if (!orig) return false;
    
    return (
      form.name !== orig.name ||
      form.slug !== orig.slug ||
      form.bio !== orig.bio ||
      form.category !== orig.category ||
      form.status !== orig.status ||
      form.websiteUrl !== (orig.websiteUrl || '') ||
      form.shortDescription !== (orig.shortDescription || '') ||
      form.ecosystem !== (orig.ecosystem || '') ||
      form.chain !== (orig.chain || '') ||
      form.taskType !== (orig.taskType || '') ||
      form.difficulty !== (orig.difficulty || '') ||
      form.riskLevel !== (orig.riskLevel || '') ||
      form.priority !== (orig.priority || 0) ||
      form.featured !== (orig.featured || false) ||
      form.published !== (orig.published || false) ||
      form.archived !== (orig.archived || false) ||
      form.officialXUrl !== (orig.officialXUrl || '') ||
      form.discordUrl !== (orig.discordUrl || '') ||
      form.telegramUrl !== (orig.telegramUrl || '') ||
      form.docsUrl !== (orig.docsUrl || '') ||
      form.appUrl !== (orig.appUrl || '') ||
      form.notes !== (orig.notes || '') ||
      form.adminNotes !== (orig.adminNotes || '')
    );
  }, [form, editingId, projects]);

  const preview = {
    id: editingId || 0,
    name: form.name,
    slug: form.slug,
    bio: form.bio,
    category: form.category,
    status: form.status,
    logoUrl: logoPreview || form.logoUrl || null,
    logoSourceUrl: form.logoSourceUrl || null,
    logoCropMode: logoMode,
    logoCropX: logoCrop.x,
    logoCropY: logoCrop.y,
    logoCropZoom: logoCrop.zoom,
    websiteUrl: form.websiteUrl || null,
    shortDescription: form.shortDescription,
    ecosystem: form.ecosystem,
    chain: form.chain,
    taskType: form.taskType,
    difficulty: form.difficulty,
    riskLevel: form.riskLevel,
    priority: form.priority,
    featured: form.featured,
    published: form.published,
    archived: form.archived,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const handleApiError = useCallback((err: any, fallbackMessage: string) => {
    if (err instanceof ApiError && err.status === 401) {
      onLogout();
    } else {
      setError(err.message || fallbackMessage);
    }
  }, [onLogout]);

  // Dirty page exit checking
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (isFormDirty) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes in your operator form. Confirm exit?';
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isFormDirty]);

  // Autosave Draft
  useEffect(() => {
    if (isFormDirty) {
      localStorage.setItem('kwl.draft', JSON.stringify({ form, editingId }));
    } else {
      localStorage.removeItem('kwl.draft');
    }
  }, [form, editingId, isFormDirty]);

  // Read draft on mount
  useEffect(() => {
    const draft = localStorage.getItem('kwl.draft');
    if (draft) {
      setHasDraft(true);
    }
  }, []);

  function restoreDraft() {
    try {
      const draft = JSON.parse(localStorage.getItem('kwl.draft') || '');
      if (draft && draft.form) {
        setForm(draft.form);
        setEditingId(draft.editingId);
        setHasDraft(false);
      }
    } catch {
      localStorage.removeItem('kwl.draft');
      setHasDraft(false);
    }
  }

  function discardDraft() {
    localStorage.removeItem('kwl.draft');
    setHasDraft(false);
  }

  async function loadProjects() {
    setLoading(true);
    try {
      const data = await getProjects();
      setProjects(data);
      writeCachedProjects(data);
      setError('');
    } catch (err: any) {
      handleApiError(err, 'Unable to load projects');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProjects();
  }, []);

  function updateField(event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value, type } = event.target;
    if (type === 'checkbox') {
      const checked = (event.target as HTMLInputElement).checked;
      setForm((current) => ({ ...current, [name]: checked }));
    } else {
      setForm((current) => ({ ...current, [name]: value }));
    }
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setFieldErrors({});
    setLogoFile(null);
    revokeObjectUrl(logoSourceUrl);
    setLogoPreview('');
    setLogoSourceUrl('');
    setLogoDirty(false);
    setLogoMode('cover');
    logoCropRef.current = { zoom: 1, x: 0, y: 0 };
    setLogoCrop({ zoom: 1, x: 0, y: 0 });
    setLogoError('');
    setLogoCropOpen(false);
    localStorage.removeItem('kwl.draft');
  }

  function startEdit(project: Project) {
    setEditingId(project.id);
    setForm({
      name: project.name,
      slug: project.slug || '',
      bio: project.bio,
      category: project.category || 'Airdrop',
      status: project.status || 'active',
      logoUrl: project.logoUrl || '',
      logoSourceUrl: project.logoSourceUrl || project.logoUrl || '',
      logoCropMode: project.logoCropMode || 'cover',
      logoCropX: Number(project.logoCropX || 0),
      logoCropY: Number(project.logoCropY || 0),
      logoCropZoom: Number(project.logoCropZoom || 1),
      websiteUrl: project.websiteUrl || '',

      shortDescription: project.shortDescription || '',
      ecosystem: project.ecosystem || '',
      chain: project.chain || '',
      taskType: project.taskType || '',
      difficulty: (project.difficulty as any) || 'easy',
      riskLevel: (project.riskLevel as any) || 'low',
      priority: project.priority || 0,
      featured: project.featured || false,
      published: project.published !== undefined ? project.published : true,
      archived: project.archived || false,
      officialXUrl: project.officialXUrl || '',
      discordUrl: project.discordUrl || '',
      telegramUrl: project.telegramUrl || '',
      docsUrl: project.docsUrl || '',
      appUrl: project.appUrl || '',
      notes: project.notes || '',
      adminNotes: project.adminNotes || '',
      lastCheckedAt: project.lastCheckedAt ? project.lastCheckedAt.split('T')[0] : new Date().toISOString().split('T')[0]
    });
    setLogoFile(null);
    revokeObjectUrl(logoSourceUrl);
    setLogoPreview(project.logoUrl || '');
    setLogoSourceUrl(project.logoSourceUrl || project.logoUrl || '');
    setLogoDirty(false);
    setLogoMode(project.logoCropMode || 'cover');
    logoCropRef.current = {
      zoom: Number(project.logoCropZoom || 1),
      x: Number(project.logoCropX || 0),
      y: Number(project.logoCropY || 0)
    };
    setLogoCrop(logoCropRef.current);
    setLogoError('');
    setLogoCropOpen(false);
    setFieldErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Duplicate layout record
  function handleDuplicate(project: Project) {
    setEditingId(null); // Create new
    setForm({
      name: `${project.name} (Copy)`,
      slug: '', // empty to trigger auto generator
      bio: project.bio,
      category: project.category || 'Airdrop',
      status: project.status || 'active',
      logoUrl: project.logoUrl || '',
      logoSourceUrl: project.logoSourceUrl || '',
      logoCropMode: project.logoCropMode || 'cover',
      logoCropX: Number(project.logoCropX || 0),
      logoCropY: Number(project.logoCropY || 0),
      logoCropZoom: Number(project.logoCropZoom || 1),
      websiteUrl: project.websiteUrl || '',

      shortDescription: project.shortDescription || '',
      ecosystem: project.ecosystem || '',
      chain: project.chain || '',
      taskType: project.taskType || '',
      difficulty: (project.difficulty as any) || 'easy',
      riskLevel: (project.riskLevel as any) || 'low',
      priority: project.priority || 0,
      featured: false, // Default false for duplicates
      published: false, // Draft for duplicates
      archived: false,
      officialXUrl: project.officialXUrl || '',
      discordUrl: project.discordUrl || '',
      telegramUrl: project.telegramUrl || '',
      docsUrl: project.docsUrl || '',
      appUrl: project.appUrl || '',
      notes: project.notes || '',
      adminNotes: project.adminNotes || '',
      lastCheckedAt: new Date().toISOString().split('T')[0]
    });
    setLogoFile(null);
    setLogoPreview(project.logoUrl || '');
    setLogoSourceUrl(project.logoSourceUrl || '');
    setLogoDirty(false);
    setLogoCrop({
      zoom: Number(project.logoCropZoom || 1),
      x: Number(project.logoCropX || 0),
      y: Number(project.logoCropY || 0)
    });
    setFieldErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Fast updates for visibility toggles
  async function toggleStatus(project: Project, field: 'published' | 'featured' | 'archived') {
    try {
      const nextVal = !project[field];
      const payload = {
        name: project.name,
        bio: project.bio,
        category: project.category,
        status: project.status,
        logoUrl: project.logoUrl,
        logoSourceUrl: project.logoSourceUrl,
        logoCropMode: project.logoCropMode,
        logoCropX: project.logoCropX,
        logoCropY: project.logoCropY,
        logoCropZoom: project.logoCropZoom,
        websiteUrl: project.websiteUrl,
        shortDescription: project.shortDescription,
        ecosystem: project.ecosystem,
        chain: project.chain,
        taskType: project.taskType,
        difficulty: project.difficulty as any,
        riskLevel: project.riskLevel as any,
        priority: project.priority,
        featured: project.featured,
        published: project.published,
        archived: project.archived,
        officialXUrl: project.officialXUrl,
        discordUrl: project.discordUrl,
        telegramUrl: project.telegramUrl,
        docsUrl: project.docsUrl,
        appUrl: project.appUrl,
        notes: project.notes,
        adminNotes: project.adminNotes,
        lastCheckedAt: project.lastCheckedAt,
        [field]: nextVal
      };
      await updateProject(project.id, payload);
      clearCachedProjects();
      await loadProjects();
    } catch (err: any) {
      handleApiError(err, 'Unable to update project status');
    }
  }

  async function handleLogoFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setLogoError('Upload a PNG, JPG, or WebP image.');
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      setLogoError('Logo source image must stay under 6 MB.');
      return;
    }

    try {
      const initialCrop = { zoom: 1, x: 0, y: 0 };
      revokeObjectUrl(logoSourceUrl);
      const sourceUrl = URL.createObjectURL(file);
      setLogoError('');
      setLogoFile(file);
      setLogoSourceUrl(sourceUrl);
      setLogoDirty(true);
      logoCropRef.current = initialCrop;
      setLogoCrop(initialCrop);
      setLogoPreview(await renderLogoFile(file, 'cover', initialCrop));
      setLogoCropOpen(true);
    } catch (err: any) {
      setLogoError(err.message || 'Unable to process logo image.');
    }
  }

  function changeLogoMode(nextMode: 'cover' | 'fit') {
    setLogoMode(nextMode);
    window.requestAnimationFrame(() => previewLogoCrop(logoCropRef.current));
  }

  function removeLogo() {
    setLogoFile(null);
    revokeObjectUrl(logoSourceUrl);
    setLogoPreview('');
    setLogoSourceUrl('');
    setLogoDirty(true);
    logoCropRef.current = { zoom: 1, x: 0, y: 0 };
    setLogoCrop({ zoom: 1, x: 0, y: 0 });
    setLogoError('');
    setLogoCropOpen(false);
    setForm((current) => ({ ...current, logoUrl: '', logoSourceUrl: '' }));
  }

  function previewLogoCrop(nextCrop: { zoom: number; x: number; y: number }) {
    logoCropRef.current = nextCrop;
    if (zoomValueRef.current) zoomValueRef.current.textContent = nextCrop.zoom.toFixed(2);
    if (logoFrame.current) window.cancelAnimationFrame(logoFrame.current);
    logoFrame.current = window.requestAnimationFrame(() => {
      if (logoPreviewRef.current) {
        logoPreviewRef.current.style.transform = `translate(${nextCrop.x}px, ${nextCrop.y}px) scale(${nextCrop.zoom})`;
      }
    });
  }

  function commitLogoCrop() {
    setLogoCrop({ ...logoCropRef.current });
  }

  function getPoint(event: any) {
    const touch = event.touches?.[0] || event.changedTouches?.[0];
    return touch ? { x: touch.clientX, y: touch.clientY } : { x: event.clientX, y: event.clientY };
  }

  function startLogoDrag(event: any) {
    if (!logoPreviewRef.current) return;
    event.preventDefault();
    const point = getPoint(event);
    dragStateRef.current = {
      startX: point.x,
      startY: point.y,
      cropX: logoCropRef.current.x,
      cropY: logoCropRef.current.y
    };
  }

  function moveLogoDrag(event: any) {
    if (!dragStateRef.current) return;
    event.preventDefault();
    const point = getPoint(event);
    const nextCrop = {
      ...logoCropRef.current,
      x: Math.round(dragStateRef.current.cropX + point.x - dragStateRef.current.startX),
      y: Math.round(dragStateRef.current.cropY + point.y - dragStateRef.current.startY)
    };
    previewLogoCrop(nextCrop);
  }

  function endLogoDrag() {
    if (!dragStateRef.current) return;
    dragStateRef.current = null;
    commitLogoCrop();
  }

  function applyQuickCrop(nextCrop = logoCropRef.current) {
    logoCropRef.current = nextCrop;
    setLogoCrop(nextCrop);
    previewLogoCrop(nextCrop);
  }

  useEffect(() => {
    if (!logoCropOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    const previousTouchAction = document.body.style.touchAction;
    const handleMouseMove = (event: MouseEvent) => moveLogoDrag(event);
    const handleMouseUp = () => endLogoDrag();
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.touchAction = previousTouchAction;
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      if (logoFrame.current) window.cancelAnimationFrame(logoFrame.current);
    };
  }, [logoCropOpen]);

  async function applyLogoCrop() {
    const source = logoFile || logoSourceUrl || form.logoSourceUrl || form.logoUrl;
    if (!source) {
      setLogoCropOpen(false);
      return;
    }

    try {
      const finalCrop = logoCropRef.current;
      setLogoCrop(finalCrop);
      setLogoPreview(await renderLogoFile(source, logoMode, finalCrop));
      setLogoDirty(true);
      setLogoCropOpen(false);
    } catch (err: any) {
      setLogoError(err.message || 'Unable to process logo image.');
    }
  }

  function LogoCropModal() {
    if (!logoCropOpen || !(logoFile || logoSourceUrl || logoPreview || form.logoUrl)) return null;

    const positions: [string, string, { x: number; y: number }][] = [
      ['center', 'Center', { x: 0, y: 0 }],
      ['top', 'Top', { x: 0, y: -48 }],
      ['bottom', 'Bottom', { x: 0, y: 48 }],
      ['left', 'Left', { x: -48, y: 0 }],
      ['right', 'Right', { x: 48, y: 0 }]
    ];

    return (
      <div className="fixed inset-0 z-[80] grid place-items-center overflow-hidden overscroll-contain bg-black/72 px-4 backdrop-blur-sm" role="dialog" aria-modal="true" onWheel={(event) => event.preventDefault()} onTouchMove={(event) => event.preventDefault()}>
        <div className="w-full max-w-md rounded-lg border border-white/[0.1] bg-ink p-5 shadow-card font-sans">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-bitcoin font-mono">Logo crop</p>
              <h2 className="mt-1 text-xl font-semibold text-white">Adjust logo</h2>
            </div>
            <button type="button" onClick={() => setLogoCropOpen(false)} className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-zinc-300 hover:bg-white/10">
              <X size={16} />
            </button>
          </div>

          <div className="mx-auto grid h-56 w-56 touch-none cursor-grab select-none place-items-center overflow-hidden rounded-lg border border-white/10 bg-white/[0.035] active:cursor-grabbing">
            {logoSourceUrl || logoPreview ? (
              <img
                ref={logoPreviewRef}
                src={logoSourceUrl || logoPreview || form.logoUrl}
                alt=""
                className={`h-full w-full transform-gpu select-none will-change-transform ${logoMode === 'fit' ? 'object-contain' : 'object-cover'}`}
                draggable="false"
                onMouseDown={startLogoDrag}
                onTouchStart={startLogoDrag}
                onTouchMove={moveLogoDrag}
                onTouchEnd={endLogoDrag}
                style={{ transform: `translate(${logoCrop.x}px, ${logoCrop.y}px) scale(${logoCrop.zoom})`, transformOrigin: 'center', touchAction: 'none' }}
              />
            ) : null}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 text-xs font-mono">
            {([
              ['cover', 'Crop fill'],
              ['fit', 'Fit full']
            ] as const).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                onClick={() => changeLogoMode(mode)}
                className={`rounded border px-3 py-2 transition ${logoMode === mode ? 'border-bitcoin/60 bg-bitcoin/10 text-bitcoin' : 'border-white/10 text-zinc-400 hover:border-white/20'}`}
              >
                {label}
              </button>
            ))}
          </div>

          <label className="mt-4 block font-mono">
            <span className="mb-2 flex justify-between text-xs text-zinc-500"><span>Zoom</span><span ref={zoomValueRef}>{logoCrop.zoom.toFixed(2)}</span></span>
            <input
              type="range"
              min="1"
              max="2.5"
              step="0.05"
              defaultValue={logoCrop.zoom}
              onInput={(event) => previewLogoCrop({ ...logoCropRef.current, zoom: Number(event.currentTarget.value) })}
              onPointerUp={commitLogoCrop}
              onMouseUp={commitLogoCrop}
              onTouchEnd={commitLogoCrop}
              className="w-full accent-bitcoin"
            />
          </label>

          <div className="mt-4 grid grid-cols-5 gap-2 text-xs font-mono">
            {positions.map(([key, label, position]) => (
              <button
                key={key}
                type="button"
                onClick={() => applyQuickCrop({ ...logoCropRef.current, ...position })}
                className="rounded border border-white/10 px-2 py-2 text-zinc-300 transition hover:border-bitcoin/40 hover:text-bitcoin"
              >
                {label}
              </button>
            ))}
          </div>

          <button type="button" onClick={applyLogoCrop} className="mt-5 w-full rounded bg-bitcoin px-4 py-3 text-sm font-semibold text-black transition hover:bg-ember">
            Apply crop
          </button>
        </div>
      </div>
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const errors = validate(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      // Find the first error block and scroll
      const firstError = Object.keys(errors)[0];
      const el = document.getElementsByName(firstError)[0];
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setSaving(true);
    try {
      let logoUrl = form.logoUrl.trim() || null;
      let logoSourceUrlValue = form.logoSourceUrl.trim() || null;
      const finalCrop = logoCropRef.current;
      const logoSource = logoFile || logoSourceUrl || form.logoSourceUrl || form.logoUrl;

      if (logoDirty && logoSource) {
        const finalImageData = logoPreview?.startsWith('data:')
          ? logoPreview
          : await renderLogoFile(logoSource, logoMode, finalCrop);
        const uploadedLogo = await uploadProjectLogo(finalImageData, form.name.trim());
        logoUrl = uploadedLogo.logoUrl;

        if (logoFile) {
          const sourceImageData = await renderLogoSourceFile(logoFile);
          const uploadedSource = await uploadProjectLogo(sourceImageData, `${form.name.trim()} source`);
          logoSourceUrlValue = uploadedSource.logoUrl;
        }
      }

      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim() || undefined, // undefined maps to backend auto generation
        bio: form.bio.trim(),
        category: form.category.trim(),
        status: form.status,
        logoUrl,
        logoSourceUrl: logoSourceUrlValue,
        logoCropMode: logoMode,
        logoCropX: Number(finalCrop.x || 0),
        logoCropY: Number(finalCrop.y || 0),
        logoCropZoom: Number(finalCrop.zoom || 1),
        websiteUrl: form.websiteUrl.trim() || null,
        
        shortDescription: form.shortDescription.trim() || form.bio.trim(),
        ecosystem: form.ecosystem.trim(),
        chain: form.chain.trim(),
        taskType: form.taskType.trim(),
        difficulty: form.difficulty || 'easy',
        riskLevel: form.riskLevel || 'low',
        priority: Number(form.priority) || 0,
        featured: form.featured,
        published: form.published,
        archived: form.archived,
        officialXUrl: form.officialXUrl.trim() || null,
        discordUrl: form.discordUrl.trim() || null,
        telegramUrl: form.telegramUrl.trim() || null,
        docsUrl: form.docsUrl.trim() || null,
        appUrl: form.appUrl.trim() || null,
        notes: form.notes.trim(),
        adminNotes: form.adminNotes.trim(),
        lastCheckedAt: form.lastCheckedAt ? new Date(form.lastCheckedAt).toISOString() : null
      };

      if (editingId) await updateProject(editingId, payload);
      else await createProject(payload);

      clearCachedProjects();
      resetForm();
      await loadProjects();
    } catch (err: any) {
      handleApiError(err, 'Unable to save project');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm('Delete this project forever from the public airdrop feed?')) return;
    try {
      await deleteProject(id);
      clearCachedProjects();
      await loadProjects();
    } catch (err: any) {
      handleApiError(err, 'Unable to delete project');
    }
  }

  async function handleLogout() {
    await logoutAdmin().catch(() => null);
    onLogout();
  }

  // Filter project lists on the fly
  const processedProjects = useMemo(() => {
    let result = [...projects];
    const q = adminSearch.toLowerCase().trim();
    if (q) {
      result = result.filter(p => 
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.ecosystem && p.ecosystem.toLowerCase().includes(q))
      );
    }
    return result;
  }, [projects, adminSearch]);

  return (
    <div className="min-h-screen bg-ink text-white font-sans">
      <header className="border-b border-white/[0.06] bg-ink/90">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a
            href="/"
            onClick={(event) => { event.preventDefault(); window.history.pushState({}, '', '/'); window.dispatchEvent(new PopStateEvent('popstate')); }}
            className="text-sm font-semibold tracking-[0.22em] font-mono"
          >
            killerwhaleslabs
          </a>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-zinc-500 font-mono sm:inline">{admin.username}</span>
            <a
              className="hidden items-center gap-2 text-sm text-zinc-400 hover:text-bitcoin sm:inline-flex"
              href="/"
              onClick={(event) => { event.preventDefault(); window.history.pushState({}, '', '/'); window.dispatchEvent(new PopStateEvent('popstate')); }}
            >
              Public site <ExternalLink size={15} />
            </a>
            <button onClick={handleLogout} className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white hover:border-bitcoin/40">
              <LogOut size={15} />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-7">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-bitcoin font-mono animate-pulse">private lab console</p>
          <h1 className="mt-3 text-3xl min-[380px]:text-4xl font-semibold tracking-tight sm:text-5xl font-sans">Airdrop intelligence ops</h1>
        </div>

        {/* Draft banner prompt */}
        {hasDraft && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-4 text-sm font-mono text-yellow-100">
            <div className="flex items-center gap-2">
              <Info size={16} className="text-yellow-400 shrink-0" />
              <span>Unsaved drafting session found in local storage. Restore work?</span>
            </div>
            <div className="flex gap-2">
              <button onClick={restoreDraft} className="rounded bg-yellow-400 px-3 py-1 text-xs font-semibold text-black hover:bg-yellow-300">Restore</button>
              <button onClick={discardDraft} className="rounded border border-white/10 px-3 py-1 text-xs text-zinc-300 hover:bg-white/10">Discard</button>
            </div>
          </div>
        )}

        {error ? (
          <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200 font-mono">{error}</div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr] items-start">
          
          {/* Admin Form Box */}
          <div className="space-y-6">
            <form onSubmit={handleSubmit} className="rounded-lg border border-white/[0.08] bg-white/[0.035] p-6 shadow-card font-mono text-xs">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white font-sans">{title}</h2>
                {editingId ? (
                  <button type="button" onClick={resetForm} className="grid h-8 w-8 place-items-center rounded-full border border-white/10 hover:bg-white/10 hover:text-white" title="Cancel edit">
                    <X size={15} />
                  </button>
                ) : null}
              </div>

              {/* 1. Basic Info Section */}
              <div className="mb-6 space-y-4 rounded border border-white/[0.05] bg-black/15 p-4">
                <h3 className="text-zinc-400 font-semibold tracking-wider uppercase flex items-center gap-1.5 font-sans"><Info size={13} /> 1. Basic Info</h3>
                
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-zinc-400">Project Name *</span>
                    <input
                      name="name"
                      value={form.name}
                      onChange={updateField}
                      placeholder="Saturn Protocol"
                      className="w-full rounded border border-white/10 bg-black/40 px-3 py-2 text-white outline-none focus:border-bitcoin/50"
                    />
                    {fieldErrors.name && <span className="mt-1 block text-[10px] text-red-400">{fieldErrors.name}</span>}
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-zinc-400">Custom Slug (Unique URL Name)</span>
                    <input
                      name="slug"
                      value={form.slug}
                      onChange={updateField}
                      placeholder="saturn-protocol (auto if blank)"
                      className="w-full rounded border border-white/10 bg-black/40 px-3 py-2 text-white outline-none focus:border-bitcoin/50"
                    />
                    {fieldErrors.slug && <span className="mt-1 block text-[10px] text-red-400">{fieldErrors.slug}</span>}
                  </label>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-zinc-400">Category *</span>
                    <input
                      name="category"
                      value={form.category}
                      onChange={updateField}
                      placeholder="DeFi, L2, NFT, etc."
                      className="w-full rounded border border-white/10 bg-black/40 px-3 py-2 text-white outline-none focus:border-bitcoin/50"
                    />
                    {fieldErrors.category && <span className="mt-1 block text-[10px] text-red-400">{fieldErrors.category}</span>}
                  </label>
                  
                  <label className="block">
                    <span className="mb-2 block text-zinc-400">Short Summary Card</span>
                    <input
                      name="shortDescription"
                      value={form.shortDescription}
                      onChange={updateField}
                      placeholder="DeFi pool tracking tool with detailed checkpoint guides."
                      className="w-full rounded border border-white/10 bg-black/40 px-3 py-2 text-white outline-none focus:border-bitcoin/50"
                    />
                  </label>
                </div>

                <label className="block col-span-2">
                  <span className="mb-2 block text-zinc-400">Public Feed Bio Description *</span>
                  <textarea
                    name="bio"
                    value={form.bio}
                    onChange={updateField}
                    rows={2}
                    placeholder="Provide a concise description under 220 chars"
                    className="w-full resize-none rounded border border-white/10 bg-black/40 px-3 py-2 text-white outline-none focus:border-bitcoin/50"
                  />
                  <div className="mt-1 flex justify-between text-[10px] text-zinc-500">
                    <span>{fieldErrors.bio || 'Clear bio metrics.'}</span>
                    <span>{form.bio.length}/220</span>
                  </div>
                </label>
              </div>

              {/* 2. Status & Visibility Section */}
              <div className="mb-6 space-y-4 rounded border border-white/[0.05] bg-black/15 p-4">
                <h3 className="text-zinc-400 font-semibold tracking-wider uppercase flex items-center gap-1.5 font-sans"><Eye size={13} /> 2. Visibility & Priority</h3>
                
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <label className="block">
                    <span className="mb-2 block text-zinc-400">Operation Status</span>
                    <select
                      name="status"
                      value={form.status}
                      onChange={updateField}
                      className="w-full rounded border border-white/10 bg-black/40 px-2 py-2 text-white outline-none focus:border-bitcoin/50"
                    >
                      <option value="active">active</option>
                      <option value="watching">watching</option>
                      <option value="paused">paused</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-zinc-400">Priority Score (Integer)</span>
                    <input
                      name="priority"
                      type="number"
                      value={form.priority}
                      onChange={updateField}
                      className="w-full rounded border border-white/10 bg-black/40 px-2 py-2 text-white outline-none focus:border-bitcoin/50"
                    />
                  </label>

                  <div className="col-span-2 grid grid-cols-3 gap-2 items-end pb-1.5">
                    <label className="flex items-center gap-1.5 cursor-pointer text-zinc-300">
                      <input
                        name="published"
                        type="checkbox"
                        checked={form.published}
                        onChange={updateField}
                        className="rounded accent-bitcoin h-4 w-4 border-white/10"
                      />
                      <span>Publish</span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer text-zinc-300">
                      <input
                        name="featured"
                        type="checkbox"
                        checked={form.featured}
                        onChange={updateField}
                        className="rounded accent-bitcoin h-4 w-4 border-white/10"
                      />
                      <span>Feature</span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer text-zinc-300">
                      <input
                        name="archived"
                        type="checkbox"
                        checked={form.archived}
                        onChange={updateField}
                        className="rounded accent-bitcoin h-4 w-4 border-white/10"
                      />
                      <span>Archive</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* 3. Upgraded Metadata */}
              <div className="mb-6 space-y-4 rounded border border-white/[0.05] bg-black/15 p-4">
                <h3 className="text-zinc-400 font-semibold tracking-wider uppercase flex items-center gap-1.5 font-sans"><CheckCircle size={13} /> 3. Campaign Metadata</h3>
                
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <label className="block">
                    <span className="mb-2 block text-zinc-400">Ecosystem Label</span>
                    <input
                      name="ecosystem"
                      value={form.ecosystem}
                      onChange={updateField}
                      placeholder="Bitcoin, Solana, Cosmos"
                      className="w-full rounded border border-white/10 bg-black/40 px-3 py-2 text-white outline-none focus:border-bitcoin/50"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-zinc-400">Mainnet Chain Network</span>
                    <input
                      name="chain"
                      value={form.chain}
                      onChange={updateField}
                      placeholder="Ethereum, Arbitrum, Sui"
                      className="w-full rounded border border-white/10 bg-black/40 px-3 py-2 text-white outline-none focus:border-bitcoin/50"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-zinc-400">Task Type Protocol</span>
                    <input
                      name="taskType"
                      value={form.taskType}
                      onChange={updateField}
                      placeholder="Quests, Bridge, Node Run"
                      className="w-full rounded border border-white/10 bg-black/40 px-3 py-2 text-white outline-none focus:border-bitcoin/50"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <label className="block">
                    <span className="mb-2 block text-zinc-400">Complexity Difficulty</span>
                    <select
                      name="difficulty"
                      value={form.difficulty}
                      onChange={updateField}
                      className="w-full rounded border border-white/10 bg-black/40 px-2 py-2 text-white outline-none focus:border-bitcoin/50"
                    >
                      <option value="easy">easy</option>
                      <option value="medium">medium</option>
                      <option value="hard">hard</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-zinc-400">Capital Loss Risk</span>
                    <select
                      name="riskLevel"
                      value={form.riskLevel}
                      onChange={updateField}
                      className="w-full rounded border border-white/10 bg-black/40 px-2 py-2 text-white outline-none focus:border-bitcoin/50"
                    >
                      <option value="low">low</option>
                      <option value="medium">medium</option>
                      <option value="high">high</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-zinc-400">Last Verified Check</span>
                    <input
                      name="lastCheckedAt"
                      type="date"
                      value={form.lastCheckedAt}
                      onChange={updateField}
                      className="w-full rounded border border-white/10 bg-black/40 px-2 py-2 text-white outline-none focus:border-bitcoin/50"
                    />
                  </label>
                </div>
              </div>

              {/* 4. Hyperlinks */}
              <div className="mb-6 space-y-4 rounded border border-white/[0.05] bg-black/15 p-4">
                <h3 className="text-zinc-400 font-semibold tracking-wider uppercase flex items-center gap-1.5 font-sans"><ExternalLink size={13} /> 4. Official Links</h3>
                
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {[
                    ['websiteUrl', 'Website URL', 'https://saturn.xyz'],
                    ['officialXUrl', 'Official X (Twitter) URL', 'https://x.com/saturn_xyz'],
                    ['discordUrl', 'Discord Invite URL', 'https://discord.gg/saturn'],
                    ['telegramUrl', 'Telegram Announcement URL', 'https://t.me/saturn_news'],
                    ['docsUrl', 'Documentation Gitbook URL', 'https://docs.saturn.xyz'],
                    ['appUrl', 'Decentralized App Launch URL', 'https://app.saturn.xyz']
                  ].map(([name, label, placeholder]) => (
                    <label key={name} className="block">
                      <span className="mb-1.5 block text-zinc-400">{label}</span>
                      <input
                        name={name}
                        value={form[name as keyof FormState] as string}
                        onChange={updateField}
                        placeholder={placeholder}
                        className="w-full rounded border border-white/10 bg-black/40 px-3 py-2 text-white outline-none focus:border-bitcoin/50"
                      />
                      {fieldErrors[name] && <span className="mt-1 block text-[10px] text-red-400">{fieldErrors[name]}</span>}
                    </label>
                  ))}
                </div>
              </div>

              {/* 5. Notes */}
              <div className="mb-6 space-y-4 rounded border border-white/[0.05] bg-black/15 p-4">
                <h3 className="text-zinc-400 font-semibold tracking-wider uppercase flex items-center gap-1.5 font-sans"><Flame size={13} /> 5. Ops Notes</h3>
                
                <div className="grid grid-cols-1 gap-4">
                  <label className="block">
                    <span className="mb-2 block text-zinc-400">Public Tasks & Checklist Notes</span>
                    <textarea
                      name="notes"
                      value={form.notes}
                      onChange={updateField}
                      rows={4}
                      placeholder="Use detailed notes or list checkpoints..."
                      className="w-full rounded border border-white/10 bg-black/40 px-3 py-2 text-white outline-none focus:border-bitcoin/50 font-mono"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-zinc-400">Admin Only Private Notes (Never shared via Public API)</span>
                    <textarea
                      name="adminNotes"
                      value={form.adminNotes}
                      onChange={updateField}
                      rows={2}
                      placeholder="Operator logs, API keys checklist, tracking comments..."
                      className="w-full rounded border border-white/10 bg-black/40 px-3 py-2 text-white outline-none focus:border-bitcoin/50 font-mono"
                    />
                  </label>
                </div>
              </div>

              {/* 6. Logo Storage */}
              <div className="mb-6 rounded border border-white/[0.08] bg-black/18 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="text-zinc-400 font-semibold uppercase tracking-wider font-sans">Logo Media Upload</span>
                  {(logoPreview || form.logoUrl) ? (
                    <button type="button" onClick={removeLogo} className="text-xs text-red-400 transition hover:text-red-300">Remove Media</button>
                  ) : null}
                </div>
                <div className="flex items-start gap-3">
                  {logoPreview || form.logoUrl ? (
                    <ProjectLogo logoUrl={logoPreview || form.logoUrl} name={form.name} size="xl" priority />
                  ) : (
                    <div className="grid h-16 w-16 shrink-0 place-items-center rounded border border-white/10 bg-white/[0.035]">
                      <ImageIcon size={20} className="text-zinc-600" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded border border-white/10 bg-black/40 px-3 py-2 text-xs text-zinc-200 transition hover:border-bitcoin/40 hover:text-bitcoin">
                      <Upload size={13} />
                      Choose logo file
                      <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogoFile} className="sr-only" />
                    </label>
                    
                    {(logoFile || logoSourceUrl || form.logoUrl) ? (
                      <button
                        type="button"
                        onClick={() => setLogoCropOpen(true)}
                        className="ml-2 inline-flex rounded border border-white/10 bg-black/40 px-3 py-2 text-xs text-zinc-300 transition hover:border-bitcoin/40 hover:text-bitcoin"
                      >
                        Adjust crop
                      </button>
                    ) : null}
                    <p className="mt-2 text-[10px] leading-relaxed text-zinc-500">Source image gets compressed & cropped as 160x160 webp in server uploads.</p>
                    {logoError ? <p className="mt-2 text-xs text-red-400 font-mono">{logoError}</p> : null}
                  </div>
                </div>
              </div>

              <LogoCropModal />

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-bitcoin px-5 py-3.5 text-sm font-semibold text-black transition hover:bg-ember disabled:cursor-not-allowed disabled:opacity-60 font-sans shadow-lg hover:shadow-bitcoin/10"
                >
                  {editingId ? <Save size={16} /> : <Plus size={16} />}
                  {saving ? (logoDirty ? 'Processing Logo...' : 'Saving logs...') : editingId ? 'Save Changes' : 'Register Project'}
                </button>
                {isFormDirty && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-full border border-white/10 px-5 py-3.5 text-sm font-semibold text-zinc-300 hover:bg-white/5 font-sans"
                  >
                    Reset
                  </button>
                )}
              </div>
            </form>

            <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
              <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-zinc-500">Realtime live Preview</p>
              <ProjectCard project={preview as any} />
            </div>
          </div>

          {/* Project List / Actions Section */}
          <section className="rounded-lg border border-white/[0.08] bg-white/[0.035] p-5">
            <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold">Registered Feeds</h2>
                <span className="text-xs text-zinc-500 font-mono">{projects.length} campaigns logged</span>
              </div>
              
              {/* Internal Search input */}
              <div className="relative font-mono text-xs">
                <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  value={adminSearch}
                  onChange={(e) => setAdminSearch(e.target.value)}
                  placeholder="Filter by name..."
                  className="w-full rounded border border-white/10 bg-black/45 py-1.5 pl-8 pr-3 text-xs outline-none focus:border-bitcoin/50"
                />
              </div>
            </div>

            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-24 animate-pulse rounded border border-white/[0.06] bg-white/[0.02]" />
                ))}
              </div>
            ) : processedProjects.length === 0 ? (
              <div className="rounded border border-white/[0.08] p-8 text-center text-sm text-zinc-500 font-mono">No campaigns matched your search filter.</div>
            ) : (
              <div className="space-y-3">
                {processedProjects.map((project) => (
                  <article key={project.id} className="flex flex-col gap-3 rounded border border-white/[0.07] bg-black/25 p-4 transition hover:bg-black/35">
                    <div className="flex min-w-0 flex-1 items-start gap-4">
                      <ProjectLogo project={project} size="lg" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate font-semibold text-white">{project.name}</h3>
                          <span className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] uppercase tracking-[0.1em] text-zinc-400 font-mono">{project.category}</span>
                          {project.featured && <span className="text-[8px] bg-bitcoin/10 text-bitcoin border border-bitcoin/20 px-1.5 rounded font-mono">featured</span>}
                          {!project.published && <span className="text-[8px] bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 rounded font-mono">unpublished</span>}
                          {project.archived && <span className="text-[8px] bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 px-1.5 rounded font-mono">archived</span>}
                        </div>
                        <p className="line-clamp-2 mt-1 text-xs text-zinc-400 font-sans leading-relaxed">{project.bio}</p>
                        
                        {/* Technical properties */}
                        <div className="mt-2 flex flex-wrap gap-1.5 text-[9px] font-mono text-zinc-500">
                          {project.ecosystem && <span>Eco: {project.ecosystem}</span>}
                          {project.chain && <span>• Chain: {project.chain}</span>}
                          <span>• Priority: {project.priority}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions Panel */}
                    <div className="flex flex-wrap items-center justify-between border-t border-white/[0.05] pt-3 gap-2">
                      {/* Left togglers */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => toggleStatus(project, 'published')}
                          className={`rounded border px-2.5 py-1 text-[9px] font-mono uppercase tracking-wider transition ${project.published ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : 'border-zinc-500/20 bg-zinc-500/10 text-zinc-400 hover:border-emerald-500/35 hover:text-emerald-300'}`}
                          title={project.published ? 'Click to Unpublish' : 'Click to Publish'}
                        >
                          {project.published ? 'Published' : 'Draft'}
                        </button>
                        <button
                          onClick={() => toggleStatus(project, 'featured')}
                          className={`rounded border px-2.5 py-1 text-[9px] font-mono uppercase tracking-wider transition ${project.featured ? 'border-bitcoin/20 bg-bitcoin/10 text-bitcoin' : 'border-zinc-500/20 bg-zinc-500/10 text-zinc-400 hover:border-bitcoin/35 hover:text-bitcoin'}`}
                          title={project.featured ? 'Remove from Featured' : 'Mark as Featured'}
                        >
                          {project.featured ? 'Featured' : 'Standard'}
                        </button>
                        <button
                          onClick={() => toggleStatus(project, 'archived')}
                          className={`rounded border px-2.5 py-1 text-[9px] font-mono uppercase tracking-wider transition ${project.archived ? 'border-zinc-400/20 bg-zinc-400/10 text-zinc-200' : 'border-zinc-500/20 bg-zinc-500/10 text-zinc-400 hover:border-zinc-400/35 hover:text-zinc-200'}`}
                          title={project.archived ? 'Unarchive project' : 'Archive project'}
                        >
                          {project.archived ? 'Archived' : 'Active'}
                        </button>
                      </div>

                      {/* Right buttons */}
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleDuplicate(project)}
                          className="grid h-8 w-8 place-items-center rounded border border-white/10 text-zinc-400 transition hover:border-bitcoin/40 hover:text-bitcoin"
                          title="Duplicate record"
                          aria-label="Duplicate"
                        >
                          <Copy size={13} />
                        </button>
                        <button
                          onClick={() => startEdit(project)}
                          className="grid h-8 w-8 place-items-center rounded border border-white/10 text-zinc-400 transition hover:border-bitcoin/40 hover:text-bitcoin"
                          title="Edit record"
                          aria-label="Edit"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(project.id)}
                          className="grid h-8 w-8 place-items-center rounded border border-white/10 text-zinc-400 transition hover:border-red-400/40 hover:text-red-300"
                          title="Delete record"
                          aria-label="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
