import { interpolate, spring, useVideoConfig } from 'remotion'

const FONT = 'system-ui, -apple-system, sans-serif'

interface PageCalloutProps {
  step: number
  label: string
  frame: number
  startFrame: number
  duration: number
}

export const PageCallout: React.FC<PageCalloutProps> = ({ step, label, frame, startFrame, duration }) => {
  const { fps } = useVideoConfig()
  const localFrame = frame - startFrame

  if (localFrame < 0 || localFrame > duration) return null

  // Pill slides up from bottom — smooth spring entrance
  const enterProgress = spring({ frame: localFrame, fps, config: { damping: 200 } })

  // Fade out over last 18 frames
  const exitOpacity = interpolate(localFrame, [duration - 18, duration], [1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  })

  const opacity = interpolate(enterProgress, [0, 1], [0, 1]) * exitOpacity
  const y = interpolate(enterProgress, [0, 1], [24, 0])

  // Typewriter: reveal label character by character over ~20 frames
  const charsToShow = Math.floor(interpolate(localFrame, [4, 24], [0, label.length], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  }))
  const visibleLabel = label.slice(0, charsToShow)

  // Step dot color pulse — expands once on enter
  const dotScale = spring({ frame: localFrame - 2, fps, config: { damping: 12, stiffness: 200 } })

  return (
    <div style={{
      position: 'absolute', bottom: 48, left: '50%',
      transform: `translateX(-50%) translateY(${y}px)`,
      opacity,
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 20px 10px 14px',
      borderRadius: 999,
      backgroundColor: 'rgba(255,255,255,0.92)',
      backdropFilter: 'blur(12px)',
      boxShadow: '0 4px 24px rgba(0,0,0,0.18), 0 1px 4px rgba(0,0,0,0.10)',
      border: '1px solid rgba(0,0,0,0.06)',
    }}>
      {/* Step dot */}
      <div style={{
        width: 28, height: 28,
        borderRadius: '50%',
        backgroundColor: '#2563eb',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transform: `scale(${dotScale})`,
        flexShrink: 0,
      }}>
        <span style={{
          color: '#fff', fontFamily: FONT,
          fontSize: 11, fontWeight: 700, letterSpacing: '0.2px',
        }}>
          {step}
        </span>
      </div>

      {/* Typewriter label */}
      <span style={{
        fontFamily: FONT, fontSize: 15, fontWeight: 600,
        color: '#0f172a', letterSpacing: '-0.2px',
        whiteSpace: 'nowrap', minWidth: 120,
      }}>
        {visibleLabel}
        {/* Blinking cursor while typing */}
        {charsToShow < label.length && (
          <span style={{
            display: 'inline-block', width: 2, height: '1em',
            backgroundColor: '#2563eb', marginLeft: 2,
            opacity: Math.floor(localFrame / 4) % 2 === 0 ? 1 : 0,
            verticalAlign: 'text-bottom',
          }} />
        )}
      </span>
    </div>
  )
}
