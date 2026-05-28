import { db } from './connection.js';
import { seedProjects } from './seedData.js';
import { hashPassword } from '../utils/auth.js';

function tableColumns(table) {
  return db.prepare(`PRAGMA table_info(${table})`).all();
}

function ensureColumn(table, column, definition) {
  const columns = tableColumns(table);
  if (!columns.some((entry) => entry.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

function ensureTimestampColumn(table, column) {
  const columns = tableColumns(table);
  if (!columns.some((entry) => entry.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} TEXT`);
    db.exec(`UPDATE ${table} SET ${column} = CURRENT_TIMESTAMP WHERE ${column} IS NULL`);
  }
}

function seedAdmin() {
  const username = process.env.ADMIN_USERNAME || 'operator';
  const password = process.env.ADMIN_PASSWORD || 'change-this-password';
  const passwordHash = hashPassword(password);

  // To change the admin password, set ADMIN_USERNAME and ADMIN_PASSWORD, then run npm run admin:reset-password.
  db.prepare(
    `INSERT OR IGNORE INTO admins (username, password_hash)
     VALUES (@username, @passwordHash)`
  ).run({ username, passwordHash });
}

function backfillSeedMetadata() {
  const update = db.prepare('UPDATE projects SET category = @category, status = @status WHERE name = @name AND category = @fallback');
  const transaction = db.transaction((projects) => {
    for (const project of projects) {
      update.run({ ...project, fallback: 'Airdrop' });
    }
  });
  transaction(seedProjects);
}

export function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT,
      bio TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'Airdrop',
      status TEXT NOT NULL DEFAULT 'active',
      logo_url TEXT,
      logo_source_url TEXT,
      logo_crop_mode TEXT NOT NULL DEFAULT 'cover',
      logo_crop_x REAL NOT NULL DEFAULT 0,
      logo_crop_y REAL NOT NULL DEFAULT 0,
      logo_crop_zoom REAL NOT NULL DEFAULT 1,
      website_url TEXT,
      short_description TEXT,
      ecosystem TEXT,
      chain TEXT,
      task_type TEXT,
      difficulty TEXT,
      risk_level TEXT,
      priority INTEGER NOT NULL DEFAULT 0,
      featured INTEGER NOT NULL DEFAULT 0,
      published INTEGER NOT NULL DEFAULT 1,
      archived INTEGER NOT NULL DEFAULT 0,
      official_x_url TEXT,
      discord_url TEXT,
      telegram_url TEXT,
      docs_url TEXT,
      app_url TEXT,
      notes TEXT,
      admin_notes TEXT,
      last_checked_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS revoked_sessions (
      token_hash TEXT PRIMARY KEY,
      revoked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TRIGGER IF NOT EXISTS projects_updated_at
    AFTER UPDATE ON projects
    FOR EACH ROW
    BEGIN
      UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
    END;

    CREATE TRIGGER IF NOT EXISTS admins_updated_at
    AFTER UPDATE ON admins
    FOR EACH ROW
    BEGIN
      UPDATE admins SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
    END;
  `);

  db.prepare("DELETE FROM revoked_sessions WHERE revoked_at < datetime('now', '-13 hours')").run();

  ensureColumn('projects', 'category', "TEXT NOT NULL DEFAULT 'Airdrop'");
  ensureColumn('projects', 'status', "TEXT NOT NULL DEFAULT 'active'");
  ensureColumn('projects', 'logo_source_url', 'TEXT');
  ensureColumn('projects', 'logo_crop_mode', "TEXT NOT NULL DEFAULT 'cover'");
  ensureColumn('projects', 'logo_crop_x', 'REAL NOT NULL DEFAULT 0');
  ensureColumn('projects', 'logo_crop_y', 'REAL NOT NULL DEFAULT 0');
  ensureColumn('projects', 'logo_crop_zoom', 'REAL NOT NULL DEFAULT 1');
  
  // New upgraded fields
  ensureColumn('projects', 'slug', 'TEXT');
  ensureColumn('projects', 'short_description', 'TEXT');
  ensureColumn('projects', 'ecosystem', 'TEXT');
  ensureColumn('projects', 'chain', 'TEXT');
  ensureColumn('projects', 'task_type', 'TEXT');
  ensureColumn('projects', 'difficulty', 'TEXT');
  ensureColumn('projects', 'risk_level', 'TEXT');
  ensureColumn('projects', 'priority', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn('projects', 'featured', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn('projects', 'published', 'INTEGER NOT NULL DEFAULT 1');
  ensureColumn('projects', 'archived', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn('projects', 'official_x_url', 'TEXT');
  ensureColumn('projects', 'discord_url', 'TEXT');
  ensureColumn('projects', 'telegram_url', 'TEXT');
  ensureColumn('projects', 'docs_url', 'TEXT');
  ensureColumn('projects', 'app_url', 'TEXT');
  ensureColumn('projects', 'notes', 'TEXT');
  ensureColumn('projects', 'admin_notes', 'TEXT');
  ensureColumn('projects', 'last_checked_at', 'TEXT');

  ensureTimestampColumn('projects', 'created_at');
  ensureTimestampColumn('projects', 'updated_at');

  // Backfill slugs for existing projects
  const rows = db.prepare('SELECT id, name, slug FROM projects').all();
  const slugify = (value) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  
  for (const row of rows) {
    if (!row.slug) {
      let baseSlug = slugify(row.name) || 'project';
      let slug = baseSlug;
      let counter = 1;
      while (true) {
        const existing = db.prepare('SELECT id FROM projects WHERE slug = ? AND id != ?').get(slug, row.id);
        if (!existing) break;
        counter++;
        slug = `${baseSlug}-${counter}`;
      }
      db.prepare('UPDATE projects SET slug = ? WHERE id = ?').run(slug, row.id);
    }
  }

  // Create unique index on slug
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS projects_slug_idx ON projects (slug)');

  const count = db.prepare('SELECT COUNT(*) as count FROM projects').get().count;
  if (count === 0) {
    const insert = db.prepare(`
      INSERT INTO projects (
        name, slug, bio, category, status, logo_url, logo_source_url, logo_crop_mode, logo_crop_x, logo_crop_y, logo_crop_zoom, website_url,
        short_description, ecosystem, chain, task_type, difficulty, risk_level, priority, featured, published, archived,
        official_x_url, discord_url, telegram_url, docs_url, app_url, notes, admin_notes, last_checked_at
      )
      VALUES (
        @name, @slug, @bio, @category, @status, @logoUrl, @logoSourceUrl, @logoCropMode, @logoCropX, @logoCropY, @logoCropZoom, @websiteUrl,
        @shortDescription, @ecosystem, @chain, @taskType, @difficulty, @riskLevel, @priority, @featured, @published, @archived,
        @officialXUrl, @discordUrl, @telegramUrl, @docsUrl, @appUrl, @notes, @adminNotes, @lastCheckedAt
      )
    `);
    const transaction = db.transaction((projects) => {
      const slugs = new Set();
      for (const project of projects) {
        let baseSlug = slugify(project.name) || 'project';
        let slug = baseSlug;
        let counter = 1;
        while (slugs.has(slug)) {
          counter++;
          slug = `${baseSlug}-${counter}`;
        }
        slugs.add(slug);
        
        insert.run({
          name: project.name,
          slug,
          bio: project.bio,
          category: project.category || 'Airdrop',
          status: project.status || 'active',
          logoUrl: project.logoUrl || null,
          logoSourceUrl: project.logoSourceUrl || null,
          logoCropMode: project.logoCropMode || 'cover',
          logoCropX: project.logoCropX || 0,
          logoCropY: project.logoCropY || 0,
          logoCropZoom: project.logoCropZoom || 1,
          websiteUrl: project.websiteUrl || null,
          shortDescription: project.bio || null,
          ecosystem: 'Ethereum',
          chain: 'Ethereum',
          taskType: 'Quests',
          difficulty: 'easy',
          riskLevel: 'low',
          priority: 0,
          featured: 0,
          published: 1,
          archived: 0,
          officialXUrl: null,
          discordUrl: null,
          telegramUrl: null,
          docsUrl: null,
          appUrl: null,
          notes: null,
          adminNotes: null,
          lastCheckedAt: new Date().toISOString()
        });
      }
    });
    transaction(seedProjects);
  }

  backfillSeedMetadata();
  seedAdmin();
}
