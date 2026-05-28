import { db } from '../db/connection.js';

function mapProject(row, isAdmin = false) {
  if (!row) return null;
  const project = {
    id: row.id,
    name: row.name,
    slug: row.slug,
    bio: row.bio,
    category: row.category,
    status: row.status,
    logoUrl: row.logo_url,
    logoSourceUrl: row.logo_source_url,
    logoCropMode: row.logo_crop_mode || 'cover',
    logoCropX: Number(row.logo_crop_x || 0),
    logoCropY: Number(row.logo_crop_y || 0),
    logoCropZoom: Number(row.logo_crop_zoom || 1),
    websiteUrl: row.website_url,
    shortDescription: row.short_description || row.bio || '',
    ecosystem: row.ecosystem || '',
    chain: row.chain || '',
    taskType: row.task_type || '',
    difficulty: row.difficulty || '',
    riskLevel: row.risk_level || '',
    priority: Number(row.priority || 0),
    featured: Boolean(row.featured),
    published: Boolean(row.published),
    archived: Boolean(row.archived),
    officialXUrl: row.official_x_url || '',
    discordUrl: row.discord_url || '',
    telegramUrl: row.telegram_url || '',
    docsUrl: row.docs_url || '',
    appUrl: row.app_url || '',
    notes: row.notes || '',
    lastCheckedAt: row.last_checked_at || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };

  if (isAdmin) {
    project.adminNotes = row.admin_notes || '';
  }

  return project;
}

export function listProjects({ isAdmin = false } = {}) {
  let query = 'SELECT * FROM projects';
  if (!isAdmin) {
    query += ' WHERE published = 1 AND archived = 0';
  }
  query += ' ORDER BY priority DESC, updated_at DESC, created_at DESC, id DESC';

  return db
    .prepare(query)
    .all()
    .map((row) => mapProject(row, isAdmin));
}

export function getProjectById(id, { isAdmin = false } = {}) {
  const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
  return row ? mapProject(row, isAdmin) : null;
}

export function getProjectBySlug(slug, { isAdmin = false } = {}) {
  let query = 'SELECT * FROM projects WHERE slug = ?';
  if (!isAdmin) {
    query += ' AND published = 1 AND archived = 0';
  }
  const row = db.prepare(query).get(slug);
  return row ? mapProject(row, isAdmin) : null;
}

export function createProjectRecord(project) {
  const result = db
    .prepare(
      `INSERT INTO projects (
        name, slug, bio, category, status, logo_url, logo_source_url, logo_crop_mode, logo_crop_x, logo_crop_y, logo_crop_zoom, website_url,
        short_description, ecosystem, chain, task_type, difficulty, risk_level, priority, featured, published, archived,
        official_x_url, discord_url, telegram_url, docs_url, app_url, notes, admin_notes, last_checked_at
      )
      VALUES (
        @name, @slug, @bio, @category, @status, @logoUrl, @logoSourceUrl, @logoCropMode, @logoCropX, @logoCropY, @logoCropZoom, @websiteUrl,
        @shortDescription, @ecosystem, @chain, @taskType, @difficulty, @riskLevel, @priority, @featured, @published, @archived,
        @officialXUrl, @discordUrl, @telegramUrl, @docsUrl, @appUrl, @notes, @adminNotes, @lastCheckedAt
      )`
    )
    .run({
      ...project,
      featured: project.featured ? 1 : 0,
      published: project.published ? 1 : 0,
      archived: project.archived ? 1 : 0
    });

  return getProjectById(result.lastInsertRowid, { isAdmin: true });
}

export function updateProjectRecord(id, project) {
  const result = db
    .prepare(
      `UPDATE projects
       SET name = @name, slug = @slug, bio = @bio, category = @category, status = @status, logo_url = @logoUrl, logo_source_url = @logoSourceUrl, 
           logo_crop_mode = @logoCropMode, logo_crop_x = @logoCropX, logo_crop_y = @logoCropY, logo_crop_zoom = @logoCropZoom, website_url = @websiteUrl,
           short_description = @shortDescription, ecosystem = @ecosystem, chain = @chain, task_type = @taskType, difficulty = @difficulty, 
           risk_level = @riskLevel, priority = @priority, featured = @featured, published = @published, archived = @archived,
           official_x_url = @officialXUrl, discord_url = @discordUrl, telegram_url = @telegramUrl, docs_url = @docsUrl, app_url = @appUrl,
           notes = @notes, admin_notes = @adminNotes, last_checked_at = @lastCheckedAt, updated_at = CURRENT_TIMESTAMP
       WHERE id = @id`
    )
    .run({
      ...project,
      id,
      featured: project.featured ? 1 : 0,
      published: project.published ? 1 : 0,
      archived: project.archived ? 1 : 0
    });

  return result.changes ? getProjectById(id, { isAdmin: true }) : null;
}

export function countProjectsUsingLogo(logoUrl) {
  if (!logoUrl) return 0;
  return db.prepare('SELECT COUNT(*) as count FROM projects WHERE logo_url = ? OR logo_source_url = ?').get(logoUrl, logoUrl).count;
}

export function deleteProjectRecord(id) {
  const result = db.prepare('DELETE FROM projects WHERE id = ?').run(id);
  return result.changes > 0;
}
