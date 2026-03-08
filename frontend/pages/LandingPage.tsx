import React, { useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { TrendingUp, Users, Route, Filter, Table, Database, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

// ─── Animation presets ───────────────────────────────────────────────────────

const ease: [number, number, number, number] = [0.16, 1, 0.3, 1]

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease } },
}

const sectionFade = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease } },
}

const stagger = (delay = 0.08) => ({
  hidden: {},
  visible: { transition: { staggerChildren: delay } },
})

// ─── Warehouse Logos ─────────────────────────────────────────────────────────

function DatabricksIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <polygon points="12,3 21.5,8.25 12,13.5 2.5,8.25" fill="#FF3621" />
      <polygon points="2.5,8.25 12,13.5 12,21 2.5,15.75" fill="#C41E0A" />
      <polygon points="21.5,8.25 12,13.5 12,21 21.5,15.75" fill="#FF5A3A" />
    </svg>
  )
}

function SnowflakeIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <g stroke="#29B5E8" strokeWidth="2.2" strokeLinecap="round">
        <line x1="12" y1="2" x2="12" y2="22" />
        <line x1="2.5" y1="7" x2="21.5" y2="17" />
        <line x1="21.5" y1="7" x2="2.5" y2="17" />
        <line x1="12" y1="6" x2="9" y2="9" />
        <line x1="12" y1="6" x2="15" y2="9" />
        <line x1="12" y1="18" x2="9" y2="15" />
        <line x1="12" y1="18" x2="15" y2="15" />
        <line x1="16.8" y1="9.5" x2="13.8" y2="10.8" />
        <line x1="16.8" y1="9.5" x2="17.3" y2="12.5" />
        <line x1="7.2" y1="14.5" x2="10.2" y2="13.2" />
        <line x1="7.2" y1="14.5" x2="6.7" y2="11.5" />
        <line x1="7.2" y1="9.5" x2="10.2" y2="10.8" />
        <line x1="7.2" y1="9.5" x2="6.7" y2="12.5" />
        <line x1="16.8" y1="14.5" x2="13.8" y2="13.2" />
        <line x1="16.8" y1="14.5" x2="17.3" y2="11.5" />
      </g>
    </svg>
  )
}

function PostgreSQLIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="10" r="7" fill="#336791" />
      <ellipse cx="4.5" cy="8.5" rx="2.5" ry="3.5" fill="#4a8bc4" />
      <path
        d="M 17 12 Q 21 14 20.5 19 Q 20 21 18 20.5 Q 16 20 16.5 17"
        fill="none"
        stroke="#336791"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="12" cy="9" r="1.5" fill="white" />
      <circle cx="12.3" cy="9" r="0.7" fill="#1e3a5f" />
    </svg>
  )
}

function DuckDBIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="11" fill="#FFD800" />
      <path
        d="M 3.5 15.5 Q 6 20.5 12 20.5 Q 18 20.5 20 16.5 Q 18 12.5 12 12.5 Q 6 12.5 3.5 15.5z"
        fill="#1a1a1a"
      />
      <circle cx="16.5" cy="9.5" r="4" fill="#1a1a1a" />
      <path d="M 20 9.5 L 22.5 8.5 L 22.5 10.5 Z" fill="#FF9900" />
      <circle cx="17.5" cy="8.5" r="1" fill="white" />
      <circle cx="17.7" cy="8.5" r="0.5" fill="#1a1a1a" />
    </svg>
  )
}

const warehouses: { name: string; Icon: React.FC<{ size?: number }> }[] = [
  { name: 'Databricks', Icon: DatabricksIcon },
  { name: 'Snowflake', Icon: SnowflakeIcon },
  { name: 'PostgreSQL', Icon: PostgreSQLIcon },
  { name: 'DuckDB', Icon: DuckDBIcon },
]

// ─── Hero Chart ──────────────────────────────────────────────────────────────

