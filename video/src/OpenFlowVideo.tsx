import { AbsoluteFill, Series } from 'remotion'
import { Intro } from './scenes/Intro'
import { Features } from './scenes/Features'
import { Dashboard } from './scenes/Dashboard'

export const OpenFlowVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#0a0a0a' }}>
      <Series>
        <Series.Sequence durationInFrames={90}>
          <Intro />
        </Series.Sequence>
        <Series.Sequence durationInFrames={120}>
          <Features />
        </Series.Sequence>
        <Series.Sequence durationInFrames={240}>
          <Dashboard />
        </Series.Sequence>
      </Series>
    </AbsoluteFill>
  )
}
