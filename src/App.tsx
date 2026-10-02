import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  CircleCheck,
  ExternalLink,
  Github,
  Heart,
  LoaderCircle,
  MapPin,
  Newspaper,
  Search,
  Sparkles,
  Target,
  Upload,
  Users,
  X,
} from 'lucide-react'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { fallbackIntel, initialProgress, missions as companyCatalog } from './lib/data'
import { buildCuratedRoadmap, inferRole, rankMissions } from './lib/matching'
import { callFunction, isDemoMode } from './lib/supabase'
import type { AppStep, CompanyIntel, GithubProfile, Mission, ProgressEvent, Roadmap, StudentProfile } from './lib/types'

const emptyProfile: StudentProfile = {
  id: crypto.randomUUID(), university: '', major: '', skills: [], interests: [],
}

const flow: AppStep[] = ['welcome', 'onboarding', 'missions', 'search', 'launch', 'why', 'connect', 'dashboard']

const demoGithub = (login: string): GithubProfile => ({
  login,
  name: login === 'octocat' ? 'The Octocat' : login,
  bio: 'Builder shipping public projects and learning in the open.',
  avatarUrl: `https://github.com/${encodeURIComponent(login)}.png?size=160`,
  profileUrl: `https://github.com/${encodeURIComponent(login)}`,
  publicRepos: 12,
  followers: 24,
  topLanguages: ['TypeScript', 'Python', 'CSS'],
  recentCommitCount: 4,
  repositories: [
    { name: 'mission-project', description: 'A public project connected to a real user problem.', url: `https://github.com/${encodeURIComponent(login)}`, stars: 3, language: 'TypeScript', topics: ['product', 'prototype'], pushedAt: new Date().toISOString() },
  ],
  verified: false,
})

function splitTags(value: string) {
  return value.split(',').map((item) => item.trim()).filter(Boolean)
}