function HeroChart() {
  const bars = [38, 55, 42, 71, 58, 85, 64, 90, 72, 88, 95, 78]
  const W = 460
  const H = 190
  const barW = 26
  const gap = (W - bars.length * barW) / (bars.length + 1)

  const points: [number, number][] = bars.map((h, i) => [
    gap + i * (barW + gap) + barW / 2,
    H - (h / 100) * H,
  ])

  const pathD = points
    .map(([x, y], i) => {
      if (i === 0) return `M ${x},${y}`
      const [px, py] = points[i - 1]
      return `C ${px + 18},${py} ${x - 18},${y} ${x},${y}`
    })
    .join(' ')

  return (
    <div className="relative select-none" aria-hidden="true">
      {/* Main chart card */}
      <div
        className="relative rounded-2xl p-6"
        style={{
          background: '#ffffff',
          border: '1px solid rgba(226,232,240,0.9)',
          boxShadow: '0 20px 50px -10px rgba(0,0,0,0.1), 0 0 0 1px rgba(226,232,240,0.6)',
        }}
      >
        {/* Chart header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ background: '#3b82f6' }} />
            <span
              className="of-mono text-[11px] uppercase tracking-widest"
              style={{ color: '#64748b' }}
            >
              Events · Last 12 weeks
            </span>
          </div>
          <span className="of-mono text-[11px] text-emerald-600">+24.8% ↑</span>
        </div>

        {/* SVG */}
        <svg width={W} height={H} className="overflow-visible">
          <defs>
            <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0.15" />
            </linearGradient>
            <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#0ea5e9" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0.25, 0.5, 0.75, 1].map((t) => (
            <line
              key={t}
              x1={0}
              y1={H * (1 - t)}
              x2={W}
              y2={H * (1 - t)}
              stroke="rgba(226,232,240,0.8)"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          ))}

          {/* Bars */}
          {bars.map((h, i) => {
            const x = gap + i * (barW + gap)
            const bh = (h / 100) * H
            return (
              <motion.rect
                key={i}
                x={x}
                width={barW}
                rx={3}
                fill="url(#barGrad)"
                initial={{ y: H, height: 0 }}
                animate={{ y: H - bh, height: bh }}
                transition={{ duration: 0.55, delay: 0.3 + i * 0.055, ease }}
              />
            )
          })}

          {/* Line */}
          <motion.path
            d={pathD}
            fill="none"
            stroke="url(#lineGrad)"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.6, delay: 0.85, ease: 'easeOut' }}
          />

          {/* Points */}
          {points.map(([x, y], i) => (
            <motion.circle
              key={i}
              cx={x}
              cy={y}
              r={4}
              fill="#ffffff"
              stroke="#3b82f6"
              strokeWidth={2}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.25, delay: 0.85 + i * 0.09 }}
            />
          ))}
        </svg>

        {/* X labels */}
        <div className="mt-2 flex justify-between">
          {['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'].map((m, i) => (
            <span
              key={i}
              className="of-mono text-[10px] text-slate-400"
              style={{
                width: `${barW}px`,
                textAlign: 'center',
                marginLeft: i === 0 ? `${gap}px` : `${gap - barW}px`,
              }}
            >
              {m}
            </span>
          ))}
        </div>
      </div>

      {/* Floating cards */}
      <motion.div
        className="absolute -top-5 -right-6 rounded-xl px-4 py-3"
        style={{
          background: '#ffffff',
          border: '1px solid rgba(226,232,240,0.9)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
        }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.9, duration: 0.5 }}
      >
        <div className="of-mono text-[10px] uppercase tracking-widest text-slate-400">
          Total Users
        </div>
        <div className="of-mono text-xl font-bold text-blue-600">12,847</div>
      </motion.div>

      <motion.div
        className="absolute -bottom-5 -left-6 rounded-xl px-4 py-3"
        style={{
          background: '#ffffff',
          border: '1px solid rgba(226,232,240,0.9)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
        }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.15, duration: 0.5 }}
      >
        <div className="of-mono text-[10px] uppercase tracking-widest text-slate-400">
          Conversion
        </div>
        <div className="of-mono text-xl font-bold text-emerald-600">68.2%</div>
      </motion.div>
    </div>
  )
}

