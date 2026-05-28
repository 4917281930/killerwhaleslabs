# killerwhaleslabs

Bitcoin-native crypto intelligence website and airdrop tracker built with a React/Vite frontend, Express API, SQLite database, real-time market SSE (Server-Sent Events) feeds, curated campaigns, admin workspace console, and secure WebP logo storage.

## Upgraded Features (v6.2)

The application has been overhauled for production readiness, mobility, and robustness:

### 1. Robust Unified Routing & Navigation
* Fully migrated from legacy ad-hoc `popstate` dispatches to `react-router-dom` (React Router v6).
* Support for stable deep links: `/` (Home), `/airdrops` (curated feed), `/airdrops/:slug` (tactical campaign detail), and `/lab-console` (operator dashboard).
* Built-in scroll restoration resets window scroll positions on transition.
* SPA-friendly fallback routing (404 Page) with seamless "Back Home" recovery.

### 2. Deep Project Metadata Model
* SQLite tables support advanced structural fields:
  * Unique and stable `slug` dynamically generated from the project's name.
  * Structural properties: `ecosystem`, `chain`, `task_type`, `difficulty` (easy, medium, hard), `risk_level` (low, medium, high), and `priority` integers for sort weight.
  * Visibility indicators: `featured` (featured on home hero preview), `published` (publicly visible), and `archived`.
  * Multi-channel connectivity: Website, Twitter/X, Discord, Telegram, Documentation, and App Launch.
  * Split textual logging: Public operational notes (`notes`) and private internal operations comments (`admin_notes`).
  * `last_checked_at` status indicator tracking updates.
* Automatically filters all internal `admin_notes` and hides unpublished/archived elements from public endpoints.

### 3. Fail-Safe Market Stream & Visibility Controls
* **Real-time SSE (`/api/market/stream`)**: Pushes global snapshot updates (BTC, ETH, global dominance percentages, sentiment index, network gas props) to clients.
* **REST Polling Fallback**: Automatically switches from SSE stream to individual REST polls if the SSE connection fails 3 times in a row.
* **Visibility States**: Disconnects WebSocket and event sources when the browser tab is hidden to prevent performance degradation on low-power devices. Re-establishes connection and triggers a single background REST refresh when the tab is focused.
* **Gas Tracker Fallback**: Safe mock data (stale flags) triggers if the Etherscan API key is unconfigured or blocked by rate limits, preventing API crash loops.

### 4. Admin Operator Workspace Console
* Divided into 6 distinct forms: Basic Info, Status & Visibility, Upgraded Metadata, Official Links, WebP Logo Cropping, and Notes.
* **Autosave Draft**: Form states save continuously to local storage, allowing recovery after crashes or accidental reloads.
* **Exit Prevention**: Warns operator with a window confirm prompt before leaving `/lab-console` if there are unsaved changes.
* **Duplicate Action**: Operators can clone existing campaigns in a click.
* **Touch Cropping**: The crop modal handles standard touch-drag and pinch events, rendering compressed 160x160 `.webp` logo uploads.

---

## Technical Stack

* **Frontend**: React 18 + Vite, Tailwind CSS, Lucide icons, dynamic document title management.
* **Backend**: Node.js + Express.js.
* **Database**: SQLite via `better-sqlite3` configured with WAL journaling.
* **Real-time Stream**: Server-Sent Events (SSE) broadcasting, and local WebSockets.
* **Logo Processor**: `sharp` image formatting.

---

## File Structure

```text
client/                         React/Vite frontend source
client/src/components/layout/   Shell wrapper, Header, and ScrollRestoration
client/src/pages/               Home, Airdrops feed, Admin console, and 404 views
client/src/lib/useMarketStream  SSE / REST fallback stream manager
server/                         Express API source
server/db/                      SQLite connection setup and schema migrations
server/routes/                  API router endpoints (Admin, Market, Projects)
server/utils/validation.js      Request parameter validator scans
deploy/                         PM2 and Nginx reverse proxy configuration files
```

---

## Requirements

* Node.js 18+
* npm
* SQLite compiler dependencies (`better-sqlite3`)

---

## Local Installation

1. Install project dependencies:
```bash
npm install
```

2. Initialize environment parameters:
```bash
cp .env.example .env
```

3. Production environment parameters template:
```dotenv
NODE_ENV=production
PORT=4000
SESSION_SECRET=a-long-random-secret-for-signing-cookies
ADMIN_USERNAME=operator
ADMIN_PASSWORD=strong-admin-password
CLIENT_ORIGIN=https://yourdomain.com
```

4. Compile static frontend bundle and seed DB:
```bash
npm run build
npm run seed
```

5. Run development server (runs nodemon backend + vite frontend concurrently):
```bash
npm run dev
```

* Public site: `http://localhost:5173/`
* Airdrop feed: `http://localhost:5173/airdrops`
* Operator console: `http://localhost:5173/lab-console`
* API base: `http://localhost:4000/api`

---

## Build, Lint, and Validation

Verify type safety and compile:
```bash
# Verify type safety
npm run typecheck

# Build assets
npm run build
```

---

## Deployment & PM2

Start cluster processes:
```bash
npm run start:pm2
```

Inspect PM2 worker streams:
```bash
npm run logs
```

Stop PM2 app:
```bash
npm run stop:pm2
```

---

## Public REST Endpoints

* `GET /api/health` - Database connection verification
* `GET /api/projects` - Curated published campaigns (filtered, priority sorted)
* `GET /api/projects/:slug` - Detailed campaign specifications
* `GET /api/market/btc` - BTC snapshot
* `GET /api/market/eth` - ETH snapshot
* `GET /api/market/dominance` - Global market cap dominance indices
* `GET /api/market/fear-greed` - Crypto fear and greed indexes
* `GET /api/market/gas` - Eth network提案 proposals
* `GET /api/market/stream` - Persistent SSE stream

---

## Security Framework

* Session tokens use signed, `HttpOnly`, `SameSite=Lax` cookies.
* Admin passwords hashed with scrypt.
* CORS headers strictly bind requests to `CLIENT_ORIGIN`.
* Built-in double-submit CSRF checks on POST, PUT, DELETE operations.
* Public and admin routes throttle hammering attacks using `rate-limiter-flexible`.
