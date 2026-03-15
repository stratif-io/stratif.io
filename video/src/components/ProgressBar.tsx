import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion'

export const ProgressBar: React.FC = () => {
  const frame = useCurrentFrame()
  const { durationInFrames } = useVideoConfig()

  const progress = interpolate(frame, [0, durationInFrames], [0, 100], {
    extrapolateRight: 'clamp',
  })

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, height: 3,
      backgroundColor: 'rgba(255,255,255,0.06)',
      zIndex: 10,
    }}>
      <div style={{
        height: '100%', width: `${progress}%`,
        background: 'linear-gradient(90deg, #2563eb, #3b82f6)',
        borderRadius: '0 2px 2px 0',
      }} />
    </div>
  )
}