function customMission(company: string): Mission {
  const clean = company.trim() || 'Your company'
  return {
    id: `custom-${clean.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    company: clean,
    domain: '',
    mission: `Build products that make a meaningful difference for the people ${clean} serves.`,
    founderStory: `You chose ${clean}. Live company research will sharpen this mission when the AI research function is connected.`,
    themes: ['technology', 'customers', 'impact'],
    accent: '#c8ff4d', logoUrl: '',
    roleArchetypes: ['Product Engineer', 'Data Analyst', 'Product Designer'],
    projectSeeds: ['customer insight', 'product quality', 'measurable impact'],
  }
}

async function extractResume(file: File): Promise<string> {
  const extension = file.name.split('.').pop()?.toLowerCase()
  if (extension === 'pdf') {
    const pdfjs = await import('pdfjs-dist')
    pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker
    const document = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise
    const pages: string[] = []
    for (let pageNumber = 1; pageNumber <= Math.min(document.numPages, 8); pageNumber += 1) {
      const page = await document.getPage(pageNumber)
      const content = await page.getTextContent()
      pages.push(content.items.map((item) => ('str' in item ? item.str : '')).join(' '))
    }
    return pages.join('\n').slice(0, 14000)
  }
  if (extension === 'docx') {
    const mammoth = await import('mammoth/mammoth.browser')
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })
    return result.value.slice(0, 14000)
  }
  if (extension === 'txt' || extension === 'md') return (await file.text()).slice(0, 14000)
  return `Resume attached: ${file.name}. Skills supplied by the student: use the onboarding profile.`
}

function App() {
  const [step, setStep] = useState<AppStep>('welcome')
  const [profile, setProfile] = useState<StudentProfile>(emptyProfile)
  const [ranked, setRanked] = useState(companyCatalog)
  const [deckIndex, setDeckIndex] = useState(0)
  const [selected, setSelected] = useState<Mission>(companyCatalog[0])
  const [why, setWhy] = useState('')
  const [resumeName, setResumeName] = useState('')
  const [resumeText, setResumeText] = useState('')
  const [github, setGithub] = useState<GithubProfile | null>(null)
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null)
  const [intel, setIntel] = useState<CompanyIntel>(fallbackIntel)
  const [progress, setProgress] = useState<ProgressEvent[]>(initialProgress)
  const [loadingDashboard, setLoadingDashboard] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('northstar-demo-v2')
    if (!saved) return
    try {
      const state = JSON.parse(saved)
      if (state.profile) setProfile(state.profile)
      if (state.selected) setSelected(state.selected)
      if (state.why) setWhy(state.why)
      if (state.resumeName) setResumeName(state.resumeName)
      if (state.resumeText) setResumeText(state.resumeText)
      if (state.github) setGithub(state.github)
      if (state.roadmap) setRoadmap(state.roadmap)
      if (state.progress) setProgress(state.progress)
    } catch { /* A stale local demo should never stop the flow. */ }
  }, [])

  useEffect(() => {
    localStorage.setItem('northstar-demo-v2', JSON.stringify({ profile, selected, why, resumeName, resumeText, github, roadmap, progress }))
  }, [profile, selected, why, resumeName, resumeText, github, roadmap, progress])

  function notify(message: string) {
    setToast(message)
    window.setTimeout(() => setToast(null), 2600)
  }

  function go(next: AppStep) {
    setStep(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function finishOnboarding(next: StudentProfile) {
    setProfile(next)
    setRanked(rankMissions(next, companyCatalog))
    setDeckIndex(0)
    go('missions')
  }

  function voteMission(save: boolean) {
    if (save) {
      setSelected(ranked[deckIndex])
      go('search')
      return
    }
    if (deckIndex === Math.min(ranked.length - 1, 5)) go('search')
    else setDeckIndex((index) => index + 1)
  }

  async function buildDashboard() {
    setLoadingDashboard(true)
    const role = inferRole(profile, [], selected)
    const context = { profile, mission: selected, why, role, github, resumeText }
    const fallback = buildCuratedRoadmap(profile, selected, role, why)
    if (isDemoMode) {
      await new Promise((resolve) => window.setTimeout(resolve, 700))
      setRoadmap(fallback)
      setIntel(fallbackIntel)
    } else {
      const [roadmapResult, intelResult] = await Promise.allSettled([
        callFunction<Roadmap>('generate-roadmap', context),
        callFunction<CompanyIntel>('company-intel', { company: selected.company, domain: selected.domain, mission: selected.mission, role, profile }),
      ])
      setRoadmap(roadmapResult.status === 'fulfilled' ? roadmapResult.value : fallback)
      setIntel(intelResult.status === 'fulfilled' ? intelResult.value : fallbackIntel)
      if (roadmapResult.status === 'rejected') notify('AI roadmap unavailable—your mission-specific fallback is ready.')
    }
    if (github?.recentCommitCount) {
      const commitPoints = Math.min(github.recentCommitCount, 6) * 10
      setProgress((events) => events.some((event) => event.id === 'github-profile') ? events : [{ id: 'github-profile', type: 'github_commit', label: `${github.recentCommitCount} recent GitHub contributions detected`, points: commitPoints, verified: github.verified, occurredAt: new Date().toISOString() }, ...events])
    }
    setLoadingDashboard(false)
    go('dashboard')
  }

  return (
    <div className="app-shell">
      {step !== 'welcome' && <Header step={step} onHome={() => go('welcome')} />}
      <AnimatePresence mode="wait">
        {step === 'welcome' && <Welcome key="welcome" onStart={() => go('onboarding')} />}
        {step === 'onboarding' && <Onboarding key="onboarding" profile={profile} onComplete={finishOnboarding} />}
        {step === 'missions' && <MissionDeck key="missions" missions={ranked} index={deckIndex} onVote={voteMission} onSearch={() => go('search')} />}
        {step === 'search' && <CompanySearch key="search" selected={selected} onSelect={(mission) => { setSelected(mission); go('launch') }} />}
        {step === 'launch' && <NorthStarLaunch key="launch" mission={selected} profile={profile} onContinue={() => go('why')} />}
        {step === 'why' && <Why key="why" mission={selected} value={why} setValue={setWhy} onComplete={() => go('connect')} />}
        {step === 'connect' && <ConnectProof key="connect" profile={profile} resumeName={resumeName} setResumeName={setResumeName} setResumeText={setResumeText} github={github} setGithub={setGithub} onComplete={buildDashboard} busy={loadingDashboard} notify={notify} />}
        {step === 'dashboard' && roadmap && <Dashboard key="dashboard" mission={selected} role={roadmap.role} roadmap={roadmap} intel={intel} github={github} progress={progress} setProgress={setProgress} notify={notify} />}
      </AnimatePresence>
      <AnimatePresence>{toast && <motion.div className="toast" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>{toast}</motion.div>}</AnimatePresence>
    </div>
  )
}

function Brand() {
  return <span className="brand"><span className="brand-mark">✦</span> northstar</span>
}

function Header({ step, onHome }: { step: AppStep; onHome: () => void }) {
  const index = flow.indexOf(step)
  return <header className="site-header"><button className="brand-button" onClick={onHome}><Brand /></button><div className="journey-progress"><i style={{ width: `${(index / (flow.length - 1)) * 100}%` }} /></div><span className="step-count">{String(index).padStart(2, '0')} / 07</span></header>
}

function Page({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <motion.main className={`page ${className}`} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: .3 }}>{children}</motion.main>
}

function Welcome({ onStart }: { onStart: () => void }) {
  return <main className="welcome-v2"><div className="constellation" aria-hidden="true"><i /><i /><i /><i /><i /><svg viewBox="0 0 900 700"><path d="M90 580L250 430L410 485L570 280L790 110" /></svg></div><nav><Brand /></nav><motion.section initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: .1 } } }}><motion.div className="home-star" variants={{ hidden: { opacity: 0, scale: .5 }, show: { opacity: 1, scale: 1 } }}>✦</motion.div><motion.h1 variants={{ hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } }}>Don’t find a job.<br /><em>Find your north star.</em></motion.h1><motion.p variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>Choose a company mission worth caring about. Then build the proof that you belong there.</motion.p><motion.button className="primary lime" onClick={onStart} variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0 } }}>Get started <ArrowRight size={18} /></motion.button></motion.section></main>
}

function Onboarding({ profile, onComplete }: { profile: StudentProfile; onComplete: (value: StudentProfile) => void }) {
  const [draft, setDraft] = useState(profile)
  const [skills, setSkills] = useState(profile.skills.join(', '))
  const [interests, setInterests] = useState(profile.interests.join(', '))
  function submit(event: React.FormEvent) {
    event.preventDefault()
    onComplete({ ...draft, skills: splitTags(skills), interests: splitTags(interests) })
  }
  return <Page className="onboarding-page-v2"><section className="intro-column"><p className="eyebrow">Start with your signal</p><h1>What should your work move forward?</h1><p>No résumé language. Just the things you know and the problems that pull you in.</p></section><form className="profile-form" onSubmit={submit}><label>University<input required value={draft.university} onChange={(event) => setDraft({ ...draft, university: event.target.value })} placeholder="University or school" /></label><label>Major<input required value={draft.major} onChange={(event) => setDraft({ ...draft, major: event.target.value })} placeholder="Computer Science" /></label><label>Current skills<input required value={skills} onChange={(event) => setSkills(event.target.value)} placeholder="React, Python, user research" /><small>Separate skills with commas.</small></label><label>Interests<input required value={interests} onChange={(event) => setInterests(event.target.value)} placeholder="AI safety, biotech, ecommerce" /><small>Industries, problems, or technologies.</small></label><button className="primary" type="submit">Explore missions <ArrowRight size={18} /></button></form></Page>
}

function CompanyLogo({ mission, className = '' }: { mission: Mission; className?: string }) {
  return mission.logoUrl ? <img className={`company-logo ${className}`} src={mission.logoUrl} alt={`${mission.company} logo`} /> : <span className={`company-monogram ${className}`}>{mission.company.slice(0, 2).toUpperCase()}</span>
}

function MissionDeck({ missions, index, onVote, onSearch }: { missions: Mission[]; index: number; onVote: (save: boolean) => void; onSearch: () => void }) {
  const mission = missions[index]
  return <Page className="mission-page-v2"><div className="mission-heading"><div><p className="eyebrow">Explore missions</p><h1>What feels worth building?</h1></div><button className="text-action" onClick={onSearch}>I already know my company <ArrowRight size={15} /></button></div><div className="logo-deck"><motion.article key={mission.id} className="logo-mission-card" drag="x" dragConstraints={{ left: 0, right: 0 }} onDragEnd={(_, info) => Math.abs(info.offset.x) > 100 && onVote(info.offset.x > 0)} initial={{ opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }}><div className="card-company"><CompanyLogo mission={mission} /><strong>{mission.company}</strong></div><blockquote>“{mission.mission}”</blockquote><div className="card-bottom"><p>{mission.founderStory}</p><div>{mission.themes.map((theme) => <span key={theme}>{theme}</span>)}</div></div></motion.article></div><div className="deck-actions"><button className="round-button" onClick={() => onVote(false)} aria-label="Show another company"><X /></button><span>{String(index + 1).padStart(2, '0')} / {String(Math.min(missions.length, 6)).padStart(2, '0')}</span><button className="round-button save" onClick={() => onVote(true)} aria-label={`Choose ${mission.company}`}><Heart /></button></div></Page>
}

function CompanySearch({ selected, onSelect }: { selected: Mission; onSelect: (mission: Mission) => void }) {
  const [query, setQuery] = useState('')
  const results = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return companyCatalog.slice(0, 8)
    return companyCatalog.filter((mission) => `${mission.company} ${mission.domain} ${mission.themes.join(' ')}`.toLowerCase().includes(term)).slice(0, 8)
  }, [query])
  const exact = companyCatalog.some((mission) => mission.company.toLowerCase() === query.trim().toLowerCase())
  return <Page className="company-search-page"><button className="back-link" onClick={() => onSelect(selected)}><ArrowLeft size={15} /> Keep {selected.company}</button><section><p className="eyebrow">Choose your direction</p><h1>What company are you most interested in right now?</h1><div className="giant-search"><Search /><input aria-label="Company search" autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search any company" /></div><div className="company-results">{results.map((mission) => <button key={mission.id} onClick={() => onSelect(mission)}><CompanyLogo mission={mission} /><span><strong>{mission.company}</strong><small>{mission.mission}</small></span><ChevronRight /></button>)}{query.trim() && !exact && <button className="custom-company" onClick={() => onSelect(customMission(query))}><span className="company-monogram">{query.slice(0, 2).toUpperCase()}</span><span><strong>Use {query.trim()}</strong><small>Research this company as my north star</small></span><ArrowRight /></button>}</div></section></Page>
}

function NorthStarLaunch({ mission, profile, onContinue }: { mission: Mission; profile: StudentProfile; onContinue: () => void }) {
  const role = inferRole(profile, [], mission)
  return <Page className="launch-page"><div className="launch-sky"><div className="north-star"><span>✦</span><i /><i /><i /><i /></div><motion.div className="launch-logo" initial={{ y: '52vh', scale: .45, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} transition={{ duration: 1.25, type: 'spring', bounce: .28 }}><CompanyLogo mission={mission} /></motion.div><motion.div className="launch-copy" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .8 }}><p>Your north star</p><h1>{mission.company}</h1><div><Target size={18} /><span>{role}</span></div><button className="primary lime" onClick={onContinue}>This is where I’m headed <ArrowRight size={18} /></button></motion.div></div></Page>
}

function Why({ mission, value, setValue, onComplete }: { mission: Mission; value: string; setValue: (value: string) => void; onComplete: () => void }) {
  return <Page className="why-page-v2"><div className="why-logo"><CompanyLogo mission={mission} /><span>{mission.company}</span></div><div className="why-grid"><section><p className="eyebrow">Make it personal</p><h1>Why does this mission matter to you?</h1><blockquote>“{mission.mission}”</blockquote></section><div><textarea autoFocus maxLength={1200} value={value} onChange={(event) => setValue(event.target.value)} placeholder="A moment, person, or problem that made this real for you…" /><div className="input-meta"><span>{value.trim().split(/\s+/).filter(Boolean).length} words</span><span>{value.length} / 1200</span></div><button className="primary full" disabled={value.trim().length < 30} onClick={onComplete}>Connect my proof <ArrowRight size={18} /></button></div></div></Page>
}

function ConnectProof({ profile, resumeName, setResumeName, setResumeText, github, setGithub, onComplete, busy, notify }: { profile: StudentProfile; resumeName: string; setResumeName: (name: string) => void; setResumeText: (text: string) => void; github: GithubProfile | null; setGithub: (profile: GithubProfile | null) => void; onComplete: () => void; busy: boolean; notify: (message: string) => void }) {
  const [username, setUsername] = useState(github?.login ?? '')
  const [resumeBusy, setResumeBusy] = useState(false)
  const [githubBusy, setGithubBusy] = useState(false)
  async function handleResume(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > 8 * 1024 * 1024) return notify('Please choose a resume under 8 MB.')
    setResumeBusy(true)
    try {
      setResumeText(await extractResume(file))
      setResumeName(file.name)
      notify('Resume connected locally—your file never left this browser.')
    } catch {
      setResumeName(file.name)
      setResumeText(`Resume attached: ${file.name}. Use the student profile skills: ${profile.skills.join(', ')}.`)
      notify('Resume attached. We’ll use your profile skills for this demo.')
    } finally { setResumeBusy(false) }
  }
  async function validateGithub() {
    if (!/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(username)) return notify('Enter a valid GitHub username.')
    setGithubBusy(true)
    try {
      const result = isDemoMode ? demoGithub(username) : await callFunction<GithubProfile>('github-profile', { username })
      setGithub(result)
      notify(result.verified ? 'GitHub profile verified and safely trimmed.' : 'Demo profile connected. Add Supabase keys for live verification.')
    } catch (error) {
      setGithub(null)
      notify(error instanceof Error ? error.message : 'Could not validate that GitHub username.')
    } finally { setGithubBusy(false) }
  }
  return <Page className="connect-page"><section className="connect-title"><p className="eyebrow">Connect your proof</p><h1>Show us what you’ve already built.</h1><p>Your resume stays local. GitHub is validated by the server, then reduced to useful public signals before AI sees it.</p></section><div className="connect-lines"><label className={`upload-line ${resumeName ? 'complete' : ''}`}><span className="connect-icon">{resumeBusy ? <LoaderCircle className="spin" /> : resumeName ? <Check /> : <Upload />}</span><span><strong>{resumeName || 'Attach your resume'}</strong><small>{resumeName ? 'Parsed locally · click to replace' : 'PDF, DOCX, or TXT · up to 8 MB'}</small></span><input type="file" accept=".pdf,.doc,.docx,.txt,.md" onChange={handleResume} /></label><div className={`github-line ${github ? 'complete' : ''}`}><span className="connect-icon"><Github /></span><label><strong>GitHub username</strong><input value={username} onChange={(event) => { setUsername(event.target.value); setGithub(null) }} placeholder="octocat" /></label><button className="secondary" onClick={validateGithub} disabled={githubBusy}>{githubBusy ? <LoaderCircle className="spin" /> : github ? <><Check /> Connected</> : 'Validate'}</button></div>{github && <motion.div className="trimmed-profile" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}><img src={github.avatarUrl} alt="" /><div><strong>{github.name || github.login}</strong><span>@{github.login} · {github.publicRepos} repos · {github.followers} followers</span><p>{github.topLanguages.join(' · ')} · {github.recentCommitCount} recent contributions</p></div><small>{github.verified ? 'Server verified' : 'Demo preview'}</small></motion.div>}</div><button className="primary dashboard-button" disabled={!resumeName || !github || busy} onClick={onComplete}>{busy ? <><LoaderCircle className="spin" /> Building your path</> : <>Build my dashboard <Sparkles size={18} /></>}</button></Page>
}

const levels = [
  { min: 0, name: 'Explorer', note: 'You found the direction.' },
  { min: 100, name: 'Builder', note: 'You are making evidence.' },
  { min: 250, name: 'Practitioner', note: 'Your work is becoming credible.' },
  { min: 450, name: 'Candidate', note: 'You can tell a strong story.' },
  { min: 700, name: 'Standout', note: 'Your signal is hard to ignore.' },
]

function Dashboard({ mission, role, roadmap, intel, github, progress, setProgress, notify }: { mission: Mission; role: string; roadmap: Roadmap; intel: CompanyIntel; github: GithubProfile | null; progress: ProgressEvent[]; setProgress: (events: ProgressEvent[]) => void; notify: (message: string) => void }) {
  const points = progress.reduce((sum, event) => sum + event.points, 0)
  const levelIndex = levels.reduce((current, item, index) => points >= item.min ? index : current, 0)
  const level = levels[levelIndex]
  const next = levels[levelIndex + 1]
  const denominator = next ? next.min - level.min : 1
  const levelPercent = next ? Math.min(100, ((points - level.min) / denominator) * 100) : 100
  function completeProject(index: number, title: string) {
    const id = `project-${index}`
    if (progress.some((event) => event.id === id)) return notify('That milestone is already logged.')
    setProgress([{ id, type: 'project_milestone', label: `Completed: ${title}`, points: 90, verified: false, occurredAt: new Date().toISOString() }, ...progress])
    notify('+90 points · your northstar companion grew')
  }
  function logOutreach(name: string) {
    setProgress([{ id: crypto.randomUUID(), type: 'outreach', label: `Reached out to ${name}`, points: 20, verified: false, occurredAt: new Date().toISOString() }, ...progress])
    notify('+20 points · connection logged')
  }
  return <Page className="dashboard-page"><header className="dashboard-title"><div><p className="eyebrow">Your north star</p><div className="dashboard-company"><CompanyLogo mission={mission} /><span>{mission.company}</span></div><h1>{role}</h1></div><div className="proof-chip"><Github /><span>{github?.recentCommitCount ?? 0} recent contributions</span></div></header><section className="level-section"><div className="level-copy"><span>Level {levelIndex + 1} of 5</span><h2>{level.name}</h2><p>{level.note}</p><div className="level-bar"><i style={{ width: `${levelPercent}%` }} /></div><small>{next ? `${next.min - points} points to ${next.name}` : 'Top level reached'}</small></div><Companion level={levelIndex + 1} /><div className="level-path">{levels.map((item, index) => <div className={index <= levelIndex ? 'reached' : ''} key={item.name}><span>{index < levelIndex ? <Check /> : index + 1}</span><small>{item.name}</small></div>)}</div></section><section className="dashboard-section project-section"><div className="section-lead"><p className="eyebrow">Next steps</p><h2>Build proof that looks like the work.</h2><p>{roadmap.thesis}</p></div><div className="next-projects">{roadmap.projects.map((project, index) => { const done = progress.some((event) => event.id === `project-${index}`); return <article key={project.title} className={done ? 'done' : ''}><span className="project-index">0{index + 1}</span><div><h3>{project.title}</h3><p>{project.brief}</p><div className="project-proof"><Target /> {project.proof}</div><div className="project-details"><span>{project.weeks} weeks</span>{project.tags.map((tag) => <span key={tag}>{tag}</span>)}</div></div><button onClick={() => completeProject(index, project.title)}>{done ? <CircleCheck /> : <><span>Mark complete</span><ArrowRight /></>}</button></article>})}</div></section><section className="dashboard-section connections-section"><div className="section-lead"><p className="eyebrow">Connections</p><h2>Meet people close to the mission.</h2><p>Specific, value-first outreach beats a generic networking message.</p></div>{intel.people.length ? <div className="people-list">{intel.people.map((person) => <article key={`${person.name}-${person.title}`}><div className="person-avatar">{person.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</div><div><h3>{person.name}</h3><span>{person.title}</span><p>{person.reason}</p></div><button onClick={() => logOutreach(person.name)}>Log outreach</button><a href={person.sourceUrl} target="_blank" rel="noreferrer"><ArrowUpRight /></a></article>)}</div> : <ResearchEmpty mission={mission} kind="people" />}<div className="events-block"><div><p className="eyebrow">Upcoming events</p><h3>Places to show up.</h3></div>{intel.events.length ? intel.events.map((event) => <a className="event-row" href={event.sourceUrl} target="_blank" rel="noreferrer" key={`${event.title}-${event.date}`}><time>{new Date(event.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</time><span><strong>{event.title}</strong><small><MapPin /> {event.location}</small></span><ArrowUpRight /></a>) : <ResearchEmpty mission={mission} kind="events" />}</div></section><section className="dashboard-section feed-section"><div className="section-lead"><p className="eyebrow">Mission feed</p><h2>Stay close to what is changing.</h2></div>{intel.feed.length ? <div className="feed-list">{intel.feed.map((item) => <a href={item.sourceUrl} target="_blank" rel="noreferrer" key={`${item.title}-${item.date}`}><time>{new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</time><div><h3>{item.title}</h3><p>{item.summary}</p></div><ArrowUpRight /></a>)}</div> : <ResearchEmpty mission={mission} kind="feed" />}</section><footer className="dashboard-footer"><Brand /><span>{points} momentum points</span></footer></Page>
}

function Companion({ level }: { level: number }) {
  return <motion.div className={`companion level-${level}`} animate={{ y: [0, -8, 0], rotate: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 3 }}><div className="companion-star">✦</div><div className="companion-face"><i /><i /><span /></div><div className="companion-feet"><i /><i /></div></motion.div>
}

function ResearchEmpty({ mission, kind }: { mission: Mission; kind: 'people' | 'events' | 'feed' }) {
  const content = kind === 'people'
    ? { icon: <Users />, title: 'Live people research is ready', body: `Add an OpenAI key to source current ${mission.company} employees with citations.` }
    : kind === 'events'
      ? { icon: <MapPin />, title: 'No verified future events yet', body: 'Only sourced events with a future date will appear here.' }
      : { icon: <Newspaper />, title: 'Live company feed is ready', body: `Connect the research function to pull sourced ${mission.company} updates.` }
  return <div className="research-empty">{content.icon}<div><strong>{content.title}</strong><p>{content.body}</p></div>{mission.domain && <a href={`https://${mission.domain}`} target="_blank" rel="noreferrer">Official site <ExternalLink /></a>}</div>
}

export default App
