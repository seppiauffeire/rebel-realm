import {
  useState, useEffect, createContext, useContext, type ReactNode,
} from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import {
  motion, AnimatePresence, MotionConfig, useScroll, useTransform, useReducedMotion,
} from 'framer-motion'
import RebelForge, { type ForgeStage } from './rebel-forge/react/RebelForge'
import { decideMode } from './rebel-forge/host.js'
import { encode } from './rebel-forge/engine/codec.js'

/* ══════════════════════════════════════════════════
   THEME — light/dark toggle, same pattern as pmdispatch.com:
   class on <html>, persisted to localStorage, applied
   before first paint via a blocking script in index.html
   so there's no flash of the wrong theme.
══════════════════════════════════════════════════ */
const ThemeContext = createContext<{ isLight: boolean; toggle: () => void }>({
  isLight: false,
  toggle: () => {},
})

function useTheme() {
  return useContext(ThemeContext)
}

function ThemeProvider({ children }: { children: ReactNode }) {
  const [isLight, setIsLight] = useState(
    () => typeof document !== 'undefined' && document.documentElement.classList.contains('light')
  )

  const toggle = () => {
    setIsLight(prev => {
      const next = !prev
      document.documentElement.classList.toggle('light', next)
      try {
        localStorage.setItem('rr-theme', next ? 'light' : 'dark')
      } catch {
        // localStorage unavailable (private mode, etc.) — theme just won't persist
      }
      return next
    })
  }

  return <ThemeContext.Provider value={{ isLight, toggle }}>{children}</ThemeContext.Provider>
}

/* ── Theme Toggle Button — animated sun/moon crossfade ── */
function ThemeToggle() {
  const { toggle, isLight } = useTheme()
  return (
    <button
      className="theme-btn"
      onClick={toggle}
      aria-label="Light mode"
      aria-pressed={isLight}
      title="Toggle light/dark mode"
    >
      <svg className="theme-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <defs>
          <mask id="moon-crescent-mask">
            <rect x="0" y="0" width="24" height="24" fill="white" />
            <circle cx="17" cy="8" r="9" fill="black" />
          </mask>
        </defs>
        <g className="th-sun">
          <circle cx="12" cy="12" r="5" fill="currentColor" stroke="none" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="5.64" y1="5.64" x2="4.22" y2="4.22" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          <line x1="5.64" y1="18.36" x2="4.22" y2="19.78" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        </g>
        <g className="th-moon">
          <circle cx="12" cy="12" r="9" fill="currentColor" stroke="none" mask="url(#moon-crescent-mask)" />
        </g>
      </svg>
    </button>
  )
}

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

/* ══════════════════════════════════════════════════
   HERO SECTION
══════════════════════════════════════════════════ */
const NAV_LINKS = [
  { label: 'Who', href: '#about' },
  { label: 'How', href: '#values' },
  { label: 'What', href: '#projects' },
]

/* Sealed = visible but ghosted and inert until the Forge game reveals it. */
const sealCls = (open: boolean) => `rr-seal${open ? '' : ' rr-sealed'}`

type Reveal = { nav: boolean; tagline: boolean }

const goTo = (id: string, delay = 0) =>
  window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), delay)

