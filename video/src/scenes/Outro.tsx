import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'

const FONT = 'system-ui, -apple-system, sans-serif'

export const Outro: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const glowOpacity = interpolate(frame, [0, 25], [0, 1], { extrapolateRight: 'clamp' })

  const headlineProgress = spring({ frame, fps, config: { damping: 18, stiffness: 160 } })
  const headlineY = interpolate(headlineProgress, [0, 1], [44, 0])
  const headlineOpacity = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: 'clamp' })

  const taglineOpacity = interpolate(frame, [18, 32], [0, 1], { extrapolateRight: 'clamp' })
  const taglineY = interpolate(frame, [18, 32], [10, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  })

  const badgeProgress = spring({ frame: frame - 28, fps, config: { damping: 10, stiffness: 160 } })
  const badgeScale = interpolate(badgeProgress, [0, 1], [0.6, 1])
  const badgeOpacity = interpolate(frame - 28, [0, 8], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  })

  const urlOpacity = interpolate(frame, [44, 58], [0, 1], { extrapolateRight: 'clamp' })

  return (
    <AbsoluteFill style={{ backgroundColor: '#f8fafc', overflow: 'hidden' }}>
      {/* Subtle blue radial glow */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 70% 60% at 50% 55%, rgba(37,99,235,0.09), transparent)',
        opacity: glowOpacity,
      }} />

      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        height: '100%', gap: 16,
      }}>
        {/* Main headline */}
        <div style={{
          opacity: headlineOpacity,
          transform: `translateY(${headlineY}px)`,
          fontSize: 52, fontWeight: 800,
          color: '#0f172a', fontFamily: FONT,
          letterSpacing: '-2.5px', textAlign: 'center', lineHeight: 1.1,
        }}>
          Open-source analytics.{' '}
          <span style={{ color: '#2563eb' }}>Self-hostable.</span>
        </div>

        {/* Tagline */}
        <div style={{
          opacity: taglineOpacity,
          transform: `translateY(${taglineY}px)`,
          fontSize: 18, color: '#64748b',
          fontFamily: FONT, letterSpacing: '-0.2px',
        }}>
          No vendor lock-in. Deploy anywhere. Free forever.
        </div>

        {/* GitHub star badge */}
        <div style={{
          opacity: badgeOpacity,
          transform: `scale(${badgeScale})`,
          marginTop: 12,
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 24px', borderRadius: 999,
          backgroundColor: 'rgba(37,99,235,0.06)',
          border: '1px solid rgba(37,99,235,0.18)',
          boxShadow: '0 2px 16px rgba(37,99,235,0.08)',
        }}>
          <span style={{ fontSize: 20, color: '#f59e0b' }}>★</span>
          <span style={{
            fontFamily: FONT, fontSize: 16, fontWeight: 600,
            color: '#0f172a', letterSpacing: '-0.2px',
          }}>
            Star us on GitHub
          </span>
          <span style={{
            fontSize: 12, fontWeight: 600,
            color: '#2563eb', backgroundColor: 'rgba(37,99,235,0.1)',
            padding: '2px 8px', borderRadius: 999,
            letterSpacing: '0.2px',
          }}>
            MIT
          </span>
        </div>

        {/* URL */}
        <div style={{
          opacity: urlOpacity,
          fontSize: 14, color: '#94a3b8',
          fontFamily: FONT, letterSpacing: '0.2px',
          marginTop: 4,
        }}>
          github.com/openflow-analytics/openflow
        </div>
      </div>
    </AbsoluteFill>
  )
}
