import { useState, useEffect, useRef, type ReactNode, type CSSProperties } from 'react'
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import {
  motion, AnimatePresence, useScroll, useTransform,
} from 'framer-motion'

/* ══════════════════════════════════════════════════
   SHARED / REUSABLE COMPONENTS
══════════════════════════════════════════════════ */

function FadeIn({
  children,
  delay = 0,
  duration = 0.7,
  x = 0,
  y = 30,
  className = '',
  as: Tag = 'div',
}: {
  children: ReactNode
  delay?: number
  duration?: number
  x?: number
  y?: number
  className?: string
  as?: keyof typeof motion
}) {
  const MotionTag = motion[Tag] as typeof motion.div
  return (
    <MotionTag
      initial={{ opacity: 0, x, y }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: '50px', amount: 0 }}
      transition={{ duration, delay, ease: [0.25, 0.1, 0.25, 1] }}
      className={className}
    >
      {children}
    </MotionTag>
  )
}

/* ── Magnet: mouse-following magnetic hover ─────── */
function Magnet({
  children,
  padding = 150,
  strength = 3,
  className = '',
}: {
  children: ReactNode
  padding?: number
  strength?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [active, setActive] = useState(false)

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      const el = ref.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const dx = e.clientX - cx
      const dy = e.clientY - cy
      const dist = Math.sqrt(dx * dx + dy * dy)
      const maxDist = Math.max(rect.width, rect.height) / 2 + padding

      if (dist < maxDist) {
        setActive(true)
        setPos({ x: dx / strength, y: dy / strength })
      } else {
        setActive(false)
        setPos({ x: 0, y: 0 })
      }
    }
    window.addEventListener('mousemove', handleMove, { passive: true })
    return () => window.removeEventListener('mousemove', handleMove)
  }, [padding, strength])

  return (
    <div
      ref={ref}
      className={className}
      style={{
        transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
        transition: active ? 'transform 0.3s ease-out' : 'transform 0.6s ease-in-out',
        willChange: 'transform',
      }}
    >
      {children}
    </div>
  )
}

/* ── AnimatedText: char-by-char scroll reveal ───── */
function AnimatedText({
  text, className = '', style,
}: { text: string; className?: string; style?: CSSProperties }) {
  const ref = useRef<HTMLParagraphElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 0.8', 'end 0.2'],
  })

  const chars = text.split('')

  return (
    <p ref={ref} className={className} style={style}>
      {chars.map((char, i) => {
        const start = i / chars.length
        const end = start + 1 / chars.length
        return <Char key={i} char={char} progress={scrollYProgress} start={start} end={end} />
      })}
    </p>
  )
}

function Char({
  char, progress, start, end,
}: {
  char: string
  progress: ReturnType<typeof useScroll>['scrollYProgress']
  start: number
  end: number
}) {
  const opacity = useTransform(progress, [start, end], [0.2, 1])
  return (
    <span style={{ position: 'relative' }}>
      <span style={{ visibility: 'hidden' }}>{char}</span>
      <motion.span style={{ position: 'absolute', left: 0, top: 0, opacity }}>
        {char}
      </motion.span>
    </span>
  )
}

/* ── Contact Button ──────────────────────────────── */
function ContactButton({ className = '' }: { className?: string }) {
  return (
    <a
      href="mailto:hello@rebel-realm.com"
      className={`inline-flex items-center justify-center rounded-full text-white font-medium uppercase tracking-widest
        px-8 py-3 sm:px-10 sm:py-3.5 md:px-12 md:py-4 text-xs sm:text-sm md:text-base
        transition-all duration-200 cursor-pointer hover:brightness-110 active:scale-[0.97] ${className}`}
      style={{
        background: 'linear-gradient(135deg, #4E85BF 0%, #89AACC 100%)',
        boxShadow: '0 4px 20px rgba(78, 133, 191, 0.35)',
        border: '1px solid rgba(215, 226, 234, 0.3)',
      }}
    >
      Contact Us
    </a>
  )
}

