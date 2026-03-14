import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'

export const Intro: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const titleY = interpolate(
    spring({ frame, fps, config: { damping: 14, stiffness: 120 } }),
    [0, 1],
    [60, 0]
  )
  const titleOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' })

  const taglineOpacity = interpolate(frame, [25, 50], [0, 1], { extrapolateRight: 'clamp' })
  const taglineY = interpolate(frame, [25, 50], [12, 0], { extrapolateRight: 'clamp' })

  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
      }}
    >
      <div
        style={{
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          fontSize: 64,
          fontWeight: 700,
          color: '#ffffff',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          letterSpacing: '-2px',
        }}
      >
        OpenFlow Analytics
      </div>
      <div
        style={{
          opacity: taglineOpacity,
          transform: `translateY(${taglineY}px)`,
          fontSize: 22,
          color: '#a1a1aa',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          letterSpacing: '-0.3px',
        }}
      >
        Open-source, self-hostable product analytics
      </div>
    </AbsoluteFill>
  )
}
