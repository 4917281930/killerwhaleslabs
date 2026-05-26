import { ExternalLink, ImageIcon, Lock, LogOut, Pencil, Plus, Save, Trash2, Upload, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  createProject,
  deleteProject,
  getAdminMe,
  getProjects,
  loginAdmin,
  logoutAdmin,
  updateProject,
  uploadProjectLogo
} from '../lib/api.js';
import { ProjectCard } from '../components/ProjectCard.jsx';

const emptyForm = {
  name: '',
  bio: '',
  category: 'Airdrop',
  status: 'active',
  logoUrl: '',
  websiteUrl: ''
};

function validate(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = 'Project name is required.';
  if (!form.category.trim()) errors.category = 'Category is required.';
  if (!form.bio.trim()) errors.bio = 'Bio is required.';
  if (form.bio.trim().length > 220) errors.bio = 'Bio should stay under 220 characters.';

  if (form.websiteUrl && !/^https?:\/\/\S+\.\S+/.test(form.websiteUrl)) {
    errors.websiteUrl = 'Use a valid http or https URL.';
  }

  return errors;
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Unable to read logo image'));
    image.src = url;
  });
}

async function renderLogoFile(file, mode, crop = {}) {
  const sourceUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(sourceUrl);
    const size = 160;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#060708';
    ctx.fillRect(0, 0, size, size);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const zoom = Number(crop.zoom) || 1;
    const offsetX = Number(crop.x) || 0;
    const offsetY = Number(crop.y) || 0;
    const baseScale = mode === 'fit' ? Math.min(size / image.width, size / image.height) : Math.max(size / image.width, size / image.height);
    const scale = baseScale * zoom;
    const width = Math.round(image.width * scale);
    const height = Math.round(image.height * scale);
    const x = Math.round((size - width) / 2 + offsetX);
    const y = Math.round((size - height) / 2 + offsetY);
    ctx.drawImage(image, x, y, width, height);

    return canvas.toDataURL('image/webp', 0.86);
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

export function AdminPage() {
  const [admin, setAdmin] = useState(null);
  const [checking, setChecking] = useState(true);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    getAdminMe()
      .then(setAdmin)
      .catch(() => setAdmin(null))
      .finally(() => setChecking(false));
  }, []);

  async function handleLogin(event) {
    event.preventDefault();
    setLoginError('');
    try {
      const data = await loginAdmin(loginForm);
      setAdmin(data);
    } catch (err) {
      setLoginError(err.message || 'Unable to login');
    }
  }

  if (checking) {
    return <div className="grid min-h-screen place-items-center bg-ink text-sm text-zinc-400">checking lab session...</div>;
  }

  if (!admin) {
    return (
      <div className="min-h-screen bg-ink px-4 text-white">
        <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center">
          <a href="/" className="mb-8 text-sm font-semibold tracking-[0.22em] text-white">killerwhaleslabs</a>
          <form onSubmit={handleLogin} className="rounded-lg border border-white/[0.09] bg-white/[0.045] p-6 shadow-card">
            <div className="mb-6">
              <div className="mb-4 grid h-10 w-10 place-items-center rounded-full border border-bitcoin/30 bg-bitcoin/10 text-bitcoin">
                <Lock size={18} />
              </div>
              <p className="text-xs uppercase tracking-[0.24em] text-bitcoin">private lab console</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight">Operator login</h1>
            </div>
            {loginError ? (
              <div className="mb-4 rounded border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-100">{loginError}</div>
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

function Dashboard({ admin, onLogout }) {
  const [projects, setProjects] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [logoSourceUrl, setLogoSourceUrl] = useState('');
  const [logoMode, setLogoMode] = useState('cover');
  const [logoCrop, setLogoCrop] = useState({ zoom: 1, x: 0, y: 0 });
  const logoCropRef = useRef({ zoom: 1, x: 0, y: 0 });
  const logoPreviewRef = useRef(null);
  const dragStateRef = useRef(null);
  const zoomValueRef = useRef(null);
  const logoFrame = useRef(null);
  const [logoError, setLogoError] = useState('');
  const [logoCropOpen, setLogoCropOpen] = useState(false);

  const title = useMemo(() => (editingId ? 'Edit project' : 'Add project'), [editingId]);
  const preview = {
    id: editingId || 'preview',
    ...form,
    logoUrl: logoPreview || form.logoUrl || null,
    websiteUrl: form.websiteUrl || null
  };

  async function loadProjects() {
    setLoading(true);
    try {
      setProjects(await getProjects());
      setError('');
    } catch (err) {
      setError(err.message || 'Unable to load projects');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProjects();
  }, []);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setFieldErrors({});
    setLogoFile(null);
    if (logoSourceUrl) URL.revokeObjectURL(logoSourceUrl);
    setLogoPreview('');
    setLogoSourceUrl('');
    setLogoMode('cover');
    logoCropRef.current = { zoom: 1, x: 0, y: 0 };
    setLogoCrop({ zoom: 1, x: 0, y: 0 });
    setLogoError('');
    setLogoCropOpen(false);
  }

  function startEdit(project) {
    setEditingId(project.id);
    setForm({
      name: project.name,
      bio: project.bio,
      category: project.category || 'Airdrop',
      status: project.status || 'active',
      logoUrl: project.logoUrl || '',
      websiteUrl: project.websiteUrl || ''
    });
    setLogoFile(null);
    if (logoSourceUrl) URL.revokeObjectURL(logoSourceUrl);
    setLogoPreview('');
    setLogoSourceUrl('');
    setLogoMode('cover');
    logoCropRef.current = { zoom: 1, x: 0, y: 0 };
    setLogoCrop({ zoom: 1, x: 0, y: 0 });
    setLogoError('');
    setLogoCropOpen(false);
    setFieldErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleLogoFile(event) {
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
      if (logoSourceUrl) URL.revokeObjectURL(logoSourceUrl);
      const sourceUrl = URL.createObjectURL(file);
      setLogoError('');
      setLogoFile(file);
      setLogoSourceUrl(sourceUrl);
      logoCropRef.current = initialCrop;
      setLogoCrop(initialCrop);
      setLogoPreview(sourceUrl);
      setLogoCropOpen(true);
    } catch (err) {
      setLogoError(err.message || 'Unable to process logo image.');
    }
  }

  function changeLogoMode(nextMode) {
    setLogoMode(nextMode);
    window.requestAnimationFrame(() => previewLogoCrop(logoCropRef.current));
  }

  function removeLogo() {
    setLogoFile(null);
    if (logoSourceUrl) URL.revokeObjectURL(logoSourceUrl);
    setLogoPreview('');
    setLogoSourceUrl('');
    logoCropRef.current = { zoom: 1, x: 0, y: 0 };
    setLogoCrop({ zoom: 1, x: 0, y: 0 });
    setLogoError('');
    setLogoCropOpen(false);
    setForm((current) => ({ ...current, logoUrl: '' }));
  }

  function previewLogoCrop(nextCrop) {
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

  function getPoint(event) {
    const touch = event.touches?.[0] || event.changedTouches?.[0];
    return touch ? { x: touch.clientX, y: touch.clientY } : { x: event.clientX, y: event.clientY };
  }

  function startLogoDrag(event) {
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

  function moveLogoDrag(event) {
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
    const handleMouseMove = (event) => moveLogoDrag(event);
    const handleMouseUp = () => endLogoDrag();
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.touchAction = previousTouchAction;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (logoFrame.current) window.cancelAnimationFrame(logoFrame.current);
    };
  }, [logoCropOpen]);

  async function applyLogoCrop() {
    if (!logoFile) {
      setLogoCropOpen(false);
      return;
    }

    try {
      const finalCrop = logoCropRef.current;
      setLogoCrop(finalCrop);
      setLogoPreview(await renderLogoFile(logoFile, logoMode, finalCrop));
      setLogoCropOpen(false);
    } catch (err) {
      setLogoError(err.message || 'Unable to process logo image.');
    }
  }

  function LogoCropModal() {
    if (!logoCropOpen || !logoFile) return null;

    const positions = [
      ['center', 'Center', { x: 0, y: 0 }],
      ['top', 'Top', { x: 0, y: -48 }],
      ['bottom', 'Bottom', { x: 0, y: 48 }],
      ['left', 'Left', { x: -48, y: 0 }],
      ['right', 'Right', { x: 48, y: 0 }]
    ];

    return (
      <div className="fixed inset-0 z-[80] grid place-items-center overflow-hidden overscroll-contain bg-black/72 px-4 backdrop-blur-sm" role="dialog" aria-modal="true" onWheel={(event) => event.preventDefault()} onTouchMove={(event) => event.preventDefault()}>
        <div className="w-full max-w-md rounded-lg border border-white/[0.1] bg-ink p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-bitcoin">Logo crop</p>
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
                src={logoSourceUrl || logoPreview}
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

          <div className="mt-5 grid grid-cols-2 gap-2 text-xs">
            {[
              ['cover', 'Crop fill'],
              ['fit', 'Fit full']
            ].map(([mode, label]) => (
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

          <label className="mt-4 block">
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
              onKeyUp={commitLogoCrop}
              className="w-full accent-bitcoin"
            />
          </label>

          <div className="mt-4 grid grid-cols-5 gap-2 text-xs">
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

  async function handleSubmit(event) {
    event.preventDefault();
    const errors = validate(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    setSaving(true);
    try {
      let logoUrl = form.logoUrl.trim() || null;
      if (logoFile) {
        const imageData = logoPreview || await renderLogoFile(logoFile, logoMode, logoCrop);
        const uploaded = await uploadProjectLogo(imageData, form.name.trim());
        logoUrl = uploaded.logoUrl;
      }

      const payload = {
        name: form.name.trim(),
        bio: form.bio.trim(),
        category: form.category.trim(),
        status: form.status,
        logoUrl,
        websiteUrl: form.websiteUrl.trim() || null
      };

      if (editingId) await updateProject(editingId, payload);
      else await createProject(payload);

      resetForm();
      await loadProjects();
    } catch (err) {
      setError(err.message || 'Unable to save project');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this project from the public airdrop feed?')) return;
    try {
      await deleteProject(id);
      await loadProjects();
    } catch (err) {
      setError(err.message || 'Unable to delete project');
    }
  }

  async function handleLogout() {
    await logoutAdmin().catch(() => null);
    onLogout();
  }

  return (
    <div className="min-h-screen bg-ink text-white">
      <header className="border-b border-white/[0.06] bg-ink/90">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a href="/" className="text-sm font-semibold tracking-[0.22em]">killerwhaleslabs</a>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-zinc-500 sm:inline">{admin.username}</span>
            <a className="hidden items-center gap-2 text-sm text-zinc-400 hover:text-bitcoin sm:inline-flex" href="/">
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
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-bitcoin">private lab console</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Airdrop intelligence ops</h1>
        </div>

        {error ? (
          <div className="mb-6 rounded-lg border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-100">{error}</div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <div className="space-y-4">
            <form onSubmit={handleSubmit} className="rounded-lg border border-white/[0.08] bg-white/[0.045] p-5 shadow-card">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-xl font-semibold">{title}</h2>
                {editingId ? (
                  <button type="button" onClick={resetForm} className="grid h-9 w-9 place-items-center rounded-full border border-white/10 hover:bg-white/10">
                    <X size={16} />
                  </button>
                ) : null}
              </div>

              {[
                ['name', 'Project name', 'Saturn Protocol'],
                ['category', 'Category', 'Bitcoin L2'],
                ['websiteUrl', 'Website URL', 'https://...']
              ].map(([name, label, placeholder]) => (
                <label key={name} className="mb-4 block">
                  <span className="mb-2 block text-sm text-zinc-300">{label}</span>
                  <input
                    name={name}
                    value={form[name]}
                    onChange={updateField}
                    placeholder={placeholder}
                    className="w-full rounded border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-bitcoin/60"
                  />
                  {fieldErrors[name] ? <span className="mt-2 block text-xs text-red-300">{fieldErrors[name]}</span> : null}
                </label>
              ))}

              <div className="mb-4 rounded border border-white/[0.08] bg-black/18 p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="text-sm text-zinc-300">Logo upload</span>
                  {(logoPreview || form.logoUrl) ? (
                    <button type="button" onClick={removeLogo} className="text-xs text-zinc-500 transition hover:text-red-300">Remove</button>
                  ) : null}
                </div>
                <div className="flex items-start gap-3">
                  <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded border border-white/10 bg-white/[0.035]">
                    {logoPreview || form.logoUrl ? (
                      <img src={logoPreview || form.logoUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <ImageIcon size={20} className="text-zinc-600" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded border border-white/10 px-3 py-2 text-sm text-zinc-200 transition hover:border-bitcoin/40 hover:text-bitcoin">
                      <Upload size={14} />
                      Upload image
                      <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogoFile} className="sr-only" />
                    </label>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      {[
                        ['cover', 'Crop fill'],
                        ['fit', 'Fit full']
                      ].map(([mode, label]) => (
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
                    {logoFile ? (
                      <button
                        type="button"
                        onClick={() => setLogoCropOpen(true)}
                        className="mt-3 inline-flex rounded border border-white/10 px-3 py-2 text-xs font-medium text-zinc-300 transition hover:border-bitcoin/40 hover:text-bitcoin"
                      >
                        Adjust crop
                      </button>
                    ) : null}
                    <p className="mt-2 text-xs leading-5 text-zinc-500">Upload opens a simple crop popup. The final logo is optimized and cached.</p>
                    {logoError ? <p className="mt-2 text-xs text-red-300">{logoError}</p> : null}
                  </div>
                </div>
              </div>

              <label className="mb-4 block">
                <span className="mb-2 block text-sm text-zinc-300">Status</span>
                <select
                  name="status"
                  value={form.status}
                  onChange={updateField}
                  className="w-full rounded border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-bitcoin/60"
                >
                  <option value="active">active</option>
                  <option value="watching">watching</option>
                  <option value="paused">paused</option>
                </select>
              </label>

              <label className="mb-5 block">
                <span className="mb-2 block text-sm text-zinc-300">Bio</span>
                <textarea
                  name="bio"
                  value={form.bio}
                  onChange={updateField}
                  rows="4"
                  placeholder="Short professional crypto bio"
                  className="w-full resize-none rounded border border-white/10 bg-black/20 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-zinc-600 focus:border-bitcoin/60"
                />
                <div className="mt-2 flex justify-between text-xs text-zinc-500">
                  <span>{fieldErrors.bio || 'Concise, useful, no hype.'}</span>
                  <span>{form.bio.length}/220</span>
                </div>
              </label>

              <LogoCropModal />

              <button
                type="submit"
                disabled={saving}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-bitcoin px-5 py-3 text-sm font-semibold text-black transition hover:bg-ember disabled:cursor-not-allowed disabled:opacity-60"
              >
                {editingId ? <Save size={16} /> : <Plus size={16} />}
                {saving ? (logoFile ? 'Uploading logo...' : 'Saving...') : editingId ? 'Save changes' : 'Add project'}
              </button>
            </form>

            <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-4">
              <p className="mb-3 text-xs uppercase tracking-[0.2em] text-zinc-500">Card preview</p>
              <ProjectCard project={preview} />
            </div>
          </div>

          <section className="rounded-lg border border-white/[0.08] bg-white/[0.035] p-5">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Projects</h2>
              <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-400">{projects.length} listed</span>
            </div>

            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-24 animate-pulse rounded border border-white/[0.06] bg-white/[0.04]" />
                ))}
              </div>
            ) : projects.length === 0 ? (
              <div className="rounded border border-white/[0.08] p-8 text-center text-sm text-zinc-400">No projects yet.</div>
            ) : (
              <div className="space-y-3">
                {projects.map((project) => (
                  <article key={project.id} className="flex flex-col gap-4 rounded border border-white/[0.07] bg-black/18 p-4 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 flex-1 items-center gap-4">
                      {project.logoUrl ? (
                        <img src={project.logoUrl} alt="" className="h-12 w-12 rounded object-cover ring-1 ring-white/10" loading="lazy" />
                      ) : (
                        <div className="grid h-12 w-12 place-items-center rounded border border-bitcoin/25 bg-bitcoin/10 font-mono text-sm font-semibold text-bitcoin">
                          {project.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate font-semibold">{project.name}</h3>
                          <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-zinc-500">{project.category}</span>
                        </div>
                        <p className="line-clamp-2 text-sm leading-6 text-zinc-400">{project.bio}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 self-end sm:self-auto">
                      <button
                        onClick={() => startEdit(project)}
                        className="grid h-10 w-10 place-items-center rounded-full border border-white/10 text-zinc-200 transition hover:border-bitcoin/40 hover:text-bitcoin"
                        aria-label={`Edit ${project.name}`}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(project.id)}
                        className="grid h-10 w-10 place-items-center rounded-full border border-white/10 text-zinc-200 transition hover:border-red-400/40 hover:text-red-300"
                        aria-label={`Delete ${project.name}`}
                      >
                        <Trash2 size={16} />
                      </button>
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
