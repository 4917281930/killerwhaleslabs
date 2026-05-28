import { db } from '../db/connection.js';
import { saveLogoBuffer, slugifyFilePart } from '../services/logoStorageService.js';

const columns = db.prepare('PRAGMA table_info(projects)').all().map((column) => column.name);
const blobColumn = columns.find((name) => ['logo_blob', 'logo_data', 'logo_binary'].includes(name));
const mimeColumn = columns.find((name) => ['logo_mime', 'logo_content_type'].includes(name));

if (!blobColumn) {
  console.log('No logo blob column found. Nothing to migrate.');
  process.exit(0);
}

const rows = db.prepare(`SELECT id, name, ${blobColumn} AS logoBlob${mimeColumn ? `, ${mimeColumn} AS logoMime` : ''} FROM projects WHERE ${blobColumn} IS NOT NULL`).all();
const update = db.prepare('UPDATE projects SET logo_url = @logoUrl, updated_at = CURRENT_TIMESTAMP WHERE id = @id');

for (const row of rows) {
  const mime = row.logoMime || 'image/png';
  const extension = mime.includes('webp') ? 'webp' : mime.includes('jpeg') || mime.includes('jpg') ? 'jpg' : 'png';
  const buffer = Buffer.isBuffer(row.logoBlob) ? row.logoBlob : Buffer.from(row.logoBlob);
  const { logoUrl } = await saveLogoBuffer({
    buffer,
    mime,
    extension,
    projectName: slugifyFilePart(row.name)
  });
  update.run({ id: row.id, logoUrl });
  console.log(`Migrated logo for project ${row.id}: ${logoUrl}`);
}

console.log(`Migrated ${rows.length} logo(s). Drop ${blobColumn}${mimeColumn ? ` and ${mimeColumn}` : ''} manually after verifying the result.`);
