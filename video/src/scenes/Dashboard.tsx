import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { MockDashboard } from '../components/MockDashboard'

export const Dashboard: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const sidebarX = interpolate(
    spring({ frame, fps, config: { damping: 18, stiffness: 100 } }),
    [0, 1],
    [-260, 0]
  )

  const contentOpacity = interpolate(frame, [20, 50], [0, 1], { extrapolateRight: 'clamp' })
  const contentY = interpolate(frame, [20, 50], [20, 0], { extrapolateRight: 'clamp' })

  return (
    <AbsoluteFill style={{ padding: 24, gap: 0 }}>
      <MockDashboard
        frame={frame}
        fps={fps}
        sidebarX={sidebarX}
        contentOpacity={contentOpacity}
        contentY={contentY}
      />
    </AbsoluteFill>
  )
}
