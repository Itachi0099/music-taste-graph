# Celestial Music Universe & Taste Graph 🌌🎵

An interactive, high-performance deep-space visualization of personal music taste, genre ecosystems, active listening events, and discovery recommendations.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-music--taste--graph.vercel.app-brightgreen?style=flat-square)](https://music-taste-graph.vercel.app)
[![Vite](https://img.shields.io/badge/Vite-8.3-blueviolet?style=flat-square&logo=vite)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-gray?style=flat-square)](LICENSE)

---

## 🌟 Overview

**Music Taste Graph** reimagines personal listening data as a living, breathing celestial universe. Instead of conventional flat graphs or cluttered futuristic dashboards, it models genres as stellar systems, artists as orbiting planetary bodies, and tracks as luminous satellites.

The system incorporates **functional celestial bodies**:
- **Genre Systems (Stellar Cores):** Luminous celestial suns with soft coronas, natural atmospheric falloff, and color identities derived from musical taxonomy.
- **Discovery Systems (Stellar Nurseries):** Recommendation candidates positioned spatially relative to existing taste affinity.
- **Asteroids (Discovery Objects):** Irregular faceted bodies representing peripheral tracks, underground artists, and cross-genre bridges.
- **Meteors (Active Music Events):** Real-time dynamic events tracing flight trajectories across the universe (incoming recommendations, recently played tracks, cross-genre transitions).

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
