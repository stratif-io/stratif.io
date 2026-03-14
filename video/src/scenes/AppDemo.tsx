import { AbsoluteFill, OffthreadVideo, staticFile, useCurrentFrame } from 'remotion'
import { PageCallout } from '../components/PageCallout'

const CALLOUTS = [
  { label: 'Dashboard', startFrame: 0, duration: 70 },
  { label: 'Trends', startFrame: 75, duration: 70 },
  { label: 'Funnels', startFrame: 150, duration: 70 },
  { label: 'Paths', startFrame: 225, duration: 70 },
]

export const AppDemo: React.FC = () => {
  const frame = useCurrentFrame()

  return (
    <AbsoluteFill>
      <OffthreadVideo src={staticFile('capture.webm')} startFrom={0} />
      {CALLOUTS.map((c) => (
        <PageCallout
          key={c.label}
          label={c.label}
          frame={frame}
          startFrame={c.startFrame}
          duration={c.duration}
        />
      ))}
    </AbsoluteFill>
  )
}
