# killerwhaleslabs

Bitcoin-native crypto intelligence website with a React/Vite frontend, Express API, SQLite database, live BTC market modules, curated airdrop pages, admin console, and project logo uploads.

## Stack

- React + Vite
- Tailwind CSS
- Node.js + Express
- SQLite via `better-sqlite3`
- Browser Binance WebSocket for live BTC trades
- Binance, CoinGecko, Etherscan, and Alternative.me market data endpoints
- HttpOnly signed-cookie admin session
- scrypt password hashing
- Local, Supabase, or Cloudflare R2 logo storage

## Source Package

This repository can be distributed as a source archive. The zip should include source code, package manifests, docs, and config examples only.

Excluded runtime/private files:

- `node_modules/`
- `dist/`
- `.env`
- SQLite database files: `*.sqlite`, `*.sqlite-shm`, `*.sqlite-wal`, `*.sqlite-journal`
- local uploaded files under `server/uploads/`
- logs and temporary runtime files
- Git metadata under `.git/`

See `OPEN_SOURCE_RELEASE.md` for the publish checklist.

## Install

```bash
npm install
```

## Environment

Create a local environment file from the template:

```bash
cp .env.example .env
```

Set strong production values before deployment:

```bash
SESSION_SECRET=replace-with-a-long-random-secret
ADMIN_USERNAME=operator
ADMIN_PASSWORD=replace-with-a-strong-password
```

If admin values are omitted, local development uses:

- username: `operator`
- password: `change-this-password`

Do not use the default password in production.

## Logo Storage

By default uploaded project logos are stored locally under `server/uploads/logos` and served from `/uploads/logos/...`.

To store new uploaded logos in Cloudflare R2, create an R2 bucket, enable a public `r2.dev` URL or attach a custom domain, create an R2 API token with object write access, then set:

```bash
LOGO_STORAGE_PROVIDER=r2
CLOUDFLARE_R2_ACCOUNT_ID=your-account-id
CLOUDFLARE_R2_ACCESS_KEY_ID=your-r2-access-key-id
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
CLOUDFLARE_R2_BUCKET=project-logos
CLOUDFLARE_R2_PUBLIC_BASE_URL=https://pub-example.r2.dev
```

`CLOUDFLARE_R2_ENDPOINT` is optional. If omitted, the server uses `https://<account-id>.r2.cloudflarestorage.com`.

Existing local logo URLs stay unchanged. Re-upload project logos or migrate database records if old logos need to move to R2.

## Database

SQLite is initialized automatically on server start.

Manual seed:

```bash
npm run seed
```

Default database path:

```bash
server/db/killerwhaleslabs.sqlite
```

## Development

```bash
npm run dev
```

Default URLs:

- Public site: `http://localhost:5173`
- Lab console: `http://localhost:5173/lab-console`
- API: `http://localhost:4000/api`

If port `5173` is busy, Vite chooses the next available port.

## Build

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

Run API only:

```bash
npm run server:start
```

Production flow:

```bash
npm ci
cp .env.example .env
npm run seed
npm run build
npm run server:start
```

Serve `dist/` with a static host/CDN and run the Express API separately, or adapt the server to serve the built frontend for a single-process deployment.

## API

Public:

- `GET /api/projects`
- `GET /api/market/btc`
- `GET /api/market/eth`
- `GET /api/market/dominance`
- `GET /api/market/fear-greed`
- `GET /api/market/gas`
- `GET /api/market/trending`

Admin:

- `POST /api/admin/login`
- `POST /api/admin/logout`
- `GET /api/admin/me`
- `GET /api/admin/projects`
- `POST /api/admin/projects`
- `PUT /api/admin/projects/:id`
- `PATCH /api/admin/projects/:id`
- `DELETE /api/admin/projects/:id`
- `POST /api/admin/uploads/logo`

Admin write routes require a valid HttpOnly session cookie.
