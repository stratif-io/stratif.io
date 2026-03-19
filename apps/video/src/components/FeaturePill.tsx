import { interpolate, spring, useVideoConfig } from 'remotion'

interface FeaturePillProps {
  label: string
  icon: string
  frame: number
  delay: number
}

export const FeaturePill: React.FC<FeaturePillProps> = ({ label, icon, frame, delay }) => {
  const { fps } = useVideoConfig()

  const adjustedFrame = Math.max(0, frame - delay)
  const scale = spring({ frame: adjustedFrame, fps, config: { damping: 14, stiffness: 200 } })
  const opacity = interpolate(adjustedFrame, [0, 15], [0, 1], { extrapolateRight: 'clamp' })

  return (
    <div
      style={{
        opacity,
        transform: `scale(${scale})`,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '14px 24px',
        borderRadius: 12,
        backgroundColor: '#18181b',
        border: '1px solid #27272a',
        color: '#ffffff',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: 18,
        fontWeight: 500,
        letterSpacing: '-0.2px',
      }}
    >
      <span style={{ fontSize: 22 }}>{icon}</span>
      {label}
    </div>
  )
}
