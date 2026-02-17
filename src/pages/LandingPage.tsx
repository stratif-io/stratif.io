import { useRef } from 'react'
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
        className="relative rounded-2xl p-6 backdrop-blur-sm"
        style={{
          background: 'rgba(8,13,20,0.85)',
          border: '1px solid rgba(56,189,248,0.12)',
          boxShadow: '0 0 80px -20px rgba(56,189,248,0.14), 0 0 0 1px rgba(56,189,248,0.04)',
        }}
      >
        {/* Chart header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: '#38bdf8', boxShadow: '0 0 6px #38bdf8' }}
            />
            <span
              className="text-[11px] uppercase tracking-widest"
              style={{ fontFamily: 'monospace', color: 'rgba(56,189,248,0.75)' }}
            >
              Events · Last 12 weeks
            </span>
          </div>
          <span className="text-[11px] text-emerald-400" style={{ fontFamily: 'monospace' }}>
            +24.8% ↑
          </span>
        </div>

        {/* SVG */}
        <svg width={W} height={H} className="overflow-visible">
          <defs>
            <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1d4ed8" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#1e40af" stopOpacity="0.15" />
            </linearGradient>
            <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#818cf8" />
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
              stroke="rgba(30,58,95,0.6)"
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
              fill="#080d14"
              stroke="#38bdf8"
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
              className="text-[10px] text-slate-600"
              style={{ fontFamily: 'monospace', width: `${barW}px`, textAlign: 'center', marginLeft: i === 0 ? `${gap}px` : `${gap - barW}px` }}
            >
              {m}
            </span>
          ))}
        </div>
      </div>

      {/* Floating cards */}
      <motion.div
        className="absolute -top-5 -right-6 rounded-xl px-4 py-3 backdrop-blur-sm"
        style={{
          background: 'rgba(8,13,20,0.92)',
          border: '1px solid rgba(56,189,248,0.12)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.9, duration: 0.5 }}
      >
        <div className="text-[10px] uppercase tracking-widest text-slate-500" style={{ fontFamily: 'monospace' }}>
          Total Users
        </div>
        <div className="text-xl font-bold text-[#38bdf8]" style={{ fontFamily: 'monospace' }}>
          12,847
        </div>
      </motion.div>

      <motion.div
        className="absolute -bottom-5 -left-6 rounded-xl px-4 py-3 backdrop-blur-sm"
        style={{
          background: 'rgba(8,13,20,0.92)',
          border: '1px solid rgba(56,189,248,0.12)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.15, duration: 0.5 }}
      >
        <div className="text-[10px] uppercase tracking-widest text-slate-500" style={{ fontFamily: 'monospace' }}>
          Conversion
        </div>
        <div className="text-xl font-bold text-emerald-400" style={{ fontFamily: 'monospace' }}>
          68.2%
        </div>
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
    title: 'Connect your database',
    desc: 'Point OpenFlow at your DuckDB, PostgreSQL, SQLite, or Databricks database. No data migration required.',
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
    <div
      className="min-h-screen antialiased"
      style={{ background: '#070b12', color: '#f1f5f9' }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&display=swap');
        .of-display { font-family: 'Syne', ui-sans-serif, system-ui, sans-serif; }
        .of-mono { font-family: ui-monospace, 'Cascadia Code', 'Fira Mono', monospace; }
      `}</style>

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav
        className="sticky top-0 z-50 backdrop-blur-md"
        style={{
          background: 'rgba(7,11,18,0.82)',
          borderBottom: '1px solid rgba(30,41,59,0.7)',
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
            <span className="of-display text-base font-bold tracking-tight text-white">OpenFlow</span>
          </Link>

          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild className="text-slate-300 hover:text-white">
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
              backgroundImage: 'radial-gradient(circle, rgba(56,189,248,0.13) 1px, transparent 1px)',
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
              background: 'radial-gradient(ellipse at center, rgba(29,78,216,0.18) 0%, transparent 70%)',
              transform: 'translate(-50%,-50%)',
            }}
          />
          <div
            className="absolute right-0 top-1/2"
            style={{
              width: '400px',
              height: '400px',
              background: 'radial-gradient(ellipse at center, rgba(56,189,248,0.08) 0%, transparent 70%)',
              transform: 'translateY(-50%)',
            }}
          />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-7xl px-6 py-20">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            {/* Copy */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={stagger(0.1)}
            >
              <motion.div variants={fadeUp} className="mb-6">
                <span
                  className="of-mono inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs uppercase tracking-widest"
                  style={{
                    background: 'rgba(13,26,46,0.9)',
                    border: '1px solid rgba(30,58,95,0.9)',
                    color: 'rgba(56,189,248,0.85)',
                  }}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full animate-pulse"
                    style={{ background: '#38bdf8' }}
                  />
                  Open-source product analytics
                </span>
              </motion.div>

              <motion.h1
                variants={fadeUp}
                className="of-display mb-6 text-5xl font-extrabold leading-[1.08] tracking-tight text-white lg:text-6xl xl:text-7xl"
              >
                Turn Data
                <br />
                <span
                  style={{
                    background: 'linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)',
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
                style={{ color: '#94a3b8' }}
              >
                Product analytics that gives you the full picture — trends, retention, funnels, and
                paths — in one open-source platform.
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
                    border: '1px solid rgba(30,58,95,0.9)',
                    color: '#94a3b8',
                  }}
                >
                  View features
                </Button>
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
      <section style={{ background: '#0a0f1a', borderTop: '1px solid rgba(30,41,59,0.7)', borderBottom: '1px solid rgba(30,41,59,0.7)' }}>
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
              <motion.div key={label} variants={sectionFade} className="flex flex-col items-center gap-2">
                <span className="of-mono text-4xl font-semibold text-white">{value}</span>
                <span className="of-mono text-xs uppercase tracking-[0.2em]" style={{ color: '#475569' }}>
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
            <h2 className="of-display mb-4 text-4xl font-extrabold text-white">
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
                  background: '#0a0f1a',
                  border: '1px solid rgba(30,41,59,0.8)',
                }}
                whileHover={{
                  borderColor: 'rgba(30,58,95,0.9)',
                  backgroundColor: '#0d1628',
                  boxShadow: '0 0 40px -12px rgba(56,189,248,0.18)',
                }}
              >
                <div
                  className="mb-4 inline-flex rounded-xl p-3"
                  style={{
                    background: 'rgba(29,78,216,0.1)',
                    border: '1px solid rgba(29,78,216,0.2)',
                  }}
                >
                  <Icon className="h-5 w-5" style={{ color: '#38bdf8' }} />
                </div>
                <h3 className="mb-2 font-semibold text-white">{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#475569' }}>
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
        style={{ background: '#0a0f1a', borderTop: '1px solid rgba(30,41,59,0.7)' }}
      >
        <div className="mx-auto max-w-7xl px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={sectionFade}
            className="mb-16 text-center"
          >
            <h2 className="of-display mb-4 text-4xl font-extrabold text-white">
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
                <div className="of-mono mb-4 text-6xl font-bold" style={{ color: 'rgba(30,58,95,0.8)' }}>
                  {n}
                </div>
                <div
                  className="pl-6"
                  style={{ borderLeft: '2px solid rgba(30,58,95,0.7)' }}
                >
                  <h3 className="mb-3 text-xl font-semibold text-white">{title}</h3>
                  <p className="leading-relaxed" style={{ color: '#475569' }}>
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
              'linear-gradient(135deg, rgba(29,78,216,0.25) 0%, rgba(7,11,18,1) 50%, rgba(76,29,149,0.15) 100%)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(56,189,248,0.07) 1px, transparent 1px)',
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
          <h2 className="of-display mb-4 text-4xl font-extrabold text-white lg:text-5xl">
            Ready to understand your users?
          </h2>
          <p className="mb-8 text-lg" style={{ color: '#94a3b8' }}>
            Free, open-source, and ready to connect to your database today.
          </p>
          <Button
            asChild
            size="lg"
            className="gap-2 px-10 text-base font-semibold"
            style={{ background: '#ffffff', color: '#070b12' }}
          >
            <Link to="/auth/register">
              Get started free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </motion.div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer style={{ background: '#070b12', borderTop: '1px solid rgba(30,41,59,0.7)' }}>
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
          <Link to="/" className="flex items-center gap-2.5">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-lg"
              style={{ background: '#1d4ed8' }}
            >
              <span className="of-display text-xs font-bold text-white">O</span>
            </div>
            <span className="of-display text-sm font-bold text-white">OpenFlow</span>
          </Link>

          <p className="of-mono text-xs" style={{ color: '#334155' }}>
            © 2026 OpenFlow Analytics
          </p>

          <div className="flex items-center gap-5">
            <Link
              to="/auth/login"
              className="text-xs transition-colors"
              style={{ color: '#475569' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#94a3b8')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#475569')}
            >
              Sign in
            </Link>
            <Link
              to="/auth/register"
              className="text-xs transition-colors"
              style={{ color: '#475569' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#94a3b8')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#475569')}
            >
              Get started
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
