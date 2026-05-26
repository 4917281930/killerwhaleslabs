import { httpError } from './errors.js';

function optionalUrl(value, fieldName) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') throw httpError(400, `${fieldName} must be a URL`);

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

  const trimmed = value.trim();
  if (/^\/uploads\/logos\/[A-Za-z0-9.-]+\.(?:png|jpe?g|webp)$/.test(trimmed)) return trimmed;
  return optionalUrl(trimmed, 'Logo URL');
}

export function validateProject(body) {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const bio = typeof body.bio === 'string' ? body.bio.trim() : '';
  const category = typeof body.category === 'string' ? body.category.trim() : 'Airdrop';
  const status = typeof body.status === 'string' ? body.status.trim() : 'active';
  const allowedStatuses = new Set(['active', 'watching', 'paused']);

  if (!name) throw httpError(400, 'Project name is required');
  if (name.length > 80) throw httpError(400, 'Project name is too long');
  if (!bio) throw httpError(400, 'Project bio is required');
  if (bio.length > 220) throw httpError(400, 'Project bio is too long');
  if (!category) throw httpError(400, 'Project category is required');
  if (category.length > 36) throw httpError(400, 'Project category is too long');
  if (!allowedStatuses.has(status)) throw httpError(400, 'Project status is invalid');

  return {
    name,
    bio,
    category,
    status,
    logoUrl: optionalLogo(body.logoUrl),
    websiteUrl: optionalUrl(body.websiteUrl, 'Website URL')
  };
}

export function validateLogin(body) {
  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!username || !password) throw httpError(400, 'Username and password are required');
  if (username.length > 80 || password.length > 200) throw httpError(400, 'Invalid credentials');

  return { username, password };
}