// ─── Data ────────────────────────────────────────────────────────────────────

const features = [
  {
    icon: TrendingUp,
    title: 'Trends',
    desc: 'Track event counts and unique users over time with day or week granularity. Spot growth patterns instantly.',
  },
  {
    icon: Users,
    title: 'Retention',
    desc: 'Understand how many users return after their first session — and exactly when they stop coming back.',
  },
  {
    icon: Route,
    title: 'User Paths',
    desc: 'Visualize the routes users take through your product before and after any key event.',
  },
  {
    icon: Filter,
    title: 'Funnel Analysis',
    desc: 'Identify precisely where users drop off in your key conversion flows and quantify the gap.',
  },
  {
    icon: Table,
    title: 'Pivot Explorer',
    desc: 'Slice your event data across any combination of dimensions with a flexible pivot table.',
  },
  {
    icon: Database,
    title: 'Raw Events',
    desc: 'Browse and filter every event as it happened, with full property inspection and export.',
  },
]

const steps = [
  {
    n: '01',
    title: 'Connect your warehouse',
    desc: 'Point OpenFlow at your Databricks, Snowflake, PostgreSQL, or DuckDB warehouse. No pipelines, no data copies, no lock-in.',
  },
  {
    n: '02',
    title: 'Configure your schema',
    desc: 'Map your existing columns — user ID, timestamp, event name — with our one-click schema detector.',
  },
  {
    n: '03',
    title: 'Explore your data',
    desc: 'Instantly access trends, funnels, retention, and path analysis. Zero SQL, all insight.',
  },
]

// ─── Page ────────────────────────────────────────────────────────────────────

