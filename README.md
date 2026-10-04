# Celestial Music Universe & Taste Graph 🌌🎵

An interactive, high-performance deep-space visualization of personal music taste, genre ecosystems, active listening events, and discovery recommendations.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-music--taste--graph.vercel.app-brightgreen?style=flat-square)](https://music-taste-graph.vercel.app)
[![Vite](https://img.shields.io/badge/Vite-8.3-blueviolet?style=flat-square&logo=vite)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-gray?style=flat-square)](LICENSE)

---

## 🌟 Overview

**Celestial Music Universe** maps a user's music library into an interactive spatial model. Genres form primary systems, artists occupy local positions within those systems, and individual tracks resolve at higher zoom levels. Listening events and recommendation candidates are rendered as dynamic spatial objects:

- **Genre Systems:** Primary stellar cores with atmospheric falloff and color identities mapped to musical taxonomy.
- **Discovery Systems:** Contextual recommendation candidates positioned spatially by taste affinity and acoustic similarity.
- **Asteroid Belts:** Niche tracks, peripheral catalog items, and cross-genre bridges clustered by library density.
- **Dynamic Meteors:** Active listening events and incoming discovery recommendations traced along physics-based flight paths.

---

## ✨ Key Features

### 🌌 Celestial Architecture & Progressive Disclosure
- **Level 1 — Galactic Universe:** Macro-level view of major genre clusters and cross-genre links.
- **Level 2 — Genre System:** Concentric orbits displaying subgenres, primary artist stars, and asteroid belts.
- **Level 3 — Artist System:** Deep focus on specific artists, highlighting gravitational bridges between genres.
- **Level 4 — Orbital Tracks:** Micro inspection showing BPM, album details, and Spotify direct links.

### 🪐 Functional Asteroids & Dynamic Meteors
- **Asteroid Belts:** Formed from music density; density correlates with genre weight.
- **Cross-Genre Saddles:** Asteroids clustering in the gravitational saddle between two connected genres.
- **Motion Calming:** Hovering or clicking an asteroid pauses its orbital velocity for inspection.
- **Data-Driven Meteors:**
  - `new_discovery`: Travels inward from deep space into user affinity systems.
  - `cross_genre_link`: Travels along Bézier curves between related genre suns (e.g. Techno ➔ House).
  - `recently_played`: Travels into its parent genre with glowing directional trails.

### 🎧 Curated Presets & Spotify Import
- **Instant Presets:** Switch between *Electronic & Club*, *Indie & Alternative*, and *Eclectic Mix*.
- **Spotify PKCE OAuth Integration:** Connect Spotify to pull live saved tracks and top artists directly into your universe.
- **Local CSV Import:** Drag-and-drop your own music metadata exports.

### 🔍 Discovery Engine & Contextual Inspection
- Recommends nearby, adjacent, and exploratory music based on user taste signals, genre relationships, artist similarity, and listening history.
- Structured discovery tiers:
  - **Nearby:** Strong similarity to existing dominant taste.
  - **Adjacent:** Connected to current taste while introducing an adjacent sonic bridge.
  - **Unknown:** Distant exploratory frontier outside dominant orbits.
- Inspectable reasons ("Why this matches your taste") with direct sample tracks and one-click collection actions.

---

## 🔒 Spotify Integration, Development Mode & Data Isolation

### Spotify Development Mode Limitation
SymphonyGraph connects to the Spotify Web API using PKCE OAuth. Because the application is currently registered in **Spotify Development Mode**:
- Spotify Developer policies restrict API access exclusively to Spotify accounts explicitly registered on the application's Developer Dashboard allowlist (Spotify's quota limit of 25 users).
- **Non-allowlisted accounts:** Spotify allows users to complete OAuth login, but immediately responds with `HTTP 403 Forbidden` on subsequent authenticated API requests (`/v1/me`, `/v1/me/top/tracks`, player status, and recently played tracks).
- **Application UX:** SymphonyGraph explicitly classifies HTTP 403 responses as `access_denied` ("Spotify access unavailable"), halts all background polling to avoid rate-limiting or wasteful requests, and renders an informative status message. It does **not** falsely present a failed sync as "Synced" or as an empty library.

### Public Demo & Exploration Options
Visitors who are not on the Spotify Developer allowlist can fully explore the platform through:
1. **Curated Presets:** Instant access to pre-compiled celestial universes (*Electronic & Club*, *Indie & Alternative*, and *Eclectic Mix*).
2. **Local Metadata Import:** Drag-and-drop your personal listening history via CSV or JSON files (supports track, artist, genre, and tempo mapping).
3. **Allowlist Requests:** Reach out to the project maintainer to have your Spotify account email added to the developer allowlist.

### Strict User Data Isolation
- **No Silent Fallbacks:** If a Spotify API request fails or is denied with HTTP 403, SymphonyGraph **never** falls back silently to bundled electronic/demo data. The view remains completely clean and isolated.
- **Multi-User Isolation:** Disconnecting a session purges all cached user tracks, listening events, playback states, and identity markers from memory. Switching accounts guarantees that no residual data from User A leaks into User B.
- **Zero Token Logging:** Access tokens, refresh tokens, PKCE code verifiers, client secrets, and `Authorization` headers are never logged to client or server output. Diagnostic instrumentation only records sanitized endpoint paths and HTTP status codes.

---

## 🛠️ Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS
- **Visualization:** Custom HTML5 Canvas 2D engine with sub-pixel rendering, high-DPR scaling, and smooth physics-driven camera interpolation (hyperspace transitions)
- **Node Graph Mode:** `@xyflow/react` (React Flow) with Dagre hierarchical layout
- **Backend / Serverless:** Express 5 on Node.js / Vercel Serverless Functions for secure Spotify PKCE token exchange

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or newer recommended)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Itachi0099/music-taste-graph.git
   cd music-taste-graph
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. (Optional) Configure Spotify API credentials in `.env`:
   ```env
   VITE_SPOTIFY_CLIENT_ID=your_spotify_client_id
   SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
   ```

4. Start the local development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📦 Scripts

- `npm run dev`: Starts the Vite client development server.
- `npm run build`: Compiles TypeScript and builds the production client with Vite.
- `npm test`: Runs the automated test suite (16 unit and regression tests for Spotify error classification, 403 handling, and isolation).
- `npm run lint`: Runs Oxlint across all TypeScript and React source files.
- `npm run server`: Runs the local Express server for Spotify authentication endpoints.
- `npm run dev:all`: Starts both backend server and Vite client concurrently.
- `npm run preview`: Locally previews the production build.

---

## 🌐 Deployment

The application is configured for seamless deployment on [Vercel](https://vercel.com):

```bash
npx vercel --prod
```

Or connect the GitHub repository directly to Vercel. Static assets are served from `dist/`, while API routes in `api/index.ts` run as serverless functions.

---

## 📄 License

MIT License © [Itachi0099](https://github.com/Itachi0099)
