import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'

const FONT = 'system-ui, -apple-system, sans-serif'

// "OpenFlow" — 4 dark letters + 4 blue letters
const LETTERS = [
  { char: 'O', color: '#0f172a' },
  { char: 'p', color: '#0f172a' },
  { char: 'e', color: '#0f172a' },
  { char: 'n', color: '#0f172a' },
  { char: 'F', color: '#2563eb' },
  { char: 'l', color: '#2563eb' },
  { char: 'o', color: '#2563eb' },
  { char: 'w', color: '#2563eb' },
]

const FEATURES = ['Funnels', 'Paths', 'Pivot Explorer', 'Filters']
const TAGLINE_WORDS = ['Open-source.', 'Self-hostable.', 'Product', 'analytics.']

export const Intro: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const glowOpacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: 'clamp' })

  const barProgress = spring({ frame: frame - 22, fps, config: { damping: 200 } })
  const barWidth = interpolate(barProgress, [0, 1], [0, 160])

  return (
    <AbsoluteFill style={{ backgroundColor: '#f8fafc', overflow: 'hidden' }}>
      {/* Subtle blue radial glow */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(37,99,235,0.07), transparent)',
        opacity: glowOpacity,
      }} />

      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        height: '100%', gap: 0,
      }}>
        {/* Letter-by-letter wordmark */}
        <div style={{
          display: 'flex', alignItems: 'baseline',
          fontSize: 88, fontWeight: 800,
          fontFamily: FONT, letterSpacing: '-4px', lineHeight: 1,
          overflow: 'hidden',
        }}>
          {LETTERS.map(({ char, color }, i) => {
            const delay = i * 3
            const progress = spring({ frame: frame - delay, fps, config: { damping: 18, stiffness: 160 } })
            const y = interpolate(progress, [0, 1], [40, 0])
            const opacity = interpolate(frame - delay, [0, 6], [0, 1], {
              extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
            })
            return (
              <span key={i} style={{ color, opacity, transform: `translateY(${y}px)`, display: 'inline-block' }}>
                {char}
              </span>
            )
          })}
        </div>

        {/* Animated accent bar */}
        <div style={{
          width: barWidth, height: 3, borderRadius: 999,
          backgroundColor: '#2563eb', marginTop: 14, marginBottom: 18,
        }} />

        {/* Tagline */}
        <div style={{
          display: 'flex', gap: 8,
          fontFamily: FONT, fontSize: 20, color: '#64748b', letterSpacing: '-0.2px',
        }}>
          {TAGLINE_WORDS.map((word, i) => {
            const startFrame = 30 + i * 5
            const op = interpolate(frame, [startFrame, startFrame + 10], [0, 1], {
              extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
            })
            const y = interpolate(frame, [startFrame, startFrame + 10], [8, 0], {
              extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
            })
            return (
              <span key={i} style={{ opacity: op, transform: `translateY(${y}px)`, display: 'inline-block' }}>
                {word}
              </span>
            )
          })}
        </div>

        {/* Feature pills */}
        <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
          {FEATURES.map((label, i) => {
            const startFrame = 46 + i * 5
            const progress = spring({ frame: frame - startFrame, fps, config: { damping: 14, stiffness: 180 } })
            const scale = interpolate(progress, [0, 1], [0.7, 1])
            const opacity = interpolate(frame - startFrame, [0, 6], [0, 1], {
              extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
            })
            return (
              <div key={i} style={{
                opacity, transform: `scale(${scale})`,
                padding: '6px 14px', borderRadius: 999,
                backgroundColor: 'rgba(37,99,235,0.08)',
                border: '1px solid rgba(37,99,235,0.2)',
                color: '#2563eb',
                fontFamily: FONT, fontSize: 13, fontWeight: 500,
                letterSpacing: '-0.1px',
              }}>
                {label}
              </div>
            )
          })}
        </div>
      </div>
    </AbsoluteFill>
  )
}
