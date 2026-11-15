# AuraMusic — Open-Source Cross-Platform Music App (SimpMusic Architecture)

**AuraMusic** is an open-source, cross-platform music streaming client inspired by [SimpMusic](https://github.com/maxrave-dev/SimpMusic), featuring a **Material You (Material 3 Expressive)** dynamic color UI, **YouTube Music InnerTube (`WEB_REMIX`)**, **SponsorBlock** auto-skip, **ReturnYouTubeDislike**, and **LRCLIB** time-synced karaoke lyrics.

---

## Key Features

- **YouTube Music InnerTube (`WEB_REMIX`) Backend**:
  - Live Home Feed (`FEmusic_home`), Global Charts (`FEmusic_charts`), Search with filter chips (`Songs`, `Videos`, `Albums`, `Artists`, `Playlists`), real-time search autocomplete (`/youtubei/v1/music/get_search_suggestions`), Album/Playlist/Artist views (`/youtubei/v1/browse`), and 50-track Automix Radio queues (`RDAMVM`).
- **SponsorBlock Integration (`sponsor.ajay.app`)**:
  - Automatically detects and skips `music_offtopic` (non-music intros/skits/outros), `sponsor`, `intro`, `outro`, `selfpromo`, `interaction`, and `preview` segments.
  - Renders color-coded segment markers directly on the player seekbar with hover tooltips, live auto-skip toast notifications with **Undo**, per-category behavior controls (`Auto-Skip`, `Manual Prompt`, `Seekbar Only`, `Disabled`), and a **Test Skip** button on every segment.
- **ReturnYouTubeDislike (`returnyoutubedislikeapi.com`)**:
  - Restores exact community Like & Dislike counts, Like/Dislike ratio bars, 5-star ratings, and total view counts on every song and music video.
- **Time-Synced Karaoke Lyrics (`LRCLIB` + InnerTube Lyrics)**:
  - Real-time scrolling synced lyrics with click-to-seek on any line and `-0.5s / +0.5s` timing offset controls.
- **Material You (Material 3 Expressive) Dynamic Palette Engine**:
  - Extracts dominant vibrant seed hues from the currently playing song's album cover using an offscreen `<canvas>` and transitions the entire UI's tonal surfaces smoothly.
- **Cross-Platform Targets**:
  - **Web / PWA**: Installable via `public/manifest.webmanifest` with OS `MediaSession` lock-screen controls.
  - **Android & iOS**: Ready for Capacitor packaging via `capacitor.config.json`.
  - **Windows, macOS & Linux**: Ready for Electron desktop packaging via `electron/main.cjs`.

---

## Quick Start

```bash
# Install dependencies
npm install

# Run both InnerTube backend server (port 3001) & Vite frontend (port 5173)
npm run dev
```

---

## Pushing to Your GitHub Repository & Hosting on GitHub Pages

This project includes a dual-mode client (`src/utils/apiClient.ts`) that uses the full Node/InnerTube backend (`/api/*`) when self-hosted and **automatically switches to Direct Browser Serverless Mode** when hosted on **GitHub Pages** (`*.github.io`), calling SponsorBlock (`sponsor.ajay.app`), ReturnYouTubeDislike (`returnyoutubedislikeapi.com`), LRCLIB (`lrclib.net`), and Apple/iTunes AAC streams directly from the browser via CORS.

### 1. Push to GitHub
```bash
git remote add origin https://github.com/<your-username>/<your-repo>.git
git branch -M main
git push -u origin main
```

### 2. Enable GitHub Pages (1-Click Auto-Deploy)
1. Open your repository on GitHub and go to **Settings → Pages**.
2. Under **Build and deployment → Source**, select **GitHub Actions**.
3. The included workflow (`.github/workflows/deploy-pages.yml`) will automatically build `dist/` and publish your live app at:
   `https://<your-username>.github.io/<your-repo>/`

