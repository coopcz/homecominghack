import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Check,
  ChevronRight,
  Code2,
  ExternalLink,
  Github,
  GraduationCap,
  Heart,
  LoaderCircle,
  LockKeyhole,
  Menu,
  MessageCircleMore,
  RefreshCw,
  Rocket,
  Sparkles,
  Target,
  Trophy,
  UsersRound,
  X,
} from 'lucide-react'
import { fitQuestions, initialProgress, missions as curatedMissions } from './lib/data'
import { buildCuratedRoadmap, inferRole, rankMissions } from './lib/matching'
import { callFunction, isDemoMode, supabase } from './lib/supabase'
import type { AppStep, Mission, ProgressEvent, Roadmap, StudentProfile } from './lib/types'

const emptyProfile: StudentProfile = {
  id: crypto.randomUUID(),
  email: '',
  fullName: '',
  university: '',
  major: '',
  skills: [],
  interests: [],
  targetCompanies: [],
  accountType: 'student',
}

const stepOrder: AppStep[] = ['welcome', 'auth', 'onboarding', 'missions', 'questions', 'why', 'roadmap', 'progress']

function splitTags(value: string) {
  return value.split(',').map((item) => item.trim()).filter(Boolean)
}

function App() {
  const [step, setStep] = useState<AppStep>('welcome')
  const [profile, setProfile] = useState<StudentProfile>(() => {
    const saved = localStorage.getItem('northstar-profile')
    return saved ? { ...emptyProfile, ...JSON.parse(saved) } : emptyProfile
  })
  const [ranked, setRanked] = useState<Mission[]>(curatedMissions)
  const [deckIndex, setDeckIndex] = useState(0)
  const [shortlist, setShortlist] = useState<Mission[]>([])
  const [answers, setAnswers] = useState<string[]>([])
  const [selectedMission, setSelectedMission] = useState<Mission>(curatedMissions[0])
  const [why, setWhy] = useState('')
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null)
  const [progress, setProgress] = useState<ProgressEvent[]>(initialProgress)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    localStorage.setItem('northstar-profile', JSON.stringify(profile))
  }, [profile])

  useEffect(() => {
    const saved = localStorage.getItem('northstar-state')
    if (!saved) return
    try {
      const state = JSON.parse(saved)
      if (state.roadmap) setRoadmap(state.roadmap)
      if (state.progress) setProgress(state.progress)
      if (state.why) setWhy(state.why)
    } catch {
      // A stale demo cache should never block the experience.
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('northstar-state', JSON.stringify({ roadmap, progress, why }))
  }, [roadmap, progress, why])

  function notify(message: string) {
    setToast(message)
    window.setTimeout(() => setToast(null), 2600)
  }

  function go(next: AppStep) {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setStep(next)
  }

  async function finishOnboarding(nextProfile: StudentProfile) {
    const nextRanked = rankMissions(nextProfile, curatedMissions)
    setProfile(nextProfile)
    setRanked(nextRanked)
    setSelectedMission(nextRanked[0])
    setDeckIndex(0)
    if (supabase) {
      const { data } = await supabase.auth.getSession()
      if (data.session?.user.id) {
        await supabase.from('users').update({
          university: nextProfile.university,
          major: nextProfile.major,
          skills: nextProfile.skills,
          interests: nextProfile.interests,
          target_companies: nextProfile.targetCompanies,
          github_username: nextProfile.githubUsername ?? null,
        }).eq('id', data.session.user.id)
      }
    }
    go('missions')
  }

  function voteMission(liked: boolean) {
    const mission = ranked[deckIndex]
    if (liked && !shortlist.some((item) => item.id === mission.id)) {
      setShortlist((current) => [...current, mission])
    }
    if (liked || deckIndex >= ranked.length - 1) {
      const chosen = liked ? mission : shortlist[0] ?? ranked[0]
      setSelectedMission(chosen)
      go('questions')
      return
    }
    setDeckIndex((current) => current + 1)
  }

  async function generateRoadmap() {
    const role = inferRole(profile, answers, selectedMission)
    setBusy(true)
    try {
      if (!isDemoMode) {
        const generated = await callFunction<Roadmap>('generate-roadmap', {
          profile,
          mission: selectedMission,
          answers,
          why,
          role,
        })
        setRoadmap(generated)
      } else {
        await new Promise((resolve) => window.setTimeout(resolve, 900))
        setRoadmap(buildCuratedRoadmap(profile, selectedMission, role, why))
      }
      await saveSelection(role)
      go('roadmap')
    } catch (error) {
      console.error(error)
      setRoadmap(buildCuratedRoadmap(profile, selectedMission, role, why))
      notify('AI was unavailable, so we loaded the curated demo roadmap.')
      go('roadmap')
    } finally {
      setBusy(false)
    }
  }

  async function saveSelection(role: string) {
    if (!supabase) return
    const { data: sessionData } = await supabase.auth.getSession()
    const userId = sessionData.session?.user.id
    if (!userId) return
    await supabase.from('selections').upsert(
      {
        user_id: userId,
        mission_id: selectedMission.id,
        why,
        selected_role_title: role,
        question_answers: answers,
        status: 'active',
      },
      { onConflict: 'user_id,mission_id' },
    )
  }

  const progressPoints = progress.reduce((total, event) => total + event.points, 0)

  return (
    <div className="app-shell">
      {step !== 'welcome' && (
        <Header
          step={step}
          onLogo={() => go('welcome')}
          onProgress={() => go('progress')}
          onEmployer={() => go('employer')}
        />
      )}

      <AnimatePresence mode="wait">
        {step === 'welcome' && <Welcome key="welcome" onStart={() => go('auth')} onDemo={() => go('onboarding')} />}
        {step === 'auth' && <Auth key="auth" profile={profile} setProfile={setProfile} onComplete={() => go('onboarding')} onBack={() => go('welcome')} notify={notify} />}
        {step === 'onboarding' && <Onboarding key="onboarding" profile={profile} onComplete={finishOnboarding} />}
        {step === 'missions' && <MissionDeck key="missions" missions={ranked} index={deckIndex} onVote={voteMission} shortlistCount={shortlist.length} />}
        {step === 'questions' && <Questions key="questions" answers={answers} setAnswers={setAnswers} onComplete={() => go('why')} mission={selectedMission} />}
        {step === 'why' && <Why key="why" mission={selectedMission} value={why} setValue={setWhy} onComplete={generateRoadmap} busy={busy} />}
        {step === 'roadmap' && roadmap && <RoadmapView key="roadmap" roadmap={roadmap} mission={selectedMission} onProgress={() => go('progress')} />}
        {step === 'progress' && (
          <ProgressView
            key="progress"
            profile={profile}
            setProfile={setProfile}
            mission={selectedMission}
            events={progress}
            setEvents={setProgress}
            points={progressPoints}
            notify={notify}
          />
        )}
        {step === 'employer' && <EmployerView key="employer" profile={profile} mission={selectedMission} roadmap={roadmap} points={progressPoints} events={progress} />}
      </AnimatePresence>

      <AnimatePresence>{toast && <motion.div className="toast" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>{toast}</motion.div>}</AnimatePresence>
    </div>
  )
}

