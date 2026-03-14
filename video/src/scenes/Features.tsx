import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { FeaturePill } from '../components/FeaturePill'

const PILLS = [
  { label: 'Self-hostable', icon: '🏠', delay: 0 },
  { label: 'Bring your own DB', icon: '🗄️', delay: 30 },
  { label: 'No auth required', icon: '⚡', delay: 60 },
]

export const Features: React.FC = () => {
  const frame = useCurrentFrame()

  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
      }}
    >
      <div
        style={{
          fontSize: 18,
          color: '#71717a',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          marginBottom: 8,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        Built different
      </div>
      <div style={{ display: 'flex', gap: 16 }}>
        {PILLS.map((pill) => (
          <FeaturePill
            key={pill.label}
            label={pill.label}
            icon={pill.icon}
            frame={frame}
            delay={pill.delay}
          />
        ))}
      </div>
    </AbsoluteFill>
  )
}