function HeroSection() {
  // Decide synchronously so returning visitors / bots never see a flash of the game.
  const [playing, setPlaying] = useState(() => {
    if (typeof window === 'undefined') return false
    let storage: Storage | null = null
    try { storage = window.localStorage } catch { storage = null }
    return decideMode({
      search: window.location.search,
      storage,
      storageKey: 'rr_opened',
      webdriver: navigator.webdriver === true,
    }).mode === 'play'
  })
  const [forced, setForced] = useState(false)
  const [rev, setRev] = useState<Reveal>({ nav: !playing, tagline: !playing })
  // The nav link brings the game back after a skip, even for a returning visitor.
  const openForge = (e: { preventDefault: () => void }) => {
    e.preventDefault()
    if (!playing) { setForced(true); setPlaying(true) }
    goTo('forge', playing ? 0 : 80)
  }
  const openAll = () => setRev({ nav: true, tagline: true })
  const reduceMotion = useReducedMotion()
  const { scrollY } = useScroll()
  // The title is the first thing seen at full size, then shrinks and dims as the visitor scrolls on.
  const titleScale = useTransform(scrollY, [0, 520], [1, 0.5])
  const titleOpacity = useTransform(scrollY, [0, 520], [1, 0.25])

  const handleReveal = (stage: ForgeStage) => {
    if (stage === 'kind') setRev(r => ({ ...r, nav: true }))
    else if (stage === 'forge') setRev(r => ({ ...r, tagline: true }))
  }

  const linkCls = (open: boolean) =>
    `inline-flex items-center min-h-[44px] text-[var(--text)] font-medium uppercase tracking-wide sm:tracking-wider text-xs sm:text-sm md:text-lg lg:text-[1.4rem] hover:opacity-70 active:opacity-50 ${sealCls(open)}`

  return (
    <>
      {/* Screen 1: the title, as big as it gets */}
      <section className="hero-screen flex flex-col relative" style={{ overflowX: 'clip' }}>
        <FadeIn delay={0} y={-20}>
          <nav className="flex items-center justify-between gap-2 px-5 sm:px-12 md:px-16 lg:px-20 pt-6 md:pt-9">
            {NAV_LINKS.map(link => (
              <a key={link.label} href={link.href} inert={!rev.nav} className={linkCls(rev.nav)}>
                {link.label}
              </a>
            ))}
            <a href="#forge" onClick={openForge} inert={!rev.nav} className={linkCls(rev.nav)}>
              Forge
            </a>
            <ThemeToggle />
          </nav>
        </FadeIn>

        <div className="flex-1 min-h-0 flex items-center justify-center">
          <FadeIn delay={0.15} y={40} className="w-full">
            <motion.div
              className="hero-title"
              style={reduceMotion ? undefined : { scale: titleScale, opacity: titleOpacity, transformOrigin: 'center top' }}
            >
              <h1 className="hero-heading text-center">
                <span className="hero-welcome"><span>Welcome</span> <span>to the</span></span>
                <span className="hero-realm"><span>Rebel</span> <span>Realm</span></span>
              </h1>
            </motion.div>
          </FadeIn>
        </div>

        <a
          href="#forge"
          onClick={(e) => { e.preventDefault(); goTo('forge') }}
          className="hero-cue self-center"
          aria-label="Scroll down"
        >
          <span>{playing ? 'Forge a card to enter' : 'Scroll'}</span>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
        </a>
      </section>

      {/* Screen 2: the game (while it is playing), with the tagline always underneath */}
      <section id="forge" className={`rf-skin forge-stage${playing ? '' : ' is-idle'}`} style={{ overflowX: 'clip' }}>
        {playing && (
          <motion.div
            className="w-full max-w-[1180px] mx-auto"
            initial={{ opacity: 0, y: 60, scale: 0.94, filter: 'blur(10px)' }}
            whileInView={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            <RebelForge
              brand="Rebel Realm"
              storageKey="rr_opened"
              forcePlay={forced}
              className="rf-host"
              onReveal={handleReveal}
              onRevealAll={openAll}
              onForged={saveTrophy}
              onCollapse={(reason) => {
                setPlaying(false)
                // Skip and "Enter the site" both mean: take me into the page.
                if (reason === 'skip' || reason === 'enter') goTo('about', 350)
              }}
            />
          </motion.div>
        )}
        <div className={`${playing ? 'mt-6 md:mt-8' : ''} px-4 ${sealCls(rev.tagline)}`} inert={!rev.tagline}>
          <FadeIn y={20}>
            <p
              className="text-[var(--text)] font-light tracking-wide leading-snug w-full text-center"
              style={{ fontSize: 'clamp(1rem, 2.4vw, 2rem)' }}
            >
              We build games people are still arguing about years down the line
            </p>
          </FadeIn>
        </div>
      </section>
    </>
  )
}

/* ══════════════════════════════════════════════════
   TROPHY — the card a visitor forged stays on the page.
   The best-rated card is kept in localStorage and redrawn as a PNG.
══════════════════════════════════════════════════ */
const TROPHY_KEY = 'rr_trophy'
type Trophy = { code: string; grade: string; total: number; name: string }

const readTrophy = (): Trophy | null => {
  try {
    const v = window.localStorage.getItem(TROPHY_KEY)
    return v ? (JSON.parse(v) as Trophy) : null
  } catch {
    return null
  }
}

const saveTrophy = (design: { name: string }, rating: { grade: string; total: number }) => {
  const prev = readTrophy()
  if (prev && prev.total >= rating.total) return
  try {
    window.localStorage.setItem(
      TROPHY_KEY,
      JSON.stringify({ code: encode(design), grade: rating.grade, total: rating.total, name: design.name }),
    )
  } catch {
    // storage unavailable: the card just will not stay
  }
  window.dispatchEvent(new Event('rr-trophy'))
}

function TrophySection() {
  const [trophy, setTrophy] = useState<Trophy | null>(() => (typeof window === 'undefined' ? null : readTrophy()))
  const [img, setImg] = useState<string | null>(null)
  const [note, setNote] = useState('')

  useEffect(() => {
    const on = () => setTrophy(readTrophy())
    window.addEventListener('rr-trophy', on)
    return () => window.removeEventListener('rr-trophy', on)
  }, [])

  useEffect(() => {
    if (!trophy) { setImg(null); return undefined }
    let dead = false
    ;(async () => {
      const [{ decode }, { rate }, { createCard }, { cardCanvas }] = await Promise.all([
        import('./rebel-forge/engine/codec.js'),
        import('./rebel-forge/engine/rating.js'),
        import('./rebel-forge/ui/card.js'),
        import('./rebel-forge/ui/share.js'),
      ])
      const design = decode(trophy.code)
      if (!design || dead) return
      const rating = rate(design)
      // cardCanvas reads live colour tokens, so the card is mounted off screen inside the skin first.
      const host = document.createElement('div')
      host.className = 'rf-skin'
      host.style.cssText = 'position:fixed;left:-9999px;top:0;width:300px'
      document.body.appendChild(host)
      const card = createCard('Rebel Realm')
      card.el.dataset.type = design.type
      host.appendChild(card.el)
      try {
        const cv = cardCanvas(design, rating, card.el)
        if (!dead) setImg(cv.toDataURL('image/png'))
      } finally {
        host.remove()
      }
    })().catch(() => { if (!dead) setImg(null) })
    return () => { dead = true }
  }, [trophy])

  if (!trophy || !img) return null

  const download = () => {
    const a = document.createElement('a')
    a.href = img
    a.download = `rebel-realm-${trophy.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'card'}.png`
    document.body.appendChild(a)
    a.click()
    a.remove()
  }
  const challenge = async () => {
    const link = `${window.location.origin}/?card=${trophy.code}`
    try {
      await navigator.clipboard.writeText(link)
      setNote('Link copied, anyone who opens it sees your card and scores it fresh')
    } catch {
      setNote(link)
    }
  }

  const btn = 'inline-flex items-center justify-center min-h-[44px] rounded-full border-2 border-[var(--border-strong)] px-6 text-sm font-medium uppercase tracking-widest text-[var(--text)] hover:bg-[var(--border-strong)]/10 active:scale-[0.97] transition-all duration-200 cursor-pointer'

  return (
    <section id="your-card" aria-labelledby="your-card-title" className="px-6 sm:px-10 md:px-16 lg:px-20 py-20 sm:py-24 md:py-32 border-t border-[var(--border-soft)]">
      <div className="max-w-6xl mx-auto grid gap-10 md:gap-16 md:grid-cols-[auto_1fr] items-center justify-items-center md:justify-items-start">
        <FadeIn y={40}>
          <img
            src={img}
            alt={`Your forged card, ${trophy.name}, rated ${trophy.grade}`}
            className="block w-[min(72vw,300px)] md:w-[clamp(240px,26vw,340px)] h-auto"
            style={{ transform: 'rotate(-3deg)', filter: 'drop-shadow(0 24px 40px rgba(0,0,0,0.35))' }}
          />
        </FadeIn>
        <FadeIn delay={0.1} className="text-center md:text-left">
          <p className="eyebrow">Your card</p>
          <h2
            id="your-card-title"
            className="text-[var(--text)] font-black uppercase leading-[0.95] mt-3"
            style={{ fontSize: 'clamp(2.25rem, 6.5vw, 6rem)' }}
          >
            {trophy.name}
          </h2>
          <p className="text-[var(--muted)] mt-4 max-w-xl text-lg md:text-xl leading-snug mx-auto md:mx-0">
            Rated {trophy.grade}, {trophy.total} out of 100, and it stays here so you can show it off or dare someone to beat it
          </p>
          <div className="mt-8 flex flex-wrap gap-3 justify-center md:justify-start">
            <button type="button" className={btn} onClick={download}>Download PNG</button>
            <button type="button" className={btn} onClick={challenge}>Challenge a friend</button>
            <a className={btn} href="/?rr=force">Forge another</a>
          </div>
          <p role="status" className="text-[var(--muted)] text-sm mt-4 min-h-[1.25rem] break-all">{note}</p>
        </FadeIn>
      </div>
    </section>
  )
}

/* ══════════════════════════════════════════════════
   ABOUT SECTION
══════════════════════════════════════════════════ */
function AboutSection() {
  return (
    <section id="about" className="px-6 sm:px-10 md:px-16 lg:px-20 py-24 sm:py-32 md:py-44">
      <div className="max-w-6xl mx-auto">
        <FadeIn>
          <p className="eyebrow">About</p>
        </FadeIn>
        <FadeIn delay={0.08}>
          <p
            className="text-[var(--text)] font-semibold tracking-tight mt-6 max-w-5xl"
            style={{ fontSize: 'clamp(1.9rem, 5.2vw, 4.4rem)', lineHeight: 1.08, textWrap: 'balance' }}
          >
            Rebel Realm is a studio building games, software and design consulting
          </p>
        </FadeIn>
        <FadeIn delay={0.16}>
          <p
            className="text-[var(--muted)] font-light mt-8 max-w-2xl"
            style={{ fontSize: 'clamp(1.1rem, 1.8vw, 1.5rem)', lineHeight: 1.5, textWrap: 'pretty' }}
          >
            Card games are where we go deepest, and everything we make has to hold up in ten years
          </p>
        </FadeIn>
      </div>
    </section>
  )
}

/* ══════════════════════════════════════════════════
   HOW WE BUILD — three principles
══════════════════════════════════════════════════ */
const PRINCIPLES = [
  { num: '01', name: 'Easy in, deep down', desc: 'Minutes to learn, years to master' },
  { num: '02', name: 'Built with players', desc: 'Our community shapes every game we make' },
  { num: '03', name: 'Make it yours', desc: 'Every system leaves room for your own style' },
]

function PrinciplesSection() {
  return (
    <section id="values" className="px-6 sm:px-10 md:px-16 lg:px-20 py-24 sm:py-32 md:py-40 border-t border-[var(--border-soft)]">
      <div className="max-w-6xl mx-auto">
        <FadeIn>
          <p className="eyebrow">How we build</p>
        </FadeIn>
        <ol className="mt-10 sm:mt-14">
          {PRINCIPLES.map((p, i) => (
            <li key={p.name}>
              <FadeIn delay={i * 0.08}>
                <div
                  className="grid gap-x-8 gap-y-3 md:grid-cols-[5rem_1fr] py-9 sm:py-12 md:py-14"
                  style={{ borderBottom: i < PRINCIPLES.length - 1 ? '1px solid var(--border-soft)' : undefined }}
                >
                  <span className="text-[var(--muted)] font-medium text-lg md:text-xl tabular-nums md:pt-4">{p.num}</span>
                  <div>
                    <h3
                      className="font-black text-[var(--text)] uppercase leading-[0.95]"
                      style={{ fontSize: 'clamp(2.1rem, 6.2vw, 5.75rem)' }}
                    >
                      {p.name}
                    </h3>
                    <p
                      className="text-[var(--muted)] font-light mt-4 md:mt-5 max-w-3xl"
                      style={{ fontSize: 'clamp(1.05rem, 1.8vw, 1.5rem)', lineHeight: 1.45 }}
                    >
                      {p.desc}
                    </p>
                  </div>
                </div>
              </FadeIn>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

/* ══════════════════════════════════════════════════
   IN THE WORKS — one project, kept under wraps
══════════════════════════════════════════════════ */
function Redacted({ ch }: { ch: number }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block align-baseline bg-[var(--text)]"
      style={{ width: `${ch}ch`, height: '0.78em', marginRight: '0.28em' }}
    />
  )
}

function CardBack() {
  return (
    <svg viewBox="0 0 300 420" className="block w-full h-auto" role="img" aria-label="A face-down card" style={{ transform: 'rotate(-4deg)' }}>
      <rect x="4" y="4" width="292" height="412" rx="0" fill="var(--placeholder-bg)" stroke="var(--border-strong)" strokeWidth="4" />
      <rect x="26" y="26" width="248" height="368" rx="0" fill="none" stroke="var(--border-strong)" strokeWidth="2" opacity="0.5" />
      <g fill="none" stroke="var(--text)" strokeWidth="3" strokeLinejoin="round">
        <path d="M150 96 L214 210 L150 324 L86 210 Z" />
        <path d="M150 132 L190 210 L150 288 L110 210 Z" opacity="0.55" />
      </g>
      <circle cx="150" cy="210" r="9" fill="var(--text)" />
    </svg>
  )
}

function ProjectsSection() {
  return (
    <section id="projects" className="px-6 sm:px-10 md:px-16 lg:px-20 py-24 sm:py-32 md:py-40 border-t border-[var(--border-soft)]">
      <div className="max-w-6xl mx-auto">
        <FadeIn>
          <p className="eyebrow">In the works</p>
        </FadeIn>
        <FadeIn delay={0.08} y={50}>
          <article className="mt-10 sm:mt-14 border-2 border-[var(--border-strong)] p-6 sm:p-10 md:p-14 grid gap-10 md:gap-16 md:grid-cols-[minmax(0,300px)_1fr] items-center">
            <div className="w-[min(60vw,260px)] md:w-full mx-auto md:mx-0">
              <CardBack />
            </div>
            <div>
              <p className="eyebrow">Project 01 · Classified</p>
              <h3
                aria-label="Title withheld"
                className="text-[var(--text)] font-black uppercase leading-[1.05] mt-4"
                style={{ fontSize: 'clamp(2.25rem, 6.4vw, 5.5rem)' }}
              >
                <Redacted ch={5} />
                <Redacted ch={3} />
                <Redacted ch={6} />
              </h3>
              <p
                className="text-[var(--text)] mt-6 max-w-xl"
                style={{ fontSize: 'clamp(1.15rem, 2vw, 1.6rem)', lineHeight: 1.4 }}
              >
                A new card game with secret rules we are not ready to share, so think of the Forge as the warm‑up
              </p>
              <p className="text-[var(--muted)] mt-4 text-base md:text-lg uppercase tracking-widest">Card game · In development</p>
              <a
                href="mailto:hello@rebel-realm.com?subject=Tell%20me%20first"
                className="mt-8 inline-flex items-center justify-center min-h-[48px] rounded-full border-2 border-[var(--border-strong)] px-8 text-sm md:text-base font-medium uppercase tracking-widest text-[var(--text)] hover:bg-[var(--border-strong)]/10 active:scale-[0.97] transition-all duration-200"
              >
                Tell me first
              </a>
            </div>
          </article>
        </FadeIn>
      </div>
    </section>
  )
}

/* ══════════════════════════════════════════════════
   CLOSING + FOOTER
══════════════════════════════════════════════════ */
function ClosingSection() {
  return (
    <section id="contact" className="px-6 sm:px-10 md:px-16 lg:px-20 py-24 sm:py-32 md:py-40 border-t border-[var(--border-soft)]">
      <div className="max-w-6xl mx-auto">
        <FadeIn>
          <p className="eyebrow">Say hello</p>
        </FadeIn>
        <FadeIn delay={0.08}>
          <a
            href="mailto:hello@rebel-realm.com"
            className="group mt-8 sm:mt-10 flex items-end justify-between gap-6 border-b-2 border-[var(--border-strong)] pb-5 md:pb-7 text-[var(--text)]"
          >
            <span
              className="font-black leading-none break-all tracking-tight transition-opacity duration-200 group-hover:opacity-70"
              style={{ fontSize: 'clamp(1.5rem, 6.2vw, 5.75rem)' }}
            >
              hello@rebel-realm.com
            </span>
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="shrink-0 w-[clamp(1.75rem,5vw,4.5rem)] h-[clamp(1.75rem,5vw,4.5rem)] transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M7 17L17 7M8 7h9v9" />
            </svg>
          </a>
        </FadeIn>
      </div>
    </section>
  )
}

function SiteFooter() {
  return (
    <footer className="px-6 sm:px-10 md:px-16 lg:px-20 py-10 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-[var(--border-soft)]">
      <span className="text-[var(--muted)] text-sm tracking-wide">
        © {new Date().getFullYear()} Rebel Realm
      </span>
      <a
        href="#main-content"
        className="inline-flex items-center min-h-[44px] text-[var(--text)] hover:opacity-70 text-sm tracking-wide uppercase transition-opacity duration-200"
      >
        Back to top
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
      <main id="main-content" className="bg-[var(--bg)]" style={{ overflowX: 'clip' }}>
        <HeroSection />
        <AboutSection />
        <TrophySection />
        <PrinciplesSection />
        <ProjectsSection />
        <ClosingSection />
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
    <MotionConfig reducedMotion="user">
      <ThemeProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ThemeProvider>
    </MotionConfig>
  )
}
