# killerwhaleslabs Production Checklist

This checklist is for launching killerwhaleslabs on a real domain.

## 1. Server Baseline

- Use Node.js 18+.
- Install dependencies with `npm ci`.
- Build frontend with `npm run build`.
- Keep `.env` private and out of Git.
- Keep SQLite database files private and backed up.
- Use `LOGO_STORAGE_PROVIDER=r2` for production logo storage when possible.

## 2. Required Environment

Minimum production values:

```dotenv
NODE_ENV=production
PORT=4000
SESSION_SECRET=replace-with-a-long-random-secret-min-32-chars
ADMIN_USERNAME=operator
ADMIN_PASSWORD=replace-with-a-strong-password
CLIENT_ORIGIN=https://yourdomain.com
```

The API refuses to start in production if `SESSION_SECRET` or `CLIENT_ORIGIN` is missing.

Do not use insecure defaults:

```dotenv
SESSION_SECRET=dev-session-secret-change-me
ADMIN_PASSWORD=change-this-password
```

## 3. Cloudflare R2

Recommended config:

```dotenv
LOGO_STORAGE_PROVIDER=r2
CLOUDFLARE_R2_ACCOUNT_ID=your-account-id
CLOUDFLARE_R2_ACCESS_KEY_ID=your-r2-access-key-id
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
CLOUDFLARE_R2_BUCKET=project-logos
CLOUDFLARE_R2_PUBLIC_BASE_URL=https://pub-xxxx.r2.dev
CLOUDFLARE_R2_ENDPOINT=
```

Production guidance:

- Scope the R2 API token to the logo bucket only.
- Grant only the object permissions needed for upload/delete.
- Use a public bucket URL or custom domain for logo reads.
- Do not expose R2 access keys in frontend code.

## 4. Build And Seed

```bash
npm ci
npm run build
npm run seed
```

or:

```bash
npm run deploy
```

## 5. PM2

Start:

```bash
npm run start:pm2
```

Check logs:

```bash
npm run logs
```

Stop:

```bash
npm run stop:pm2
```

Config file:

```text
deploy/pm2.config.cjs
```

It runs `server/server.js` in cluster mode as `killerwhaleslabs-api`. The config also sets `max_restarts: 10` and `min_uptime: '10s'` so a crashing process does not restart indefinitely.

## 6. Nginx

Use `deploy/nginx.conf` as the production template.

Before enabling:

- Replace `yourdomain.com` with the real domain.
- Replace certificate paths with real Let's Encrypt paths.
- Copy `dist/` to `/var/www/killerwhaleslabs/dist` or adjust `root`.
- Make sure API is listening on `127.0.0.1:4000`.
- Keep the SSE location `/api/market/stream` buffering disabled.
- **CRITICAL**: Verify Nginx is configured with SPA routing fallback using `try_files $uri $uri/ /index.html`. This ensures deep React Router paths like `/airdrops/:slug` load correctly on direct page refreshes.

Typical install flow:

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/killerwhaleslabs.conf
sudo ln -s /etc/nginx/sites-available/killerwhaleslabs.conf /etc/nginx/sites-enabled/killerwhaleslabs.conf
sudo nginx -t
sudo systemctl reload nginx
```

Adjust paths for your server layout.

## 7. Domain And TLS

- Point DNS A/AAAA records to the server or CDN.
- Issue TLS certificate with Let's Encrypt or your provider.
- Set `CLIENT_ORIGIN=https://yourdomain.com` exactly, with no trailing slash.
- If using `www`, decide whether it redirects or is also allowed by frontend/API architecture.

## 8. Security Checks

The admin frontend should only be reachable at `/lab-console`. Do not expose `/admin` or `/admin/login` frontend aliases in production builds.

Run before launch:

```bash
npm audit --omit=dev
npm run build
```

Current dependency note:

- A full `npm audit` reports two moderate findings in the development build chain, from `vite` through `esbuild`.
- `npm audit fix --force` would upgrade Vite across a major version, so do not apply it directly in production without testing the frontend build and dev workflow.
- `npm audit --omit=dev` is the required production gate because Vite/esbuild are not needed by the running API after `dist/` is built.

Manual API checks:

```bash
curl -i https://yourdomain.com/api/health
curl -i https://yourdomain.com/api/projects
curl -i https://yourdomain.com/api/projects/saturn-protocol
curl -i --max-time 2 https://yourdomain.com/api/market/stream
```

Expected headers:

- `Content-Security-Policy`
- `Strict-Transport-Security`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- cache headers on public GET routes
- `Content-Type: text/event-stream` on `/api/market/stream`

Local smoke check before deployment:

```bash
npm run build
npm run start
curl -i http://localhost:4000/api/health
```

Stop the local API process before starting PM2 so port `4000` is free.

## 9. Admin Password Operations

To rotate the admin password without deleting database rows, set `ADMIN_USERNAME` and the new `ADMIN_PASSWORD` in the environment, then run:

```bash
npm run admin:reset-password
```

The script hashes the new password with the same app utility and updates the matching admin user. It exits with an error if the username is not found.

## 10. Scaling Plan

For large traffic, use a CDN/WAF in front of the app.

Recommended request path:

```text
User -> CDN/WAF -> Nginx -> PM2/Node API -> SQLite/R2/external market APIs
```

Keep most traffic off the API by caching:

- static frontend assets
- R2 logo objects
- `/api/projects`
- `/api/market/*` public snapshot routes

Use SSE for market snapshots so each tab does not independently poll every feed. The backend runs one shared interval per process and broadcasts to connected clients. The active SSE client count is per worker in PM2 cluster mode, so the 500-client cap applies per worker rather than globally. Each SSE connection also has a 10-minute zombie-client timeout for connections that stop consuming market events.

Expired rows in `revoked_sessions` are cleaned at API startup and every 6 hours while the server is running.

## 11. Backup And Recovery

Back up:

- SQLite database file
- `.env` secret values in a secure secret manager
- R2 bucket contents if required by business policy
- Nginx and PM2 config after domain-specific edits

SQLite files can include WAL sidecar files. Back up consistently while the app is stopped or with a SQLite-aware backup approach.

## 12. Release Checklist

- `.env` has production values.
- `NODE_ENV=production` is set.
- `CLIENT_ORIGIN` matches the live domain exactly.
- Admin password is strong.
- Admin password reset was tested with `npm run admin:reset-password` if credentials were rotated.
- R2 credentials are scoped and private.
- `npm audit --omit=dev` passes.
- `npm run build` passes.
- PM2 process starts cleanly.
- Nginx config validates with `nginx -t`.
- HTTPS works.
- `/api/health` returns 200.
- `/api/projects` returns data and cache headers.
- `/api/market/stream` streams an SSE event.
- Admin login works over HTTPS.
- Logo upload works and new logo URL points to expected storage provider.
