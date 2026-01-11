# Momentum

Offline-first personal workout logger with momentum-based gamification. Designed for fast set logging at the gym with no internet required.

## Tech Stack

- **Ionic + Angular** – Mobile-first UI framework
- **PWA** – Installable, works offline via service worker
- **IndexedDB (Dexie)** – Client-side persistence
- **TypeScript** – Strong typing throughout

## MVP Scope

- Log sessions with exercises and sets (weight, reps)
- Exercise library with search and custom entries
- "Last attempt" ghost mode – see previous performance, copy sets
- Momentum system – stay active with a rolling 7-day window
- XP and levels – quiet reward for consistent effort
- PR detection – factual highlights, no noise
- Bodyweight tracking
- JSON export/import for backup

No authentication, no cloud sync, no social features.

## Current Status

- App shell + dark theme
- Exercise library from IndexedDB
- Sessions with exercise selection
- Set logging (weight/reps) with auto-save
- Finish session + summary
- Ghost Mode: previous attempt display + copy sets
- Exercise removal with undo
- Exercise reordering (drag-and-drop)

## Local Development

Requires **Node.js 20.19.0+**.

```bash
nvm use           # Uses version from .nvmrc
npm install
npm run start     # Serves at http://localhost:4200
```

### Production Build

```bash
npm run build     # Outputs to www/
```

Serve the `www/` directory with any static file server to test PWA functionality.
