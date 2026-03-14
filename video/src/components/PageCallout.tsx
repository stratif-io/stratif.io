import { interpolate } from 'remotion'

interface PageCalloutProps {
  label: string
  frame: number         // frame within the AppDemo scene
  startFrame: number    // when this callout begins
  duration: number      // how long it stays visible
}

export const PageCallout: React.FC<PageCalloutProps> = ({ label, frame, startFrame, duration }) => {
  const localFrame = frame - startFrame
  const fadeIn = interpolate(localFrame, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const fadeOut = interpolate(localFrame, [duration - 10, duration], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const opacity = Math.min(fadeIn, fadeOut)

  if (localFrame < 0 || localFrame > duration) return null

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 40,
        left: 40,
        opacity,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 20px',
        borderRadius: 10,
        backgroundColor: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.12)',
        color: '#ffffff',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: 18,
        fontWeight: 600,
        letterSpacing: '-0.3px',
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#3b82f6', display: 'inline-block' }} />
      {label}
    </div>
  )
}
