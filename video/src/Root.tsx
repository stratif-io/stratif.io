import { Composition } from 'remotion'
import { stratif.ioVideo, TOTAL_FRAMES } from './stratif.ioVideo'

export const Root: React.FC = () => {
  return (
    <Composition
      id="stratif.ioVideo"
      component={stratif.ioVideo}
      durationInFrames={TOTAL_FRAMES}
      fps={30}
      width={1920}
      height={1360}
    />
  )
}
