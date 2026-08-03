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
        hover:opacity-90 transition-opacity duration-200 cursor-pointer ${className}`}
      style={{
        background: 'linear-gradient(123deg, #18011F 7%, #B600A8 37%, #7621B0 72%, #BE4C00 100%)',
        boxShadow: '0px 4px 4px rgba(181, 1, 167, 0.25), 4px 4px 12px #7721B1 inset',
        outline: '2px solid white',
        outlineOffset: '-3px',
      }}
    >
      Contact Us
    </a>
  )
}

/* ── Live Project Button ─────────────────────────── */
function LiveProjectButton({ to, className = '' }: { to?: string; className?: string }) {
  const classes = `inline-flex items-center justify-center rounded-full border-2 border-[#D7E2EA] text-[#D7E2EA] font-medium uppercase tracking-widest
    px-8 py-3 sm:px-10 sm:py-3.5 text-sm sm:text-base hover:bg-[#D7E2EA]/10 transition-colors duration-200 cursor-pointer whitespace-nowrap ${className}`
  if (to) {
    return <Link to={to} className={classes}>Live Project</Link>
  }
  return <a href="#" className={classes}>Live Project</a>
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
    <section className="h-screen flex flex-col relative" style={{ overflowX: 'clip' }}>
      {/* Navbar */}
      <FadeIn delay={0} y={-20}>
        <nav className="flex items-center justify-between px-8 sm:px-12 md:px-16 lg:px-20 pt-7 md:pt-9">
          {NAV_LINKS.map(link => (
            <a
              key={link.label}
              href={link.href}
              className="text-[#D7E2EA] font-medium uppercase tracking-wider text-sm md:text-lg lg:text-[1.4rem] hover:opacity-70 transition-opacity duration-200"
            >
              {link.label}
            </a>
          ))}
          <Link
            to="/goal-rush"
            className="text-[#D7E2EA] font-medium uppercase tracking-wider text-sm md:text-lg lg:text-[1.4rem] hover:opacity-70 transition-opacity duration-200"
          >
            Goal Rush
          </Link>
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
            className="text-[#D7E2EA] font-light uppercase tracking-wide leading-snug w-full text-center"
            style={{ fontSize: 'clamp(1rem, 2.4vw, 2rem)' }}
          >
            we build games people are still arguing about years down the line
          </p>
        </FadeIn>
      </div>
    </section>
  )
}

