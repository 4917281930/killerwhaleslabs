import { db } from '../db/connection.js';

function mapProject(row) {
  return {
    id: row.id,
    name: row.name,
    bio: row.bio,
    category: row.category,
    status: row.status,
    logoUrl: row.logo_url,
    websiteUrl: row.website_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function listProjects() {
  return db
    .prepare('SELECT * FROM projects ORDER BY updated_at DESC, created_at DESC, id DESC')
    .all()
    .map(mapProject);
}

export function getProjectById(id) {
  const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
  return row ? mapProject(row) : null;
}

export function createProjectRecord(project) {
  const result = db
    .prepare(
      `INSERT INTO projects (name, bio, category, status, logo_url, website_url)
       VALUES (@name, @bio, @category, @status, @logoUrl, @websiteUrl)`
    )
    .run(project);

  return getProjectById(result.lastInsertRowid);
}

export function updateProjectRecord(id, project) {
  const result = db
    .prepare(
      `UPDATE projects
       SET name = @name, bio = @bio, category = @category, status = @status, logo_url = @logoUrl, website_url = @websiteUrl, updated_at = CURRENT_TIMESTAMP
       WHERE id = @id`
    )
    .run({ ...project, id });

  return result.changes ? getProjectById(id) : null;
}

export function deleteProjectRecord(id) {
  const result = db.prepare('DELETE FROM projects WHERE id = ?').run(id);
  return result.changes > 0;
}
