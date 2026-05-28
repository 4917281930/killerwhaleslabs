import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { httpError } from '../utils/errors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadRoot = path.resolve(__dirname, '../uploads/logos');
const maxLogoBytes = 420 * 1024;
const mimeExtensions = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp'
};
function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw httpError(500, name + ' is not configured');
  return value;
}

function sha256(value, encoding = 'hex') {
  return crypto.createHash('sha256').update(value).digest(encoding);
}

function hmac(key, value, encoding) {
  return crypto.createHmac('sha256', key).update(value).digest(encoding);
}

function encodePathPart(value) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) => '%' + char.charCodeAt(0).toString(16).toUpperCase());
}

function encodeObjectPath(value) {
  return String(value).split('/').map(encodePathPart).join('/');
}

function toAmzDate(date = new Date()) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, '');
}

function signR2Request({ method, endpoint, bucket, objectPath, headers, body }) {
  const url = new URL(endpoint);
  const amzDate = toAmzDate();
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256(body);
  const canonicalUri = '/' + encodePathPart(bucket) + '/' + encodeObjectPath(objectPath);
  const credentialScope = dateStamp + '/auto/s3/aws4_request';
  const accessKeyId = requireEnv('CLOUDFLARE_R2_ACCESS_KEY_ID');
  const secretAccessKey = requireEnv('CLOUDFLARE_R2_SECRET_ACCESS_KEY');

  const signedHeaderValues = {
    ...headers,
    host: url.host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate
  };
  const sortedHeaderNames = Object.keys(signedHeaderValues).map((name) => name.toLowerCase()).sort();
  const canonicalHeaders = sortedHeaderNames
    .map((name) => name + ':' + String(signedHeaderValues[name]).trim().replace(/\s+/g, ' ') + '\n')
    .join('');
  const signedHeaders = sortedHeaderNames.join(';');
  const canonicalRequest = [
    method,
    canonicalUri,
    '',
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join('\n');
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256(canonicalRequest)
  ].join('\n');
  const dateKey = hmac('AWS4' + secretAccessKey, dateStamp);
  const dateRegionKey = hmac(dateKey, 'auto');
  const dateRegionServiceKey = hmac(dateRegionKey, 's3');
  const signingKey = hmac(dateRegionServiceKey, 'aws4_request');
  const signature = hmac(signingKey, stringToSign, 'hex');

  return {
    url: url.origin + canonicalUri,
    headers: {
      ...signedHeaderValues,
      authorization: 'AWS4-HMAC-SHA256 Credential=' + accessKeyId + '/' + credentialScope + ', SignedHeaders=' + signedHeaders + ', Signature=' + signature
    }
  };
}


export function slugifyFilePart(value = 'project-logo') {
  const slug = String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return slug || 'project-logo';
}

export async function parseLogoDataUrl(value) {
  if (typeof value !== 'string') throw httpError(400, 'Logo image is required');

  const match = value.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw httpError(400, 'Logo must be a PNG, JPEG, or WebP image');

  const mime = match[1];
  const buffer = Buffer.from(match[2], 'base64');
  if (!buffer.length || buffer.length > maxLogoBytes) throw httpError(400, 'Logo file is too large');

  try {
    const image = sharp(buffer, { failOn: 'error' });
    const metadata = await image.metadata();
    if (!metadata.width || !metadata.height || metadata.width > 2048 || metadata.height > 2048) {
      throw httpError(400, 'Logo dimensions are too large (max 2048x2048 pixels)');
    }

    const expectedFormat = mime === 'image/jpeg' ? 'jpeg' : mimeExtensions[mime];
    if (metadata.format !== expectedFormat) throw new Error('Mismatched image format');

    const sanitizedBuffer = await image.toFormat(expectedFormat).toBuffer();
    return { buffer: sanitizedBuffer, mime, extension: mimeExtensions[mime] };
  } catch (err) {
    if (err.status) throw err;
    throw httpError(400, 'Invalid or corrupt image file');
  }
}

function buildLogoFilename(projectName, extension) {
  return `${slugifyFilePart(projectName)}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${extension}`;
}

function getR2Config() {
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID?.trim();
  const endpoint = (process.env.CLOUDFLARE_R2_ENDPOINT || (accountId ? 'https://' + accountId + '.r2.cloudflarestorage.com' : '')).trim();
  const bucket = requireEnv('CLOUDFLARE_R2_BUCKET');
  const publicBaseUrl = requireEnv('CLOUDFLARE_R2_PUBLIC_BASE_URL').replace(/\/$/, '');
  if (!endpoint) throw httpError(500, 'CLOUDFLARE_R2_ENDPOINT or CLOUDFLARE_R2_ACCOUNT_ID is not configured');
  return { endpoint, bucket, publicBaseUrl };
}


