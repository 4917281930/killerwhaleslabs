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

  db.prepare(
    `INSERT INTO admins (username, password_hash)
     VALUES (@username, @passwordHash)
     ON CONFLICT(username) DO UPDATE SET
       password_hash = excluded.password_hash,
       updated_at = CURRENT_TIMESTAMP`
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
      bio TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'Airdrop',
      status TEXT NOT NULL DEFAULT 'active',
      logo_url TEXT,
      website_url TEXT,
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

  ensureColumn('projects', 'category', "TEXT NOT NULL DEFAULT 'Airdrop'");
  ensureColumn('projects', 'status', "TEXT NOT NULL DEFAULT 'active'");
  ensureTimestampColumn('projects', 'created_at');
  ensureTimestampColumn('projects', 'updated_at');

  const count = db.prepare('SELECT COUNT(*) as count FROM projects').get().count;
  if (count === 0) {
    const insert = db.prepare(`
      INSERT INTO projects (name, bio, category, status, logo_url, website_url)
      VALUES (@name, @bio, @category, @status, @logoUrl, @websiteUrl)
    `);
    const transaction = db.transaction((projects) => {
      for (const project of projects) insert.run(project);
    });
    transaction(seedProjects);
  }

  backfillSeedMetadata();
  seedAdmin();
}
