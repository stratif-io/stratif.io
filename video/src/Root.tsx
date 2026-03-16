import { Composition } from 'remotion'
import { OpenFlowVideo, TOTAL_FRAMES } from './OpenFlowVideo'

export const Root: React.FC = () => {
  return (
    <Composition
      id="OpenFlowVideo"
      component={OpenFlowVideo}
      durationInFrames={TOTAL_FRAMES}
      fps={30}
      width={1920}
      height={1360}
    />
  )
}