async function saveLocalLogo({ buffer, extension, projectName }) {
  await fs.mkdir(uploadRoot, { recursive: true });
  const filename = buildLogoFilename(projectName, extension);
  await fs.writeFile(path.join(uploadRoot, filename), buffer, { flag: 'wx' });
  return { logoUrl: `/uploads/logos/${filename}`, storageProvider: 'local' };
}

async function saveSupabaseLogo({ buffer, mime, extension, projectName }) {
  const url = process.env.SUPABASE_URL;
  const bucket = process.env.SUPABASE_LOGO_BUCKET || 'project-logos';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw httpError(500, 'Supabase logo storage is not configured');

  const filename = buildLogoFilename(projectName, extension);
  const objectPath = `logos/${filename}`;
  const endpoint = `${url.replace(/\/$/, '')}/storage/v1/object/${bucket}/${objectPath}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${key}`,
      apikey: key,
      'cache-control': 'public, max-age=31536000, immutable',
      'content-type': mime,
      'x-upsert': 'false'
    },
    body: buffer
  });

  if (!response.ok) throw httpError(502, 'Unable to upload logo to Supabase Storage');

  return {
    logoUrl: `${url.replace(/\/$/, '')}/storage/v1/object/public/${bucket}/${objectPath}`,
    storageProvider: 'supabase'
  };
}


async function saveR2Logo({ buffer, mime, extension, projectName }) {
  const { endpoint, bucket, publicBaseUrl } = getR2Config();

  const filename = buildLogoFilename(projectName, extension);
  const objectPath = 'logos/' + filename;
  const request = signR2Request({
    method: 'PUT',
    endpoint,
    bucket,
    objectPath,
    body: buffer,
    headers: {
      'cache-control': 'public, max-age=31536000, immutable',
      'content-type': mime
    }
  });
  const response = await fetch(request.url, {
    method: 'PUT',
    headers: request.headers,
    body: buffer
  });

  if (!response.ok) throw httpError(502, 'Unable to upload logo to Cloudflare R2');

  return {
    logoUrl: publicBaseUrl + '/' + encodeObjectPath(objectPath),
    storageProvider: 'r2'
  };
}

function getLocalLogoPath(logoUrl) {
  if (typeof logoUrl !== 'string' || !logoUrl.startsWith('/uploads/logos/')) return null;
  const filename = path.basename(logoUrl);
  if (filename !== logoUrl.slice('/uploads/logos/'.length)) return null;
  if (!/^[A-Za-z0-9.-]+\.(?:png|jpe?g|webp)$/.test(filename)) return null;
  return path.join(uploadRoot, filename);
}

function getR2ObjectPath(logoUrl) {
  const { publicBaseUrl } = getR2Config();
  if (typeof logoUrl !== 'string' || !logoUrl.startsWith(publicBaseUrl + '/')) return null;
  const objectPath = logoUrl.slice(publicBaseUrl.length + 1);
  if (!objectPath || objectPath.includes('..')) return null;
  return decodeURIComponent(objectPath);
}

async function deleteLocalLogo(logoUrl) {
  const filePath = getLocalLogoPath(logoUrl);
  if (!filePath) return false;
  await fs.unlink(filePath);
  return true;
}

async function deleteR2Logo(logoUrl) {
  const { endpoint, bucket } = getR2Config();
  const objectPath = getR2ObjectPath(logoUrl);
  if (!objectPath) return false;

  const request = signR2Request({
    method: 'DELETE',
    endpoint,
    bucket,
    objectPath,
    body: Buffer.alloc(0),
    headers: {}
  });
  const response = await fetch(request.url, {
    method: 'DELETE',
    headers: request.headers
  });

  return response.ok || response.status === 404;
}

export async function deleteLogoByUrl(logoUrl) {
  if (!logoUrl) return false;

  try {
    const provider = (process.env.LOGO_STORAGE_PROVIDER || 'local').toLowerCase();
    if (provider === 'r2' || provider === 'cloudflare-r2') return await deleteR2Logo(logoUrl);
    if (provider === 'local') return await deleteLocalLogo(logoUrl);
    return false;
  } catch (error) {
    console.warn('[logo cleanup] Unable to delete logo:', error.message);
    return false;
  }
}

export async function saveLogoDataUrl({ imageData, projectName }) {
  const parsed = await parseLogoDataUrl(imageData);
  return saveLogoBuffer({ ...parsed, projectName });
}

export async function saveLogoBuffer({ buffer, mime, extension, projectName }) {
  const provider = (process.env.LOGO_STORAGE_PROVIDER || 'local').toLowerCase();
  if (provider === 'r2' || provider === 'cloudflare-r2') return saveR2Logo({ buffer, mime, extension, projectName });
  if (provider === 'supabase') return saveSupabaseLogo({ buffer, mime, extension, projectName });
  return saveLocalLogo({ buffer, extension, projectName });
}
