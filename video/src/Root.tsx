import { Composition } from 'remotion'
import { OpenFlowVideo } from './OpenFlowVideo'

export const Root: React.FC = () => {
  return (
    <Composition
      id="OpenFlowVideo"
      component={OpenFlowVideo}
      durationInFrames={450}
      fps={30}
      width={1280}
      height={720}
    />
  )
}