export function LandingPage() {
  const featuresRef = useRef<HTMLElement>(null)

  const scrollToFeatures = () => {
    featuresRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen antialiased" style={{ background: '#ffffff', color: '#0f172a' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        .of-display { font-family: 'Inter', ui-sans-serif, system-ui, sans-serif; }
        .of-mono { font-family: ui-monospace, 'Cascadia Code', 'Fira Mono', monospace; }
      `}</style>

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav
        className="sticky top-0 z-50 backdrop-blur-md"
        style={{
          background: 'rgba(255,255,255,0.92)',
          borderBottom: '1px solid rgba(226,232,240,0.9)',
        }}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ background: '#1d4ed8' }}
            >
              <span className="of-display text-sm font-bold text-white">O</span>
            </div>
            <span className="of-display text-base font-bold tracking-tight text-slate-900">
              OpenFlow
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild className="text-slate-600 hover:text-slate-900">
              <Link to="/auth/login">Sign in</Link>
            </Button>
            <Button asChild className="text-white border-0" style={{ background: '#1d4ed8' }}>
              <Link to="/auth/register">Get started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative flex min-h-[calc(100vh-64px)] items-center overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'radial-gradient(circle, rgba(99,102,241,0.06) 1px, transparent 1px)',
              backgroundSize: '32px 32px',
            }}
          />
          <div
            className="absolute"
            style={{
              left: '30%',
              top: '30%',
              width: '700px',
              height: '500px',
              background:
                'radial-gradient(ellipse at center, rgba(59,130,246,0.07) 0%, transparent 70%)',
              transform: 'translate(-50%,-50%)',
            }}
          />
          <div
            className="absolute right-0 top-1/2"
            style={{
              width: '400px',
              height: '400px',
              background:
                'radial-gradient(ellipse at center, rgba(99,102,241,0.05) 0%, transparent 70%)',
              transform: 'translateY(-50%)',
            }}
          />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-7xl px-6 py-20">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            {/* Copy */}
            <motion.div initial="hidden" animate="visible" variants={stagger(0.1)}>
              <motion.div variants={fadeUp} className="mb-6">
                <span
                  className="of-mono inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs uppercase tracking-widest"
                  style={{
                    background: 'rgba(239,246,255,0.9)',
                    border: '1px solid rgba(147,197,253,0.6)',
                    color: '#2563eb',
                  }}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full animate-pulse"
                    style={{ background: '#3b82f6' }}
                  />
                  Warehouse-native · Open-source
                </span>
              </motion.div>

              <motion.h1
                variants={fadeUp}
                className="of-display mb-6 text-5xl font-extrabold leading-[1.08] tracking-tight text-slate-900 lg:text-6xl xl:text-7xl"
              >
                Turn Data
                <br />
                <span
                  style={{
                    background: 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  Into Decisions
                </span>
              </motion.h1>

              <motion.p
                variants={fadeUp}
                className="mb-8 max-w-lg text-lg leading-relaxed"
                style={{ color: '#64748b' }}
              >
                Product analytics that queries your data warehouse directly — no Fivetran pipeline,
                no per-event fees, no $40k Amplitude or Heap contract. Your data stays where it
                already lives.
              </motion.p>

              <motion.div variants={fadeUp} className="flex flex-wrap gap-4">
                <Button
                  asChild
                  size="lg"
                  className="gap-2 px-8 text-base text-white border-0"
                  style={{ background: '#1d4ed8' }}
                >
                  <Link to="/auth/register">
                    Get started free
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={scrollToFeatures}
                  className="px-8 text-base"
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(203,213,225,0.9)',
                    color: '#64748b',
                  }}
                >
                  View features
                </Button>
              </motion.div>

              <motion.div variants={fadeUp} className="pt-2">
                <p className="mb-3 text-xs font-medium uppercase tracking-widest text-slate-400">
                  Connects to
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {warehouses.map(({ name, Icon }) => (
                    <div
                      key={name}
                      className="flex items-center gap-2 rounded-lg px-3 py-1.5"
                      style={{
                        background: '#f8fafc',
                        border: '1px solid rgba(203,213,225,0.8)',
                        color: '#475569',
                      }}
                    >
                      <Icon size={15} />
                      <span className="of-mono text-xs font-medium">{name}</span>
                    </div>
                  ))}
                  <div
                    className="flex items-center rounded-lg px-3 py-1.5 text-xs"
                    style={{
                      border: '1px dashed rgba(203,213,225,0.8)',
                      color: '#94a3b8',
                    }}
                  >
                    + more coming
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* Chart */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.9, delay: 0.3, ease }}
              className="hidden lg:block"
            >
              <HeroChart />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────────────────────────── */}
      <section
        style={{
          background: '#f8fafc',
          borderTop: '1px solid rgba(226,232,240,0.9)',
          borderBottom: '1px solid rgba(226,232,240,0.9)',
        }}
      >
        <div className="mx-auto max-w-7xl px-6 py-14">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger(0.15)}
            className="grid grid-cols-1 gap-10 text-center sm:grid-cols-3"
          >
            {[
              { value: '80,000+', label: 'Events Analyzed' },
              { value: '60 Days', label: 'of History' },
              { value: '4', label: 'Chart Types' },
            ].map(({ value, label }) => (
              <motion.div
                key={label}
                variants={sectionFade}
                className="flex flex-col items-center gap-2"
              >
                <span className="of-mono text-4xl font-semibold text-slate-900">{value}</span>
                <span
                  className="of-mono text-xs uppercase tracking-[0.2em]"
                  style={{ color: '#94a3b8' }}
                >
                  {label}
                </span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section ref={featuresRef} id="features" className="py-28">
        <div className="mx-auto max-w-7xl px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={sectionFade}
            className="mb-16 text-center"
          >
            <h2 className="of-display mb-4 text-4xl font-extrabold text-slate-900">
              Everything you need
            </h2>
            <p className="mx-auto max-w-xl" style={{ color: '#64748b' }}>
              Six views into your data, each designed to answer a specific question your team is
              asking right now.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger(0.07)}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {features.map(({ icon: Icon, title, desc }) => (
              <motion.div
                key={title}
                variants={fadeUp}
                className="group rounded-2xl p-6 transition-all duration-300"
                style={{
                  background: '#ffffff',
                  border: '1px solid rgba(226,232,240,0.8)',
                }}
                whileHover={{
                  borderColor: 'rgba(147,197,253,0.6)',
                  backgroundColor: '#f0f9ff',
                  boxShadow: '0 0 40px -12px rgba(59,130,246,0.12)',
                }}
              >
                <div
                  className="mb-4 inline-flex rounded-xl p-3"
                  style={{
                    background: 'rgba(239,246,255,0.9)',
                    border: '1px solid rgba(147,197,253,0.4)',
                  }}
                >
                  <Icon className="h-5 w-5" style={{ color: '#2563eb' }} />
                </div>
                <h3 className="mb-2 font-semibold text-slate-900">{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#64748b' }}>
                  {desc}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────────────── */}
      <section
        className="py-28"
        style={{ background: '#f8fafc', borderTop: '1px solid rgba(226,232,240,0.9)' }}
      >
        <div className="mx-auto max-w-7xl px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={sectionFade}
            className="mb-16 text-center"
          >
            <h2 className="of-display mb-4 text-4xl font-extrabold text-slate-900">
              Get started in minutes
            </h2>
            <p style={{ color: '#64748b' }}>
              No infrastructure to manage. No vendor lock-in. Just connect and explore.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger(0.15)}
            className="grid grid-cols-1 gap-12 lg:grid-cols-3"
          >
            {steps.map(({ n, title, desc }) => (
              <motion.div key={n} variants={fadeUp}>
                <div
                  className="of-mono mb-4 text-6xl font-bold"
                  style={{ color: 'rgba(203,213,225,1)' }}
                >
                  {n}
                </div>
                <div className="pl-6" style={{ borderLeft: '2px solid rgba(203,213,225,0.9)' }}>
                  <h3 className="mb-3 text-xl font-semibold text-slate-900">{title}</h3>
                  <p className="leading-relaxed" style={{ color: '#64748b' }}>
                    {desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-28">
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(135deg, rgba(239,246,255,1) 0%, rgba(255,255,255,1) 40%, rgba(245,243,255,1) 100%)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(99,102,241,0.05) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={sectionFade}
          className="relative z-10 mx-auto max-w-3xl px-6 text-center"
        >
          <h2 className="of-display mb-4 text-4xl font-extrabold text-slate-900 lg:text-5xl">
            Ready to understand your users?
          </h2>
          <p className="mb-8 text-lg" style={{ color: '#64748b' }}>
            Free, open-source, and ready to connect to your database today.
          </p>
          <Button
            asChild
            size="lg"
            className="gap-2 px-10 text-base font-semibold text-white border-0"
            style={{ background: '#0f172a' }}
          >
            <Link to="/auth/register">
              Get started free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </motion.div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer style={{ background: '#f8fafc', borderTop: '1px solid rgba(226,232,240,0.9)' }}>
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
          <Link to="/" className="flex items-center gap-2.5">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-lg"
              style={{ background: '#1d4ed8' }}
            >
              <span className="of-display text-xs font-bold text-white">O</span>
            </div>
            <span className="of-display text-sm font-bold text-slate-900">OpenFlow</span>
          </Link>

          <p className="of-mono text-xs" style={{ color: '#94a3b8' }}>
            © 2026 OpenFlow Analytics
          </p>

          <div className="flex items-center gap-5">
            <Link
              to="/auth/login"
              className="text-xs transition-colors text-slate-400 hover:text-slate-500"
            >
              Sign in
            </Link>
            <Link
              to="/auth/register"
              className="text-xs transition-colors text-slate-400 hover:text-slate-500"
            >
              Get started
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
