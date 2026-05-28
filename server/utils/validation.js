import { httpError } from './errors.js';

function optionalUrl(value, fieldName) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') throw httpError(400, `${fieldName} must be a URL`);
  if (value.length > 500) throw httpError(400, `${fieldName} must stay under 500 characters`);

  try {
    const url = new URL(value.trim());
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Invalid protocol');
    return url.toString();
  } catch {
    throw httpError(400, `${fieldName} must be a valid http or https URL`);
  }
}

function optionalLogo(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') throw httpError(400, 'Logo must be a URL');
  if (value.length > 500) throw httpError(400, 'Logo URL must stay under 500 characters');

  const trimmed = value.trim();
  if (/^\/uploads\/logos\/[A-Za-z0-9.-]+\.(?:png|jpe?g|webp)$/.test(trimmed)) return trimmed;
  return optionalUrl(trimmed, 'Logo URL');
}

function optionalNumber(value, fallback, min, max) {
  const number = Number(value ?? fallback);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function validateProject(body) {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const bio = typeof body.bio === 'string' ? body.bio.trim() : '';
  const category = typeof body.category === 'string' ? body.category.trim() : 'Airdrop';
  const status = typeof body.status === 'string' ? body.status.trim() : 'active';
  const logoCropMode = body.logoCropMode === 'fit' ? 'fit' : 'cover';
  const allowedStatuses = new Set(['active', 'watching', 'paused']);

  if (!name) throw httpError(400, 'Project name is required');
  if (name.length > 80) throw httpError(400, 'Project name is too long');
  
  let slug = typeof body.slug === 'string' ? body.slug.trim().toLowerCase() : '';
  if (!slug) {
    slug = slugify(name);
  } else {
    if (!/^[a-z0-9-]+$/.test(slug)) {
      throw httpError(400, 'Slug must contain only lowercase letters, numbers, and hyphens');
    }
  }
  if (!slug) throw httpError(400, 'Project slug must contain at least one alphanumeric character');
  if (slug.length > 100) throw httpError(400, 'Project slug is too long');

  if (!bio) throw httpError(400, 'Project bio is required');
  if (bio.length > 220) throw httpError(400, 'Project bio is too long');
  if (!category) throw httpError(400, 'Project category is required');
  if (category.length > 36) throw httpError(400, 'Project category is too long');
  if (!allowedStatuses.has(status)) throw httpError(400, 'Project status is invalid');

  // Text fields with defaults/safe limits
  const shortDescription = typeof body.shortDescription === 'string' ? body.shortDescription.trim() : bio;
  const ecosystem = typeof body.ecosystem === 'string' ? body.ecosystem.trim() : '';
  const chain = typeof body.chain === 'string' ? body.chain.trim() : '';
  const taskType = typeof body.taskType === 'string' ? body.taskType.trim() : '';
  const difficulty = typeof body.difficulty === 'string' ? body.difficulty.trim() : '';
  const riskLevel = typeof body.riskLevel === 'string' ? body.riskLevel.trim() : '';
  
  const priority = optionalNumber(body.priority, 0, 0, 1000000);
  const featured = Boolean(body.featured);
  const published = body.published !== undefined ? Boolean(body.published) : true;
  const archived = Boolean(body.archived);

  const notes = typeof body.notes === 'string' ? body.notes.trim() : '';
  const adminNotes = typeof body.adminNotes === 'string' ? body.adminNotes.trim() : '';
  
  let lastCheckedAt = null;
  if (body.lastCheckedAt) {
    try {
      const d = new Date(body.lastCheckedAt);
      if (!isNaN(d.getTime())) {
        lastCheckedAt = d.toISOString();
      }
    } catch {
      // Ignore invalid date formatting, keep as null
    }
  }

  return {
    name,
    slug,
    bio,
    category,
    status,
    logoUrl: optionalLogo(body.logoUrl),
    logoSourceUrl: optionalLogo(body.logoSourceUrl),
    logoCropMode,
    logoCropX: optionalNumber(body.logoCropX, 0, -160, 160),
    logoCropY: optionalNumber(body.logoCropY, 0, -160, 160),
    logoCropZoom: optionalNumber(body.logoCropZoom, 1, 1, 2.5),
    websiteUrl: optionalUrl(body.websiteUrl, 'Website URL'),
    shortDescription,
    ecosystem,
    chain,
    taskType,
    difficulty,
    riskLevel,
    priority,
    featured,
    published,
    archived,
    officialXUrl: optionalUrl(body.officialXUrl, 'Official X URL'),
    discordUrl: optionalUrl(body.discordUrl, 'Discord URL'),
    telegramUrl: optionalUrl(body.telegramUrl, 'Telegram URL'),
    docsUrl: optionalUrl(body.docsUrl, 'Docs URL'),
    appUrl: optionalUrl(body.appUrl, 'App URL'),
    notes,
    adminNotes,
    lastCheckedAt
  };
}

export function validateLogin(body) {
  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!username || !password) throw httpError(400, 'Username and password are required');
  if (username.length > 80 || password.length > 200) throw httpError(400, 'Invalid credentials');

  return { username, password };
}
