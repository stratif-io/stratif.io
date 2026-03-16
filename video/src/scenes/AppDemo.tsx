import { AbsoluteFill, OffthreadVideo, staticFile, useCurrentFrame } from 'remotion'
import { TransitionSeries, linearTiming } from '@remotion/transitions'
import { fade } from '@remotion/transitions/fade'
import { PageCallout } from '../components/PageCallout'
import { ProgressBar } from '../components/ProgressBar'

// Full-screen 1s fade between scenes
const FADE = 30

// Durations will be updated after capture with actual ffprobe values.
// These are generous estimates; trim them if the video freezes at end.
// skipFrames: trim this many frames from the start of the video (startFrom in OffthreadVideo)
const SCENES = [
  { file: 'scene-01-connection.webm',      label: 'Add Connection', step: 1, frames: 173, skipFrames: 0  },
  { file: 'scene-02-schema.webm',          label: 'Detect Schema',  step: 2, frames: 137, skipFrames: 0  },
  { file: 'scene-03-filters.webm',         label: 'Global Filters', step: 3, frames: 120, skipFrames: 0  },
  { file: 'scene-04-dashboard-pivot.webm', label: 'Pivot Explorer', step: 4, frames: 631, skipFrames: 90 },
]

// Total demo frames accounting for fade overlaps
export const DEMO_FRAMES =
  SCENES.reduce((acc, s) => acc + s.frames, 0) - FADE * (SCENES.length - 1)

export const AppDemo: React.FC = () => {
  const frame = useCurrentFrame()

  // Compute absolute startFrame for each scene's callout
  let cursor = 0
  const callouts = SCENES.map((s) => {
    const startFrame = cursor
    cursor += s.frames - FADE
    return { ...s, startFrame }
  })

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={SCENES[0].frames}>
          <OffthreadVideo src={staticFile(SCENES[0].file)} startFrom={SCENES[0].skipFrames} />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: FADE })} />
        <TransitionSeries.Sequence durationInFrames={SCENES[1].frames}>
          <OffthreadVideo src={staticFile(SCENES[1].file)} startFrom={SCENES[1].skipFrames} />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: FADE })} />
        <TransitionSeries.Sequence durationInFrames={SCENES[2].frames}>
          <OffthreadVideo src={staticFile(SCENES[2].file)} startFrom={SCENES[2].skipFrames} />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: FADE })} />
        <TransitionSeries.Sequence durationInFrames={SCENES[3].frames}>
          <OffthreadVideo src={staticFile(SCENES[3].file)} startFrom={SCENES[3].skipFrames} />
        </TransitionSeries.Sequence>
      </TransitionSeries>

      {/* Cinematic letterbox bands */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 140, backgroundColor: '#000', zIndex: 10 }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 140, backgroundColor: '#000', zIndex: 10 }} />

      {/* Slim progress bar at top */}
      <ProgressBar />

      {/* Chapter callouts */}
      {callouts.map((c) => (
        <PageCallout
          key={c.file}
          step={c.step}
          label={c.label}
          frame={frame}
          startFrame={c.startFrame}
          duration={c.frames}
        />
      ))}
    </AbsoluteFill>
  )
}