/* ══════════════════════════════════════════════════
   MARQUEE SECTION
   Featuring Goal Rush card art. Drop the four card
   images into mainframe/public/cards/ with the exact
   filenames below. Until a file is added, a placeholder
   tile is shown in its place.
══════════════════════════════════════════════════ */
const MARQUEE_FALLBACK =
  'data:image/svg+xml;utf8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="336">
      <rect width="240" height="336" fill="#141414"/>
      <text x="50%" y="50%" fill="#4a4a4a" font-family="sans-serif" font-size="14" text-anchor="middle" dominant-baseline="middle">GOAL RUSH</text>
    </svg>`
  )

const CARD_IMAGES = [
  '/cards/card-01-el-midas.jpg',
  '/cards/card-02-highland-fury.jpg',
  '/cards/card-03-the-fortress.jpg',
  '/cards/card-04-the-stallion.jpg',
]

const MARQUEE_IMAGES = Array.from({ length: 21 }, (_, i) => CARD_IMAGES[i % CARD_IMAGES.length])

const ROW1 = MARQUEE_IMAGES.slice(0, 11)
const ROW2 = MARQUEE_IMAGES.slice(11)

function MarqueeRow({ images, direction }: { images: string[]; direction: 1 | -1 }) {
  const ref = useRef<HTMLDivElement>(null)
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      const el = ref.current
      if (!el) return
      const sectionTop = el.getBoundingClientRect().top + window.scrollY
      const raw = (window.scrollY - sectionTop + window.innerHeight) * 0.3
      setOffset(raw)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const tripled = [...images, ...images, ...images]
  const translate = direction === 1 ? offset - 200 : -(offset - 200)

  return (
    <div ref={ref} className="overflow-hidden">
      <div
        className="flex gap-3"
        style={{ transform: `translateX(${translate}px)`, willChange: 'transform' }}
      >
        {tripled.map((src, i) => (
          <img
            key={i}
            src={src}
            loading="lazy"
            className="rounded-2xl object-cover flex-shrink-0"
            style={{ width: 240, height: 336 }}
            alt=""
            onError={(e) => {
              if (e.currentTarget.src !== MARQUEE_FALLBACK) e.currentTarget.src = MARQUEE_FALLBACK
            }}
          />
        ))}
      </div>
    </div>
  )
}

function MarqueeSection() {
  return (
    <section className="bg-[#0C0C0C] pt-24 sm:pt-32 md:pt-40 pb-10 flex flex-col gap-3">
      <MarqueeRow images={ROW1} direction={1} />
      <MarqueeRow images={ROW2} direction={-1} />
    </section>
  )
}

/* ══════════════════════════════════════════════════
   ABOUT SECTION
══════════════════════════════════════════════════ */
const CORNER_IMAGES = [
  {
    src: 'https://shrug-person-78902957.figma.site/_components/v2/ebb2b8f25d8e24d5f0a5ca8af4c950de81aa2fd7/moon_icon.11395d36.png',
    cls: 'top-[4%] left-[1%] sm:left-[2%] md:left-[4%] w-[120px] sm:w-[160px] md:w-[210px]',
    delay: 0.1, x: -80,
  },
  {
    src: 'https://shrug-person-78902957.figma.site/_components/v2/ebb2b8f25d8e24d5f0a5ca8af4c950de81aa2fd7/p59_1.4659672e.png',
    cls: 'bottom-[8%] left-[3%] sm:left-[6%] md:left-[10%] w-[100px] sm:w-[140px] md:w-[180px]',
    delay: 0.25, x: -80,
  },
  {
    src: 'https://shrug-person-78902957.figma.site/_components/v2/ebb2b8f25d8e24d5f0a5ca8af4c950de81aa2fd7/lego_icon-1.703bb594.png',
    cls: 'top-[4%] right-[1%] sm:right-[2%] md:right-[4%] w-[120px] sm:w-[160px] md:w-[210px]',
    delay: 0.15, x: 80,
  },
  {
    src: 'https://shrug-person-78902957.figma.site/_components/v2/ebb2b8f25d8e24d5f0a5ca8af4c950de81aa2fd7/Group_134-1.2e04f3ce.png',
    cls: 'bottom-[8%] right-[3%] sm:right-[6%] md:right-[10%] w-[130px] sm:w-[170px] md:w-[220px]',
    delay: 0.3, x: 80,
  },
]

function AboutSection() {
  return (
    <section id="about" className="min-h-screen flex items-center justify-center relative px-5 sm:px-8 md:px-10 py-20">
      {CORNER_IMAGES.map((img, i) => (
        <FadeIn key={i} delay={img.delay} x={img.x} y={0} duration={0.9} className={`absolute ${img.cls} hidden sm:block`}>
          <img src={img.src} alt="" className="w-full h-auto select-none pointer-events-none" />
        </FadeIn>
      ))}

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
            text="Rebel Realm is a company building games, software, and consulting on product, design, and production for apps and games -- built to last, not just to launch."
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
    category: 'Flagship',
    name: 'Goal Rush',
    col1: [
      '/cards/card-01-el-midas.jpg',
      '/cards/card-02-highland-fury.jpg',
    ],
    col2: '/cards/card-03-the-fortress.jpg',
    live: '/goal-rush',
  },
  {
    num: '02',
    category: 'Coming Soon',
    name: 'Placeholder Project',
    col1: [
      PLACEHOLDER_IMG('Placeholder', 400, 230),
      PLACEHOLDER_IMG('Placeholder', 400, 340),
    ],
    col2: PLACEHOLDER_IMG('Placeholder', 700, 600),
  },
  {
    num: '03',
    category: 'Coming Soon',
    name: 'Placeholder Project',
    col1: [
      PLACEHOLDER_IMG('Placeholder', 400, 230),
      PLACEHOLDER_IMG('Placeholder', 400, 340),
    ],
    col2: PLACEHOLDER_IMG('Placeholder', 700, 600),
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
                if (e.currentTarget.src !== MARQUEE_FALLBACK) e.currentTarget.src = MARQUEE_FALLBACK
              }}
            />
            <img
              src={project.col1[1]}
              alt=""
              loading="lazy"
              className="w-full object-cover rounded-[40px] sm:rounded-[50px] md:rounded-[60px] flex-1"
              style={{ minHeight: 'clamp(160px, 22vw, 340px)' }}
              onError={(e) => {
                if (e.currentTarget.src !== MARQUEE_FALLBACK) e.currentTarget.src = MARQUEE_FALLBACK
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
                if (e.currentTarget.src !== MARQUEE_FALLBACK) e.currentTarget.src = MARQUEE_FALLBACK
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
   HOME PAGE — full flowing single-page site
══════════════════════════════════════════════════ */
function HomePage() {
  return (
    <div className="bg-[#0C0C0C]" style={{ overflowX: 'clip' }}>
      <HeroSection />
      <MarqueeSection />
      <AboutSection />
      <ServicesSection />
      <ProjectsSection />
    </div>
  )
}

/* ══════════════════════════════════════════════════
   GOAL RUSH PAGE (unchanged, iframe route)
══════════════════════════════════════════════════ */
function GoalRushNav() {
  return (
    <nav className="flex items-center justify-between px-6 md:px-10 py-4 border-b border-white/10">
      <Link
        to="/"
        className="text-[#D7E2EA] font-medium uppercase tracking-widest text-sm hover:opacity-70 transition-opacity duration-200"
      >
        ← Rebel Realm
      </Link>
      <span className="text-[#D7E2EA] font-medium uppercase tracking-widest text-sm">Goal Rush</span>
    </nav>
  )
}

function GoalRushPage() {
  return (
    <div className="h-screen w-screen flex flex-col bg-[#080c0f]">
      <GoalRushNav />
      <iframe
        src="/goal-rush.html"
        className="flex-1 w-full border-0"
        title="Goal Rush TCG"
        allowFullScreen
      />
    </div>
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
        <Route path="/goal-rush" element={<GoalRushPage />} />
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
