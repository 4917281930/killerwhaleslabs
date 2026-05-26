import { db } from '../db/connection.js';

export function findAdminByUsername(username) {
  return db.prepare('SELECT * FROM admins WHERE username = ?').get(username);
}

export function findAdminById(id) {
  return db.prepare('SELECT id, username, created_at, updated_at FROM admins WHERE id = ?').get(id);
}