/* ── Live Project Button ─────────────────────────── */
function LiveProjectButton({ to, className = '' }: { to?: string; className?: string }) {
  const classes = `inline-flex items-center justify-center rounded-full border-2 border-[#D7E2EA] text-[#D7E2EA] font-medium uppercase tracking-widest
    px-8 py-3 sm:px-10 sm:py-3.5 text-sm sm:text-base hover:bg-[#D7E2EA]/10 active:scale-[0.97] transition-all duration-200 cursor-pointer whitespace-nowrap ${className}`
  if (to) {
    return <Link to={to} className={classes}>Live Project</Link>
  }
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full border-2 border-[#D7E2EA]/25 text-[#D7E2EA]/40 font-medium uppercase tracking-widest
        px-8 py-3 sm:px-10 sm:py-3.5 text-sm sm:text-base cursor-default select-none whitespace-nowrap ${className}`}
    >
      Coming Soon
    </span>
  )
}

/* ══════════════════════════════════════════════════
   HERO SECTION
══════════════════════════════════════════════════ */
const NAV_LINKS = [
  { label: 'About', href: '#about' },
  { label: 'Values', href: '#values' },
  { label: 'Projects', href: '#projects' },
]

function HeroSection() {
  return (
    <section className="h-dvh flex flex-col relative" style={{ overflowX: 'clip' }}>
      {/* Navbar */}
      <FadeIn delay={0} y={-20}>
        <nav className="flex items-center justify-between px-8 sm:px-12 md:px-16 lg:px-20 pt-7 md:pt-9">
          {NAV_LINKS.map(link => (
            <a
              key={link.label}
              href={link.href}
              className="text-[#D7E2EA] font-medium uppercase tracking-wider text-sm md:text-lg lg:text-[1.4rem] hover:opacity-70 active:opacity-50 transition-opacity duration-200"
            >
              {link.label}
            </a>
          ))}
          <span className="text-[#D7E2EA]/50 font-medium uppercase tracking-wider text-sm md:text-lg lg:text-[1.4rem] cursor-default select-none">
            Secret Project
          </span>
        </nav>
      </FadeIn>

      {/* Hero Heading */}
      <div className="mt-6 sm:mt-4 md:mt-2">
        <div className="overflow-hidden">
          <FadeIn delay={0.15} y={40}>
            <h1
              className="hero-heading font-black uppercase tracking-tight leading-[0.95] whitespace-nowrap w-full text-center"
              style={{ fontSize: 'clamp(3rem, 16vw, 17.5vw)' }}
            >
              We Are
            </h1>
          </FadeIn>
        </div>
        <div className="overflow-hidden">
          <FadeIn delay={0.25} y={40}>
            <h1
              className="hero-heading font-black uppercase tracking-tight leading-[0.95] whitespace-nowrap w-full text-center"
              style={{ fontSize: 'clamp(3rem, 16vw, 17.5vw)' }}
            >
              Rebel Realm
            </h1>
          </FadeIn>
        </div>
      </div>

      {/* Portrait / Mark — centered in remaining space */}
      <div className="flex-1 flex items-center justify-center relative min-h-0">
        <div className="w-[27vmin] sm:w-[29vmin] md:w-[31vmin] lg:w-[32vmin] max-w-[450px] aspect-square">
          <Magnet padding={150} strength={3} className="w-full h-full">
            <div
              className="w-full h-full rounded-full overflow-hidden flex items-center justify-center"
              style={{
                background: '#0C0C0C',
                border: '1px solid rgba(215, 226, 234, 0.15)',
                boxShadow: '0 0 80px rgba(137, 170, 204, 0.15), inset 0 0 60px rgba(0,0,0,0.6)',
              }}
            >
              {/* logo.png is a transparent/white-mark PNG — rendered over a solid
                  black backdrop so the white mark reads clearly in the circle.
                  Scaled up beyond 100% and clipped by the circle's overflow-hidden
                  mask, since object-contain alone reads too small at this aspect ratio. */}
              <img
                src="/logo.png"
                alt="Rebel Realm"
                className="w-full h-full object-contain"
                style={{ transform: 'scale(1.6)' }}
              />
            </div>
          </Magnet>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="pb-16 sm:pb-20 md:pb-24 px-8 sm:px-12 md:px-16 lg:px-20">
        <FadeIn delay={0.35} y={20}>
          <p
            className="text-[#D7E2EA]/80 font-light tracking-wide leading-snug w-full text-center"
            style={{ fontSize: 'clamp(1rem, 2.4vw, 2rem)' }}
          >
            We build games people are still arguing about years down the line.
          </p>
        </FadeIn>
      </div>
    </section>
  )
}

/* ══════════════════════════════════════════════════
   Fallback placeholder image used when a project image
   fails to load.
══════════════════════════════════════════════════ */
const PLACEHOLDER_FALLBACK =
  'data:image/svg+xml;utf8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="336">
      <rect width="240" height="336" fill="#141414"/>
      <text x="50%" y="50%" fill="#4a4a4a" font-family="sans-serif" font-size="14" text-anchor="middle" dominant-baseline="middle">REBEL REALM</text>
    </svg>`
  )

/* ══════════════════════════════════════════════════
   ABOUT SECTION
══════════════════════════════════════════════════ */
function AboutSection() {
  return (
    <section id="about" className="min-h-dvh flex items-center justify-center relative px-5 sm:px-8 md:px-10 py-20 overflow-hidden">
      {/* Ambient glow, echoes the hero mark's accent hue */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 50% 40%, rgba(78, 133, 191, 0.08) 0%, transparent 55%)',
        }}
      />

      <div className="flex flex-col items-center gap-10 sm:gap-14 md:gap-16 relative z-10">
        <FadeIn delay={0} y={40}>
          <h2
            className="hero-heading font-black uppercase leading-none tracking-tight text-center"
            style={{ fontSize: 'clamp(3rem, 12vw, 160px)' }}
          >
            About Us
          </h2>
        </FadeIn>

        <div className="flex flex-col items-center gap-16 sm:gap-20 md:gap-24">
          <AnimatedText
            text="Rebel Realm is a studio building games, software and consulting on product and design. We're building games we're still proud of 10 years from now."
            className="text-[#D7E2EA] font-medium text-center max-w-3xl"
            style={{ fontSize: 'clamp(1.25rem, 2.6vw, 2.1rem)', lineHeight: 1.5 }}
          />
          <ContactButton />
        </div>
      </div>
    </section>
  )
}

