# Remotion Browser Capture — Design Spec
Date: 2026-03-14

## Goal

Replace the stylized MockDashboard scene in the Remotion video with a real browser recording of the running app. Playwright automates the full capture pipeline: starts the app via Docker, records the session, and saves a WebM for Remotion to compose.

## Workflow

```
npm run capture    # docker up → record → docker down → saves capture.webm
npm run render     # Remotion composes MP4
npm run render:gif # converts to docs/demo.gif
npm run render:full  # all three in sequence
```

## Prerequisites

- Docker running (Colima or Docker Desktop)
- `ffmpeg` installed (for GIF conversion)
- Playwright Chromium installed: `npx playwright install chromium`
- `.env` file in OSS root with at minimum `STRATIFIO_ENCRYPTION_KEY` set (required by docker compose). The capture script checks for this and exits early with a clear error if missing.

## Capture Script (`capture/capture.ts`)

1. Check `../.env` exists and contains `STRATIFIO_ENCRYPTION_KEY` — exit with message if not
2. `docker compose up -d` from the OSS root (`../`)
3. Poll `http://localhost:8000` until healthy via `capture/wait-for.ts` (timeout: 60s, interval: 1s)
4. Launch Playwright Chromium (1280×720, no sandbox), enable video recording
5. Navigate and record:
   - `/` → Dashboard — wait 2.5s
   - `/trends` → Trends — wait 2.5s
   - `/funnels` → Funnels — wait 2.5s
   - `/paths` → Paths — wait 2.5s
6. Close browser context → Playwright saves WebM to a temp path
7. Copy WebM to `public/capture.webm` (Remotion `staticFile()` serves from `public/`)
8. `docker compose down`

Total raw recording: ~10–12s.

## Video Structure (450 frames @ 30fps = 15s)

| Segment | Frames | Duration | Content |
|---|---|---|---|
| Intro | 0–90 | 0–3s | Existing motion graphics (name + tagline) |
| AppDemo | 90–390 | 3–13s | `<OffthreadVideo>` of capture + animated page callouts |
| Outro | 390–450 | 13–15s | "Open-source analytics. Self-hostable." + "★ Star on GitHub" |

## AppDemo Scene

- `<OffthreadVideo src={staticFile('capture.webm')} startFrom={0} />`
- `staticFile()` resolves from `video/public/` — capture saved there
- Page callouts (`<PageCallout>`) at fixed frame offsets:
  - Frame 0 (of scene): "Dashboard"
  - Frame 75: "Trends"
  - Frame 150: "Funnels"
  - Frame 225: "Paths"
- Each callout: fade in 10 frames, hold, fade out 10 frames before next

## Code Structure Changes

**New files:**
```
video/capture/
├── capture.ts          — Playwright capture script
└── wait-for.ts         — URL polling utility

video/public/
└── capture.webm        — generated (gitignored)

video/src/scenes/
├── AppDemo.tsx         — NEW: OffthreadVideo + callouts
└── Outro.tsx           — NEW: tagline + CTA

video/src/components/
└── PageCallout.tsx     — NEW: animated page label
```

**Removed:** `src/scenes/Features.tsx`, `src/scenes/Dashboard.tsx`, `src/components/MockDashboard.tsx`

**Modified:** `src/stratif.ioVideo.tsx` — sequence Intro → AppDemo → Outro

## New package.json scripts

```json
"capture": "npx playwright install chromium --with-deps && tsx capture/capture.ts",
"render:full": "npm run capture && npm run render && npm run render:gif"
```

## New dependencies

- `@playwright/test` — browser automation + video recording (VP8 WebM, compatible with Remotion OffthreadVideo)
- `tsx` — run TypeScript capture script directly

## Gitignore additions

```
video/public/capture.webm
```
