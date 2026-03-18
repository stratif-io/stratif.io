# Remotion Demo Video — Design Spec
Date: 2026-03-14

## Goal

Build a ~15-second Remotion video for the stratif.io Analytics GitHub README. Replaces the screenshot placeholder with an animated GIF (inline) and an MP4 (linked). Lives in `stratifio/video/`.

## Video Structure (450 frames @ 30fps)

| Segment | Frames | Duration | Content |
|---|---|---|---|
| Intro | 0–90 | 0–3s | Dark bg, "stratif.io Analytics" slides up, tagline fades in |
| Features | 90–210 | 3–7s | 3 feature pills animate in sequentially |
| Dashboard | 210–450 | 7–15s | Stylized UI mockup: sidebar slides in, charts draw, numbers count up |

**Feature pills:** "Self-hostable" · "Bring your own DB" · "No auth required"

**Visual style:** Dark theme, matches the app aesthetic.

## Project Structure

```
stratifio/video/
├── package.json           # remotion, @remotion/cli, react, typescript
├── remotion.config.ts     # entry point, format, concurrency
├── tsconfig.json          # TypeScript config for this subfolder
└── src/
    ├── index.ts            # registerRoot(Root) — Remotion webpack entry point
    ├── Root.tsx            # registers stratif.ioVideo composition
    ├── stratif.ioVideo.tsx   # main 450-frame composition, sequences scenes
    ├── scenes/
    │   ├── Intro.tsx       # name + tagline motion graphics
    │   ├── Features.tsx    # sequential pill animations
    │   └── Dashboard.tsx   # stylized UI mockup animation
    └── components/
        ├── FeaturePill.tsx
        └── MockDashboard.tsx
```

## Key File Contents

### `remotion.config.ts`
```ts
import { Config } from '@remotion/cli/config'

Config.setVideoImageFormat('jpeg')
Config.setConcurrency(4)
```

### `src/index.ts`
```ts
import { registerRoot } from 'remotion'
import { Root } from './Root'

registerRoot(Root)
```

### `package.json` scripts
```json
{
  "scripts": {
    "studio": "remotion studio",
    "render": "remotion render stratif.ioVideo out/stratifio.mp4",
    "render:gif": "ffmpeg -i out/stratifio.mp4 -vf 'fps=15,scale=1280:-1:flags=lanczos,palettegen' /tmp/palette.png && ffmpeg -i out/stratifio.mp4 -i /tmp/palette.png -vf 'fps=15,scale=1280:-1:flags=lanczos,paletteuse' ../docs/demo.gif"
  }
}
```

GIF uses two-pass ffmpeg palette generation for quality output at 15fps.

## Outputs

| File | Purpose |
|---|---|
| `video/out/stratifio.mp4` | Full quality, upload to GitHub Releases or host externally |
| `docs/demo.gif` | Converted from MP4 via ffmpeg two-pass, displayed inline in README |

## README Change

Replace:
```md
![stratif.io Analytics Dashboard](docs/screenshot-placeholder.png)
```

With:
```md
![stratif.io Analytics Demo](docs/demo.gif)

▶ [Watch full demo (MP4)](https://github.com/your-org/stratifio/releases/latest/download/stratifio.mp4)
```

## Out of Scope

- Real screen recording of the app
- Audio
- Captions
- CI/CD auto-render on push