/* ══════════════════════════════════════════════════
   CORE VALUES SECTION
══════════════════════════════════════════════════ */
const VALUES = [
  {
    num: '01',
    name: 'Deep Mastery',
    desc: 'Minutes to learn. Years to master.',
  },
  {
    num: '02',
    name: 'Player-Obsessed',
    desc: 'Built with our community, not just for them.',
  },
  {
    num: '03',
    name: 'Creative Expression',
    desc: 'Every system leaves room for your own style.',
  },
]

function ServicesSection() {
  return (
    <section id="values" className="bg-white rounded-t-[40px] sm:rounded-t-[50px] md:rounded-t-[60px] px-6 sm:px-10 md:px-16 lg:px-20 py-20 sm:py-24 md:py-32">
      <FadeIn>
        <h2
          className="text-[#0C0C0C] font-black uppercase text-center"
          style={{ fontSize: 'clamp(3rem, 12vw, 160px)' }}
        >
          Core Values
        </h2>
      </FadeIn>
      <div className="w-full mt-16 sm:mt-20 md:mt-28">
        {VALUES.map((s, i) => (
          <FadeIn key={s.name} delay={i * 0.1}>
            <div
              className="py-10 sm:py-12 md:py-16"
              style={{ borderBottom: '1px solid rgba(12, 12, 12, 0.15)' }}
            >
              <h3
                className="font-black text-[#0C0C0C] uppercase leading-[0.95] mb-4 md:mb-6"
                style={{ fontSize: 'clamp(2.25rem, 6.5vw, 6.5rem)' }}
              >
                {s.name}
              </h3>
              <p
                className="text-[#0C0C0C] font-light leading-relaxed max-w-3xl"
                style={{ fontSize: 'clamp(1rem, 1.8vw, 1.4rem)', opacity: 0.6 }}
              >
                {s.desc}
              </p>
            </div>
          </FadeIn>
        ))}
      </div>
    </section>
  )
}

/* ══════════════════════════════════════════════════
   PROJECTS SECTION (sticky stacking cards)
══════════════════════════════════════════════════ */
type Project = {
  num: string
  category: string
  name: string
  col1: [string, string]
  col2: string
  live?: string
}

const PLACEHOLDER_IMG = (label: string, w: number, h: number) =>
  `https://placehold.co/${w}x${h}/141414/4a4a4a?text=${encodeURIComponent(label)}&font=roboto`

const PROJECTS: Project[] = [
  {
    num: '01',
    category: 'Coming Soon',
    name: 'Secret Project 1',
    col1: [
      PLACEHOLDER_IMG('Secret Project 1', 400, 230),
      PLACEHOLDER_IMG('Secret Project 1', 400, 340),
    ],
    col2: PLACEHOLDER_IMG('Secret Project 1', 700, 600),
  },
  {
    num: '02',
    category: 'Coming Soon',
    name: 'Secret Project 2',
    col1: [
      PLACEHOLDER_IMG('Secret Project 2', 400, 230),
      PLACEHOLDER_IMG('Secret Project 2', 400, 340),
    ],
    col2: PLACEHOLDER_IMG('Secret Project 2', 700, 600),
  },
  {
    num: '03',
    category: 'Coming Soon',
    name: 'Secret Project 3',
    col1: [
      PLACEHOLDER_IMG('Secret Project 3', 400, 230),
      PLACEHOLDER_IMG('Secret Project 3', 400, 340),
    ],
    col2: PLACEHOLDER_IMG('Secret Project 3', 700, 600),
  },
]

