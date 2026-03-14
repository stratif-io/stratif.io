import { AbsoluteFill, Series } from 'remotion'
import { Intro } from './scenes/Intro'
import { AppDemo } from './scenes/AppDemo'
import { Outro } from './scenes/Outro'

export const OpenFlowVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#0a0a0a' }}>
      <Series>
        <Series.Sequence durationInFrames={90}>
          <Intro />
        </Series.Sequence>
        <Series.Sequence durationInFrames={300}>
          <AppDemo />
        </Series.Sequence>
        <Series.Sequence durationInFrames={60}>
          <Outro />
        </Series.Sequence>
      </Series>
    </AbsoluteFill>
  )
}
