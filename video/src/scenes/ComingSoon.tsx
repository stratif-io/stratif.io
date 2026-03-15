import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'

const FONT = 'system-ui, -apple-system, sans-serif'

const FEATURES = [
  'Alerts & anomaly detection',
  'Multi-connection dashboards',
  'Scheduled reports',
  'Team collaboration',
]

export const ComingSoon: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const glowOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' })

  const labelProgress = spring({ frame, fps, config: { damping: 200, stiffness: 200 } })
  const labelOpacity  = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: 'clamp' })

  const headlineProgress = spring({ frame: frame - 8, fps, config: { damping: 18, stiffness: 160 } })
  const headlineY        = interpolate(headlineProgress, [0, 1], [36, 0])
  const headlineOpacity  = interpolate(frame, [8, 20], [0, 1], { extrapolateRight: 'clamp' })

  return (
    <AbsoluteFill style={{ backgroundColor: '#f8fafc', overflow: 'hidden' }}>
      {/* Subtle blue glow */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(37,99,235,0.07), transparent)',
        opacity: glowOpacity,
      }} />

      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        height: '100%', gap: 24,
      }}>
        {/* "What's next" label */}
        <div style={{
          opacity: labelOpacity,
          transform: `scaleX(${labelProgress})`,
          transformOrigin: 'center',
          fontSize: 12, fontWeight: 700, letterSpacing: '3px',
          color: '#2563eb', fontFamily: FONT, textTransform: 'uppercase',
        }}>
          What&apos;s next
        </div>

        {/* Headline */}
        <div style={{
          opacity: headlineOpacity,
          transform: `translateY(${headlineY}px)`,
          fontSize: 48, fontWeight: 800,
          color: '#0f172a', fontFamily: FONT,
          letterSpacing: '-2px', textAlign: 'center', lineHeight: 1.1,
        }}>
          More coming <span style={{ color: '#2563eb' }}>soon.</span>
        </div>

        {/* Feature pill list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
          {FEATURES.map((feat, i) => {
            const delay = 22 + i * 8
            const prog  = spring({ frame: frame - delay, fps, config: { damping: 200, stiffness: 220 } })
            const op    = interpolate(frame - delay, [0, 6], [0, 1], {
              extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
            })
            const x = interpolate(prog, [0, 1], [-24, 0])

            return (
              <div key={feat} style={{
                opacity: op,
                transform: `translateX(${x}px)`,
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 20px', borderRadius: 999,
                backgroundColor: 'rgba(37,99,235,0.06)',
                border: '1px solid rgba(37,99,235,0.15)',
              }}>
                <span style={{ color: '#2563eb', fontSize: 16 }}>◆</span>
                <span style={{
                  fontFamily: FONT, fontSize: 16, fontWeight: 500,
                  color: '#475569', letterSpacing: '-0.2px',
                }}>
                  {feat}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </AbsoluteFill>
  )
}
