import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion'

export const Outro: React.FC = () => {
  const frame = useCurrentFrame()

  const taglineOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' })
  const taglineY = interpolate(frame, [0, 20], [16, 0], { extrapolateRight: 'clamp' })

  const ctaOpacity = interpolate(frame, [20, 40], [0, 1], { extrapolateRight: 'clamp' })
  const ctaY = interpolate(frame, [20, 40], [12, 0], { extrapolateRight: 'clamp' })

  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        backgroundColor: '#0a0a0a',
      }}
    >
      <div
        style={{
          opacity: taglineOpacity,
          transform: `translateY(${taglineY}px)`,
          fontSize: 36,
          fontWeight: 700,
          color: '#ffffff',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          letterSpacing: '-1px',
          textAlign: 'center',
        }}
      >
        Open-source analytics.{' '}
        <span style={{ color: '#3b82f6' }}>Self-hostable.</span>
      </div>
      <div
        style={{
          opacity: ctaOpacity,
          transform: `translateY(${ctaY}px)`,
          fontSize: 18,
          color: '#a1a1aa',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span style={{ color: '#f59e0b' }}>★</span>
        Star on GitHub · MIT License
      </div>
    </AbsoluteFill>
  )
}
