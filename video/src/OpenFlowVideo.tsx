import { AbsoluteFill, Audio, interpolate, staticFile, useVideoConfig } from 'remotion'
import { TransitionSeries, linearTiming } from '@remotion/transitions'
import { fade } from '@remotion/transitions/fade'
import { Intro } from './scenes/Intro'
import { AppDemo, DEMO_FRAMES } from './scenes/AppDemo'
import { ComingSoon } from './scenes/ComingSoon'
import { Outro } from './scenes/Outro'

const INTRO      = 75
const DEMO       = DEMO_FRAMES
const COMINGSOON = 120  // 4s
const OUTRO      = 75
const FADE       = 15

export const TOTAL_FRAMES = INTRO + DEMO + COMINGSOON + OUTRO - FADE * 3

export const OpenFlowVideo: React.FC = () => {
  const { durationInFrames, fps } = useVideoConfig()

  return (
    <AbsoluteFill style={{ backgroundColor: '#f8fafc' }}>
      {/* Background music: low volume, fade in 1s, fade out 1s */}
      <Audio
        src={staticFile('music.mp3')}
        loop
        volume={(f) => {
          const fadeIn  = interpolate(f, [0, fps], [0, 0.15], { extrapolateRight: 'clamp' })
          const fadeOut = interpolate(f, [durationInFrames - fps, durationInFrames], [0.15, 0], { extrapolateLeft: 'clamp' })
          return Math.min(fadeIn, fadeOut)
        }}
      />

      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={INTRO} premountFor={fps}>
          <Intro />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: FADE })}
        />

        <TransitionSeries.Sequence durationInFrames={DEMO} premountFor={fps}>
          <AppDemo />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: FADE })}
        />

        <TransitionSeries.Sequence durationInFrames={COMINGSOON} premountFor={fps}>
          <ComingSoon />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: FADE })}
        />

        <TransitionSeries.Sequence durationInFrames={OUTRO} premountFor={fps}>
          <Outro />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  )
}