function Header({ step, onLogo, onProgress, onEmployer }: { step: AppStep; onLogo: () => void; onProgress: () => void; onEmployer: () => void }) {
  const activeIndex = Math.max(0, stepOrder.indexOf(step))
  return (
    <header className="site-header">
      <button className="brand-button" onClick={onLogo} aria-label="Northstar home"><Brand /></button>
      <div className="journey-progress" aria-label={`Journey progress ${activeIndex} of 7`}>
        <span style={{ width: `${Math.min(100, (activeIndex / 7) * 100)}%` }} />
      </div>
      <nav>
        <button className="nav-action" onClick={onProgress}><Trophy size={16} /> <span>Progress</span></button>
        <button className="nav-action" onClick={onEmployer}><BriefcaseBusiness size={16} /> <span>Employer view</span></button>
      </nav>
    </header>
  )
}

function Brand({ light = false }: { light?: boolean }) {
  return <span className={`brand ${light ? 'brand-light' : ''}`}><span className="brand-mark">✦</span> northstar</span>
}

function Page({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <motion.main className={`page ${className}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.32 }}>{children}</motion.main>
}

function Welcome({ onStart, onDemo }: { onStart: () => void; onDemo: () => void }) {
  return (
    <main className="welcome">
      <div className="welcome-bg" />
      <nav className="welcome-nav"><Brand light /><button onClick={onDemo}>Explore the demo <ArrowRight size={16} /></button></nav>
      <motion.div className="hero-copy" initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>
        <motion.p variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }} className="eyebrow light">Career discovery for people who give a damn</motion.p>
        <motion.h1 variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>Don’t find a job.<br /><em>Find your mission.</em></motion.h1>
        <motion.p variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="hero-sub">Discover Utah companies solving problems you care about—then build the proof that you belong there.</motion.p>
        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="hero-actions">
          <button className="primary light-button" onClick={onStart}>Find my mission <ArrowRight size={18} /></button>
          <button className="text-button light" onClick={onDemo}>Skip to the demo</button>
        </motion.div>
      </motion.div>
      <div className="hero-footer"><span>Built for ambitious students</span><span>Utah / 2026</span></div>
    </main>
  )
}

function Auth({ profile, setProfile, onComplete, onBack, notify }: { profile: StudentProfile; setProfile: (profile: StudentProfile) => void; onComplete: () => void; onBack: () => void; notify: (message: string) => void }) {
  const [mode, setMode] = useState<'signup' | 'signin'>('signup')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!supabase) {
      notify('Demo profile saved locally. Connect Supabase to enable shared accounts.')
      onComplete()
      return
    }
    setBusy(true)
    const response = mode === 'signup'
      ? await supabase.auth.signUp({ email: profile.email, password, options: { data: { full_name: profile.fullName, account_type: profile.accountType } } })
      : await supabase.auth.signInWithPassword({ email: profile.email, password })
    setBusy(false)
    if (response.error) return notify(response.error.message)
    if (response.data.user) setProfile({ ...profile, id: response.data.user.id })
    onComplete()
  }

  return (
    <Page className="auth-page">
      <button className="back-link" onClick={onBack}><ArrowLeft size={16} /> Back</button>
      <section className="auth-layout">
        <div className="auth-statement">
          <span className="chapter-number">01</span>
          <h1>Your career should point somewhere.</h1>
          <p>Start with what matters to you. We’ll turn it into a practical path.</p>
        </div>
        <form className="auth-form" onSubmit={submit}>
          <div className="mode-switch"><button type="button" className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')}>Create account</button><button type="button" className={mode === 'signin' ? 'active' : ''} onClick={() => setMode('signin')}>Sign in</button></div>
          {mode === 'signup' && <label>Full name<input required value={profile.fullName} onChange={(event) => setProfile({ ...profile, fullName: event.target.value })} placeholder="Ada Lovelace" autoComplete="name" /></label>}
          <label>Email<input required type="email" value={profile.email} onChange={(event) => setProfile({ ...profile, email: event.target.value })} placeholder="you@university.edu" autoComplete="email" /></label>
          <label>Password<input required minLength={6} type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} /></label>
          {mode === 'signup' && <div className="account-types"><button type="button" className={profile.accountType === 'student' ? 'selected' : ''} onClick={() => setProfile({ ...profile, accountType: 'student' })}><GraduationCap /> Student</button><button type="button" className={profile.accountType === 'employer' ? 'selected' : ''} onClick={() => setProfile({ ...profile, accountType: 'employer' })}><BriefcaseBusiness /> Employer</button></div>}
          <button className="primary full" disabled={busy}>{busy ? <LoaderCircle className="spin" /> : mode === 'signup' ? 'Create my profile' : 'Sign in'} <ArrowRight size={18} /></button>
          <button className="text-button center" type="button" onClick={onComplete}>Continue without an account</button>
          <p className="form-note"><LockKeyhole size={13} /> Email confirmation can be disabled for the hackathon in Supabase Auth settings.</p>
        </form>
      </section>
    </Page>
  )
}

function Onboarding({ profile, onComplete }: { profile: StudentProfile; onComplete: (profile: StudentProfile) => void }) {
  const [draft, setDraft] = useState(profile)
  const [skills, setSkills] = useState(profile.skills.join(', '))
  const [interests, setInterests] = useState(profile.interests.join(', '))
  const [companies, setCompanies] = useState(profile.targetCompanies.join(', '))

  function submit(event: React.FormEvent) {
    event.preventDefault()
    onComplete({ ...draft, skills: splitTags(skills), interests: splitTags(interests), targetCompanies: splitTags(companies) })
  }

  return (
    <Page className="onboarding-page">
      <section className="section-heading"><p className="eyebrow">Your coordinates</p><h1>What should your work<br />move forward?</h1><p>Give us signal, not a polished résumé. Commas work great.</p></section>
      <form className="onboarding-form" onSubmit={submit}>
        <div className="form-row"><label>University<input required value={draft.university} onChange={(event) => setDraft({ ...draft, university: event.target.value })} placeholder="Brigham Young University" /></label><label>Major or craft<input required value={draft.major} onChange={(event) => setDraft({ ...draft, major: event.target.value })} placeholder="Computer Science" /></label></div>
        <label>Skills you want to use<input required value={skills} onChange={(event) => setSkills(event.target.value)} placeholder="React, product design, Python" /><small>What can you already make, analyze, or explain?</small></label>
        <label>Problems or industries you keep coming back to<input required value={interests} onChange={(event) => setInterests(event.target.value)} placeholder="Humanoid robots, biotech, ecommerce" /></label>
        <label>Companies already on your radar <span>optional</span><input value={companies} onChange={(event) => setCompanies(event.target.value)} placeholder="Neighbor, Redo, Waystar" /></label>
        <button className="primary" type="submit">Show me the missions <ArrowRight size={18} /></button>
      </form>
    </Page>
  )
}

function MissionDeck({ missions, index, onVote, shortlistCount }: { missions: Mission[]; index: number; onVote: (liked: boolean) => void; shortlistCount: number }) {
  const mission = missions[index]
  return (
    <Page className="deck-page">
      <div className="deck-topline"><div><p className="eyebrow">Mission menu</p><h1>What pulls you in?</h1></div><span>{String(index + 1).padStart(2, '0')} / {String(missions.length).padStart(2, '0')}</span></div>
      <div className="deck-stage">
        {missions[index + 1] && <div className="mission-card card-behind" style={{ backgroundImage: `linear-gradient(180deg, transparent, rgba(0,0,0,.82)), url(${missions[index + 1].imageUrl})` }} />}
        <motion.article
          key={mission.id}
          className="mission-card"
          style={{ backgroundImage: `linear-gradient(180deg, rgba(0,0,0,.08), rgba(0,0,0,.88)), url(${mission.imageUrl})` }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          onDragEnd={(_, info) => Math.abs(info.offset.x) > 110 && onVote(info.offset.x > 0)}
          initial={{ opacity: 0, scale: 0.96, rotate: -1 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          exit={{ opacity: 0, x: 200 }}
        >
          <div className="mission-top"><span style={{ background: mission.accent }}>{mission.location}</span><a href={mission.website} target="_blank" rel="noreferrer" aria-label={`${mission.company} website`}><ExternalLink size={18} /></a></div>
          <div className="mission-copy"><p>{mission.company}</p><h2>{mission.headline}</h2><div className="founder-story"><span>Founder story</span>{mission.founderStory}</div><div className="theme-row">{mission.themes.slice(0, 4).map((theme) => <span key={theme}>{theme}</span>)}</div></div>
        </motion.article>
      </div>
      <div className="deck-controls"><button className="vote-button pass" onClick={() => onVote(false)} aria-label="Pass"><X /></button><p><strong>{shortlistCount}</strong> saved<br /><span>Drag or use arrows</span></p><button className="vote-button like" onClick={() => onVote(true)} aria-label="Save mission"><Heart /></button></div>
    </Page>
  )
}

function Questions({ answers, setAnswers, onComplete, mission }: { answers: string[]; setAnswers: (value: string[]) => void; onComplete: () => void; mission: Mission }) {
  const [index, setIndex] = useState(answers.length)
  const question = fitQuestions[index]
  function answer(value: string) {
    const next = [...answers.slice(0, index), value]
    setAnswers(next)
    if (index === fitQuestions.length - 1) window.setTimeout(onComplete, 260)
    else setIndex(index + 1)
  }
  return (
    <Page className="questions-page">
      <div className="question-context"><span style={{ background: mission.accent }}>{mission.company}</span><p>We found the mission. Now let’s find your angle.</p></div>
      <motion.section key={question.id} className="question-block" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}>
        <p className="eyebrow">{question.eyebrow}</p><h1>{question.question}</h1>
        <div className="option-list">{question.options.map((option, optionIndex) => <button key={option} onClick={() => answer(option)}><span>{String(optionIndex + 1).padStart(2, '0')}</span>{option}<ChevronRight /></button>)}</div>
      </motion.section>
    </Page>
  )
}

function Why({ mission, value, setValue, onComplete, busy }: { mission: Mission; value: string; setValue: (value: string) => void; onComplete: () => void; busy: boolean }) {
  return (
    <Page className="why-page">
      <div className="why-layout">
        <section><p className="eyebrow">The part only you can answer</p><h1>Why does this mission matter <em>to you?</em></h1><p>Specific beats impressive. A moment, frustration, or person is better than “I’ve always been passionate.”</p></section>
        <div className="why-entry"><blockquote>“{mission.mission}”<cite>— {mission.company}</cite></blockquote><textarea autoFocus maxLength={800} value={value} onChange={(event) => setValue(event.target.value)} placeholder="I care about this because…" /><div className="textarea-meta"><span>{value.length} / 800</span><span>{value.trim().split(/\s+/).filter(Boolean).length} words</span></div><button className="primary full" disabled={value.trim().length < 30 || busy} onClick={onComplete}>{busy ? <><LoaderCircle className="spin" /> Building your roadmap</> : <>Turn this into a roadmap <Sparkles size={18} /></>}</button></div>
      </div>
    </Page>
  )
}

function RoadmapView({ roadmap, mission, onProgress }: { roadmap: Roadmap; mission: Mission; onProgress: () => void }) {
  return (
    <Page className="roadmap-page">
      <section className="roadmap-hero"><div><p className="eyebrow">Your mission path</p><h1>{roadmap.role}<br /><em>at {mission.company}</em></h1></div><p>{roadmap.thesis}</p></section>
      <section className="roadmap-section"><div className="section-index"><span>01</span><h2>Build proof</h2><p>Three projects designed to look like the work—not homework.</p></div><div className="project-list">{roadmap.projects.map((project, index) => <motion.article key={project.title} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.08 }}><div className="project-number">0{index + 1}</div><div><h3>{project.title}</h3><p>{project.brief}</p><div className="proof"><Check size={15} /> <span><strong>Proof:</strong> {project.proof}</span></div><div className="project-meta"><span>{project.weeks} weeks</span>{project.tags.map((tag) => <span key={tag}>{tag}</span>)}</div></div></motion.article>)}</div></section>
      <section className="roadmap-columns"><div><p className="eyebrow">02 / Earn signal</p><h2>Credentials that count</h2>{roadmap.credentials.map((item) => <p className="lined-item" key={item}><Check size={16} /> {item}</p>)}</div><div><p className="eyebrow">03 / Learn on purpose</p><h2>Courses with an output</h2>{roadmap.courses.map((course) => <div className="course" key={course.title}><strong>{course.title}</strong><span>{course.provider}</span><p>{course.outcome}</p></div>)}</div></section>
      <section className="connection-section"><div><p className="eyebrow">04 / Get in the room</p><h2>Connect with<br />something to show.</h2></div><ol>{roadmap.peopleStrategy.map((item) => <li key={item}>{item}</li>)}</ol></section>
      <section className="roadmap-cta"><div><Sparkles /><h2>Your mission has a path.</h2><p>Now make the first week visible.</p></div><button className="primary" onClick={onProgress}>Start tracking progress <ArrowRight size={18} /></button></section>
    </Page>
  )
}

function ProgressView({ profile, setProfile, mission, events, setEvents, points, notify }: { profile: StudentProfile; setProfile: (profile: StudentProfile) => void; mission: Mission; events: ProgressEvent[]; setEvents: (events: ProgressEvent[]) => void; points: number; notify: (message: string) => void }) {
  const [repo, setRepo] = useState('')
  const [busy, setBusy] = useState(false)
  const level = Math.max(1, Math.floor(points / 100) + 1)
  const levelProgress = points % 100

  async function syncGithub() {
    if (!profile.githubUsername?.trim()) return notify('Add your GitHub username first.')
    setBusy(true)
    try {
      let additions: ProgressEvent[] = []
      if (!isDemoMode) {
        const response = await callFunction<{ events: ProgressEvent[]; cached: boolean }>('github-sync', { username: profile.githubUsername, repo })
        additions = response.events
        if (response.cached) notify('GitHub rate-limited us, so we used the last verified result.')
      } else {
        await new Promise((resolve) => window.setTimeout(resolve, 800))
        additions = [{ id: crypto.randomUUID(), type: 'github_commit', label: `Pushed to ${repo || 'a public repository'}`, points: 15, verified: true, occurredAt: new Date().toISOString() }]
      }
      const merged = [...additions, ...events].filter((event, index, all) => all.findIndex((item) => item.id === event.id) === index)
      setEvents(merged)
      notify(additions.length ? `Verified ${additions.length} new commit${additions.length === 1 ? '' : 's'} · pet gained energy` : 'Everything is synced. No new commits yet.')
    } catch {
      notify('GitHub is taking a break. Your last progress is safely cached.')
    } finally {
      setBusy(false)
    }
  }

  function logManual(type: ProgressEvent['type'], label: string, eventPoints: number) {
    setEvents([{ id: crypto.randomUUID(), type, label, points: eventPoints, verified: false, occurredAt: new Date().toISOString() }, ...events])
    notify(`Logged +${eventPoints} momentum`)
  }

  return (
    <Page className="progress-page">
      <section className="progress-hero">
        <div><p className="eyebrow">Mission momentum</p><h1>Small proof.<br /><em>Every week.</em></h1><p>Progress toward {mission.company}, made visible.</p></div>
        <div className="pet-zone"><div className={`pet level-${Math.min(level, 4)}`}><div className="pet-antenna" /><div className="pet-face"><span /><span /><i /></div><div className="pet-feet"><i /><i /></div></div><div className="pet-status"><span>Level {level} · Scout</span><div><i style={{ width: `${levelProgress}%` }} /></div><small>{100 - levelProgress} points to the next evolution</small></div></div>
      </section>
      <section className="sync-section"><div><Github /><h2>Let your work speak.</h2><p>Connect a public repo. We verify new commits and keep the last result cached so your demo survives a rate limit.</p></div><div className="github-form"><label>GitHub username<input value={profile.githubUsername ?? ''} onChange={(event) => setProfile({ ...profile, githubUsername: event.target.value })} placeholder="octocat" /></label><label>Repository <span>optional</span><input value={repo} onChange={(event) => setRepo(event.target.value)} placeholder="owner/repo or repo" /></label><button className="primary" onClick={syncGithub} disabled={busy}>{busy ? <LoaderCircle className="spin" /> : <RefreshCw size={17} />} Sync commits</button></div></section>
      <section className="activity-grid"><div><div className="activity-heading"><h2>Recent progress</h2><span>{points} points</span></div><div className="event-list">{events.map((event) => <div className="event" key={event.id}><span className={`event-icon ${event.type}`}>{event.type === 'github_commit' ? <Code2 /> : event.type === 'outreach' ? <MessageCircleMore /> : event.type === 'course_completed' ? <GraduationCap /> : <Rocket />}</span><div><strong>{event.label}</strong><small>{new Date(event.occurredAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · {event.verified ? 'Verified' : 'Self logged'}</small></div><b>+{event.points}</b></div>)}</div></div><aside><p className="eyebrow">Log a win</p><button onClick={() => logManual('course_completed', 'Completed a roadmap lesson', 20)}><GraduationCap /> Course completed <span>+20</span></button><button onClick={() => logManual('outreach', `Reached out to someone at ${mission.company}`, 15)}><UsersRound /> Meaningful outreach <span>+15</span></button><button onClick={() => logManual('project_milestone', 'Shipped a project milestone', 30)}><Rocket /> Project milestone <span>+30</span></button></aside></section>
    </Page>
  )
}

function EmployerView({ profile, mission, roadmap, points, events }: { profile: StudentProfile; mission: Mission; roadmap: Roadmap | null; points: number; events: ProgressEvent[] }) {
  const verified = events.filter((event) => event.verified).length
  return (
    <Page className="employer-page">
      <div className="employer-nav"><div><p className="eyebrow">Employer workspace</p><h1>{mission.company} talent signal</h1></div><button className="secondary"><Menu size={17} /> Edit mission</button></div>
      <section className="employer-summary"><div><span>Students aligned</span><strong>12</strong><small>+3 this week</small></div><div><span>Building proof</span><strong>7</strong><small>58% activated</small></div><div><span>Verified milestones</span><strong>24</strong><small>GitHub + coursework</small></div></section>
      <section className="talent-section"><div className="talent-header"><div><h2>Mission-aligned students</h2><p>Ranked by demonstrated progress, not application volume.</p></div><span>Role · All</span></div><article className="candidate"><div className="candidate-avatar">{(profile.fullName || 'Alex Morgan').split(' ').map((part) => part[0]).join('').slice(0, 2)}</div><div className="candidate-main"><div><h3>{profile.fullName || 'Alex Morgan'}</h3><span>{profile.university || 'Brigham Young University'} · {profile.major || 'Computer Science'}</span></div><p>“{localStorage.getItem('northstar-state') ? (JSON.parse(localStorage.getItem('northstar-state') || '{}').why || 'I want to build technology that gives people back time and agency.') : 'I want to build technology that gives people back time and agency.'}”</p><div className="candidate-tags"><span>{roadmap?.role ?? 'Product Engineer'}</span><span>{profile.skills[0] || 'React'}</span><span>{mission.themes[0]}</span></div></div><div className="candidate-proof"><span>Momentum</span><strong>{points}</strong><small>{verified} verified signals</small><div className="spark-bars"><i /><i /><i /><i /><i /></div></div><button className="circle-button"><ArrowRight /></button></article></section>
      <section className="employer-empty"><Target /><div><h2>Define what “standout” means here.</h2><p>Add the projects, credentials, and working habits your team actually values. Student roadmaps will adapt to the signal.</p></div><button className="primary">Set hiring signal</button></section>
    </Page>
  )
}

export default App
