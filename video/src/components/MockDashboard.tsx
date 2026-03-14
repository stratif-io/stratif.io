import { interpolate } from 'remotion'

interface MockDashboardProps {
  frame: number
  fps: number
  sidebarX: number
  contentOpacity: number
  contentY: number
}

const NAV_ITEMS = ['Dashboard', 'Trends', 'Retention', 'Funnels', 'Paths', 'Connections']

const METRICS = [
  { label: 'Total Events', value: 284_500, color: '#3b82f6' },
  { label: 'Active Users', value: 12_840, color: '#8b5cf6' },
  { label: 'Avg Session', value: '4m 32s', color: '#10b981', isString: true },
  { label: 'Conversion', value: '3.8%', color: '#f59e0b', isString: true },
]

const CHART_BARS = [42, 68, 55, 80, 61, 74, 90, 65, 78, 83, 70, 95]

function AnimatedNumber({ target, frame, startFrame }: { target: number; frame: number; startFrame: number }) {
  const progress = interpolate(frame, [startFrame, startFrame + 80], [0, 1], { extrapolateRight: 'clamp' })
  const current = Math.floor(target * progress)
  return <>{current.toLocaleString()}</>
}

export const MockDashboard: React.FC<MockDashboardProps> = ({
  frame,
  sidebarX,
  contentOpacity,
  contentY,
}) => {
  const chartProgress = interpolate(frame, [60, 180], [0, 1], { extrapolateRight: 'clamp' })

  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        borderRadius: 12,
        overflow: 'hidden',
        border: '1px solid #27272a',
        backgroundColor: '#09090b',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Sidebar */}
      <div
        style={{
          transform: `translateX(${sidebarX}px)`,
          width: 220,
          backgroundColor: '#111113',
          borderRight: '1px solid #1f1f23',
          display: 'flex',
          flexDirection: 'column',
          padding: '20px 12px',
          gap: 4,
          flexShrink: 0,
        }}
      >
        <div style={{ color: '#ffffff', fontWeight: 700, fontSize: 15, padding: '0 8px 16px', letterSpacing: '-0.3px' }}>
          OpenFlow
        </div>
        {NAV_ITEMS.map((item, i) => (
          <div
            key={item}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              color: i === 0 ? '#ffffff' : '#71717a',
              backgroundColor: i === 0 ? '#27272a' : 'transparent',
              fontSize: 14,
              fontWeight: i === 0 ? 500 : 400,
            }}
          >
            {item}
          </div>
        ))}
      </div>

      {/* Main content */}
      <div
        style={{
          flex: 1,
          opacity: contentOpacity,
          transform: `translateY(${contentY}px)`,
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ color: '#ffffff', fontSize: 20, fontWeight: 600, letterSpacing: '-0.5px' }}>
            Dashboard
          </div>
          <div style={{
            padding: '6px 14px',
            borderRadius: 8,
            backgroundColor: '#18181b',
            border: '1px solid #27272a',
            color: '#a1a1aa',
            fontSize: 13,
          }}>
            Last 30 days
          </div>
        </div>

        {/* Metric cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {METRICS.map((metric, i) => (
            <div
              key={metric.label}
              style={{
                padding: '16px 18px',
                borderRadius: 10,
                backgroundColor: '#18181b',
                border: '1px solid #27272a',
              }}
            >
              <div style={{ color: '#71717a', fontSize: 12, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {metric.label}
              </div>
              <div style={{ color: metric.color, fontSize: 24, fontWeight: 700, letterSpacing: '-1px' }}>
                {metric.isString ? metric.value : (
                  <AnimatedNumber target={metric.value as number} frame={frame} startFrame={i * 15} />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div style={{
          flex: 1,
          padding: '18px 20px',
          borderRadius: 10,
          backgroundColor: '#18181b',
          border: '1px solid #27272a',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}>
          <div style={{ color: '#a1a1aa', fontSize: 13, fontWeight: 500 }}>Events over time</div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 6 }}>
            {CHART_BARS.map((height, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  borderRadius: '4px 4px 0 0',
                  backgroundColor: '#3b82f6',
                  height: `${height * chartProgress}%`,
                  opacity: 0.7 + (i / CHART_BARS.length) * 0.3,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