function ProjectCard({ project, index, total }: { project: Project; index: number; total: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const targetScale = 1 - (total - 1 - index) * 0.03
  const scale = useTransform(scrollYProgress, [0, 1], [1, targetScale])

  return (
    <div ref={ref} className="h-[85vh] sticky top-24 md:top-32" style={{ top: `${index * 28}px` }}>
      <motion.div
        style={{ scale }}
        className="rounded-[40px] sm:rounded-[50px] md:rounded-[60px] border-2 border-[#D7E2EA] bg-[#0C0C0C] p-4 sm:p-6 md:p-8 h-full flex flex-col"
      >
        {/* Top row */}
        <div className="flex items-center justify-between gap-4 flex-wrap mb-4 md:mb-6">
          <div className="flex items-center gap-4 md:gap-6">
            <span
              className="hero-heading font-black"
              style={{ fontSize: 'clamp(2.5rem, 8vw, 100px)' }}
            >
              {project.num}
            </span>
            <div>
              <p className="text-[#D7E2EA]/50 text-xs md:text-sm uppercase tracking-widest mb-1">{project.category}</p>
              <h3 className="text-[#D7E2EA] font-medium uppercase" style={{ fontSize: 'clamp(1.1rem, 3vw, 2rem)' }}>
                {project.name}
              </h3>
            </div>
          </div>
          <LiveProjectButton to={project.live} />
        </div>

        {/* Image grid */}
        <div className="flex gap-3 flex-1 min-h-0">
          <div className="flex flex-col gap-3" style={{ width: '40%' }}>
            <img
              src={project.col1[0]}
              alt=""
              loading="lazy"
              className="w-full object-cover rounded-[40px] sm:rounded-[50px] md:rounded-[60px]"
              style={{ height: 'clamp(130px, 16vw, 230px)' }}
              onError={(e) => {
                if (e.currentTarget.src !== PLACEHOLDER_FALLBACK) e.currentTarget.src = PLACEHOLDER_FALLBACK
              }}
            />
            <img
              src={project.col1[1]}
              alt=""
              loading="lazy"
              className="w-full object-cover rounded-[40px] sm:rounded-[50px] md:rounded-[60px] flex-1"
              style={{ minHeight: 'clamp(160px, 22vw, 340px)' }}
              onError={(e) => {
                if (e.currentTarget.src !== PLACEHOLDER_FALLBACK) e.currentTarget.src = PLACEHOLDER_FALLBACK
              }}
            />
          </div>
          <div style={{ width: '60%' }}>
            <img
              src={project.col2}
              alt=""
              loading="lazy"
              className="w-full h-full object-cover rounded-[40px] sm:rounded-[50px] md:rounded-[60px]"
              onError={(e) => {
                if (e.currentTarget.src !== PLACEHOLDER_FALLBACK) e.currentTarget.src = PLACEHOLDER_FALLBACK
              }}
            />
          </div>
        </div>
      </motion.div>
    </div>
  )
}

function ProjectsSection() {
  return (
    <section
      id="projects"
      className="bg-[#0C0C0C] rounded-t-[40px] sm:rounded-t-[50px] md:rounded-t-[60px] -mt-10 sm:-mt-12 md:-mt-14 relative z-10 px-6 sm:px-10 md:px-16 lg:px-20 pt-20 sm:pt-24 md:pt-32 pb-20"
    >
      <FadeIn>
        <h2
          className="hero-heading font-black uppercase text-center mb-16 sm:mb-20 md:mb-24"
          style={{ fontSize: 'clamp(3rem, 12vw, 160px)' }}
        >
          Project
        </h2>
      </FadeIn>
      <div className="w-full flex flex-col gap-8">
        {PROJECTS.map((p, i) => (
          <ProjectCard key={p.num} project={p} index={i} total={PROJECTS.length} />
        ))}
      </div>
    </section>
  )
}

/* ══════════════════════════════════════════════════
   FOOTER
══════════════════════════════════════════════════ */
function SiteFooter() {
  return (
    <footer className="bg-[#0C0C0C] px-6 sm:px-10 md:px-16 lg:px-20 py-10 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/10">
      <span className="text-[#D7E2EA]/50 text-sm tracking-wide">
        © {new Date().getFullYear()} Rebel Realm
      </span>
      <a
        href="mailto:hello@rebel-realm.com"
        className="text-[#D7E2EA]/70 hover:text-[#D7E2EA] text-sm tracking-wide transition-colors duration-200"
      >
        hello@rebel-realm.com
      </a>
    </footer>
  )
}

/* ══════════════════════════════════════════════════
   HOME PAGE — full flowing single-page site
══════════════════════════════════════════════════ */
function HomePage() {
  return (
    <>
      <a href="#main-content" className="skip-link">Skip to content</a>
      <main id="main-content" className="bg-[#0C0C0C]" style={{ overflowX: 'clip' }}>
        <HeroSection />
        <AboutSection />
        <ServicesSection />
        <ProjectsSection />
      </main>
      <SiteFooter />
    </>
  )
}

/* ══════════════════════════════════════════════════
   ROOT
══════════════════════════════════════════════════ */
function AppRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<HomePage />} />
      </Routes>
    </AnimatePresence>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
