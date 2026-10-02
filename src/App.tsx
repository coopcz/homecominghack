import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Activity, AlertCircle, ArrowLeft, ArrowRight, BriefcaseBusiness, Building2, Check,
  ExternalLink, Eye, FolderGit2, Github, GraduationCap, Heart, Linkedin, LoaderCircle,
  Mail, Newspaper, Plus, Radar, ShieldCheck, Sparkles, Target, Upload, UsersRound, X,
} from 'lucide-react'
import { fallbackIntel, missions as companyCatalog } from './lib/data'
import { companyDossiers, withDossier, type CompanyDossier } from './lib/companyData'
import { buildCuratedRoadmap, inferRole, rankMissions } from './lib/matching'
import { verifyLocally, type ProofInput } from './lib/path'
import { buildJobGroundedPath } from './lib/roadmapPath'
import { PathView, ResumeIntakeForm } from './components/Path'
import { buildIntake, detectSkills, extractFileText } from './lib/resume'
import { callFunction, isDemoMode } from './lib/supabase'
import type { AppStep, CompanyIntel, CompanyRecommendation, GithubProfile, MatchInsight, Mission, MissionAlignment, PathStep, ProgressEvent, ResumeIntake, Roadmap, StepRecord, StudentProfile } from './lib/types'

const interestOptions = [
  'Artificial intelligence', 'Humanoid robots', 'Healthcare', 'Biotech', 'E-commerce',
  'Marketplaces', 'Climate', 'Fintech', 'Education', 'Space', 'Consumer design', 'Cybersecurity',
]
const motivationOptions = [
  { label: 'Building new technology', detail: 'Making something possible that did not exist before.' },
  { label: 'Solving a human problem', detail: 'Improving a real outcome for a specific group of people.' },
  { label: 'Starting from scratch', detail: 'Turning ambiguity into the first useful version.' },
  { label: 'Improving a system', detail: 'Making important infrastructure work measurably better.' },
]
const flow: AppStep[] = ['welcome', 'interests', 'profile', 'motivation', 'signals', 'missions', 'problem', 'why', 'confirm', 'match', 'mission', 'employer']
const emptyProfile: StudentProfile = { id: crypto.randomUUID(), university: '', major: '', skills: [], interests: [] }

const demoGithub = (login: string): GithubProfile => ({
  login, name: login === 'octocat' ? 'The Octocat' : login, bio: 'Builder shipping public projects and learning in the open.',
  avatarUrl: `https://github.com/${encodeURIComponent(login)}.png?size=160`, profileUrl: `https://github.com/${encodeURIComponent(login)}`,
  publicRepos: 12, followers: 24, topLanguages: ['TypeScript', 'Python', 'CSS'], recentCommitCount: 5,
  repositories: [{ name: 'mission-project', description: 'A public project connected to a real user problem.', url: `https://github.com/${encodeURIComponent(login)}`, stars: 3, language: 'TypeScript', topics: ['product', 'prototype'], pushedAt: new Date().toISOString() }],
  verified: false,
})

export default function App() {
  const [step, setStep] = useState<AppStep>('welcome')
  const [profile, setProfile] = useState<StudentProfile>(emptyProfile)
  const [motivation, setMotivation] = useState('')
  const [ranked, setRanked] = useState<Mission[]>(companyCatalog.slice(0, 10))
  const [recommendationReasons, setRecommendationReasons] = useState<Record<string, string>>({})
  const [deckIndex, setDeckIndex] = useState(0)
  const [matchedIds, setMatchedIds] = useState<string[]>([])
  const [selected, setSelected] = useState<Mission>(companyCatalog[0])
  const [why, setWhy] = useState('')
  const [role, setRole] = useState('Product Engineer')
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null)
  const [intel, setIntel] = useState<CompanyIntel>(fallbackIntel)
  const [github, setGithub] = useState<GithubProfile | null>(null)
  const [progress, setProgress] = useState<ProgressEvent[]>([])
  const [resume, setResume] = useState<ResumeIntake | null>(null)
  const [path, setPath] = useState<PathStep[]>([])
  const [records, setRecords] = useState<Record<string, StepRecord>>({})
  const [matchInsights, setMatchInsights] = useState<MatchInsight[]>([])
  const [commitmentBusy, setCommitmentBusy] = useState(false)
  const [discovering, setDiscovering] = useState(false)
  const [planBusy, setPlanBusy] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [missionTab, setMissionTab] = useState<MissionTab>('roadmap')

  useEffect(() => {
    const saved = localStorage.getItem('northstar-demo-v4')
    if (!saved) return
    try {
      const state = JSON.parse(saved)
      if (state.profile) setProfile(state.profile)
      if (state.motivation) setMotivation(state.motivation)
      if (state.selected) setSelected(state.selected)
      if (state.why) setWhy(state.why)
      if (state.role) setRole(state.role)
      if (state.roadmap) setRoadmap(state.roadmap)
      if (state.intel) setIntel(state.intel)
      if (state.github) setGithub(state.github)
      if (state.progress) setProgress(state.progress)
      if (state.resume) setResume(state.resume)
      if (state.path) setPath(state.path)
      if (state.records) setRecords(state.records)
    } catch { localStorage.removeItem('northstar-demo-v4') }
  }, [])

  useEffect(() => {
    localStorage.setItem('northstar-demo-v4', JSON.stringify({ profile, motivation, selected, why, role, roadmap, intel, github, progress, resume, path, records }))
  }, [profile, motivation, selected, why, role, roadmap, intel, github, progress, resume, path, records])

  // Each screen is its own history entry, so the browser back/forward buttons move one screen at a time.
  useEffect(() => {
    window.history.replaceState({ step: 'welcome' }, '', '#/welcome')
    const onPop = (event: PopStateEvent) => {
      const next = flow.includes(event.state?.step) ? (event.state.step as AppStep) : 'welcome'
      setStep(next); window.scrollTo({ top: 0 })
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  // Screens that need a generated roadmap fall back to the plan screen if history lands on them without one.
  useEffect(() => { if ((step === 'mission' || step === 'employer') && !roadmap) setStep('confirm') }, [step, roadmap])

  function go(next: AppStep) {
    if (next !== step) window.history.pushState({ step: next }, '', `#/${next}`)
    setStep(next); window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  function notify(message: string) { setToast(message); window.setTimeout(() => setToast(null), 2800) }

  async function discoverCompanies(nextResume: ResumeIntake | null, nextGithub: GithubProfile | null) {
    setResume(nextResume); setGithub(nextGithub); setDiscovering(true)
    const signalSkills = [...profile.skills, ...(nextResume?.skills ?? []), ...(nextGithub?.topLanguages ?? []), motivation]
    const matchingProfile = { ...profile, skills: [...new Set(signalSkills)] }
    setProfile(matchingProfile)
    const localRanked = rankMissions(matchingProfile, companyCatalog).slice(0, 14)
    let nextRanked = localRanked
    let reasons: Record<string, string> = {}
    if (!isDemoMode) {
      try {
        const result = await callFunction<CompanyRecommendation>('recommend-companies', {
          profile: matchingProfile, motivation,
          resume: nextResume ? { skills: nextResume.skills, experience: nextResume.experience, text: nextResume.text.slice(0, 7000) } : null,
          github: nextGithub ? { topLanguages: nextGithub.topLanguages, repositories: nextGithub.repositories.slice(0, 6) } : null,
          catalog: companyCatalog.map(({ id, company, mission, themes, projectSeeds, locations }) => ({ id, company, mission, themes, projectSeeds, locations })),
        })
        const fromAI = result.missionIds.map((id) => companyCatalog.find((mission) => mission.id === id)).filter((mission): mission is Mission => Boolean(mission))
        nextRanked = [...fromAI, ...localRanked.filter((mission) => !result.missionIds.includes(mission.id))].slice(0, 14)
        reasons = result.reasons
      } catch { notify('Using the relevance model built into the demo.') }
    } else await new Promise((resolve) => window.setTimeout(resolve, 480))
    setRanked(nextRanked); setRecommendationReasons(reasons); setDeckIndex(0); setMatchedIds([]); setDiscovering(false); go('missions')
  }

  async function voteMission(save: boolean) {
    const current = ranked[deckIndex]
    const nextMatches = save && !matchedIds.includes(current.id) ? [...matchedIds, current.id] : matchedIds
    if (save) setMatchedIds(nextMatches)
    if (nextMatches.length === 3) {
      const matches = nextMatches.map((id) => ranked.find((mission) => mission.id === id)).filter((mission): mission is Mission => Boolean(mission))
      setCommitmentBusy(true); setMatchInsights([]); go('problem')
      const fallback = matches.map((mission) => ({ missionId: mission.id, problem: mission.projectSeeds[0], founderReason: mission.founderStory, whyYou: recommendationReasons[mission.id] || `${mission.themes.slice(0, 2).join(' and ')} connect to your interests and background.`, sourceUrl: `https://${mission.domain}` }))
      if (!isDemoMode) {
        try {
          const result = await callFunction<{ insights: MatchInsight[] }>('research-matches', { missions: matches, profile, resume: resume ? { skills: resume.skills, experience: resume.experience } : null, github: github ? { topLanguages: github.topLanguages } : null, motivation })
          setMatchInsights(result.insights.length === 3 ? result.insights : fallback)
        } catch { setMatchInsights(fallback); notify('Using verified catalog stories for this comparison.') }
      } else { await new Promise((resolve) => window.setTimeout(resolve, 650)); setMatchInsights(fallback) }
      setCommitmentBusy(false); return
    }
    setDeckIndex((index) => (index + 1) % ranked.length)
  }

  function finishWhy(value: string) {
    setWhy(value); setRole(inferRole(profile, [motivation, value], selected)); go('confirm')
  }

  async function generatePlan(nextRole: string, nextProfile: StudentProfile, nextResume: ResumeIntake | null, jobSource?: string) {
    setProfile(nextProfile); setResume(nextResume); setRole(nextRole); setPlanBusy(true); setPath([]); setRecords({}); setProgress((events) => events.filter((event) => ['github-connect', 'github-commits'].includes(event.id)))
    const curated = buildCuratedRoadmap(nextProfile, selected, nextRole, why)
    if (jobSource) curated.targetJob = { ...curated.targetJob!, sourceUrl: jobSource, status: 'sourced' }
    const preloadedIntel = withDossier(selected.id, fallbackIntel)
    setRoadmap(curated); setIntel(preloadedIntel); go('match')
    let nextIntel = preloadedIntel
    let nextRoadmap = curated
    if (!isDemoMode) {
      try {
        const researched = await callFunction<CompanyIntel>('company-intel', { company: selected.company, domain: selected.domain, mission: selected.mission, role: nextRole, profile: nextProfile, jobSource })
        nextIntel = withDossier(selected.id, researched)
        setIntel(nextIntel)
      } catch { /* The verified local dossier remains available to roadmap generation. */ }
      try {
        const generated = await callFunction<Roadmap>('generate-roadmap', {
          profile: nextProfile, resume: nextResume ? { skills: nextResume.skills, experience: nextResume.experience, text: nextResume.text.slice(0, 10000) } : null,
          github: github ? { topLanguages: github.topLanguages, repositories: github.repositories.slice(0, 6) } : null,
          mission: selected, why, motivation, chosenProblem: selected.projectSeeds[0], role: nextRole, companyResearch: nextIntel, jobSource,
        })
        if (generated.version === 2 && generated.targetJob && generated.requirements?.length && generated.projects.every((project) => project.preview && project.acceptanceCriteria?.length)) nextRoadmap = generated
      } catch { /* Keep the detailed curated roadmap when live generation is unavailable. */ }
    }
    setIntel(nextIntel); setRoadmap(nextRoadmap)
    const intake = nextResume ?? { text: '', skills: [...new Set([...nextProfile.skills, ...(github?.topLanguages ?? [])])], experience: [] }
    let nextPath = buildJobGroundedPath(nextProfile, intake, selected, nextRole)
    if (!isDemoMode) {
      try {
        const result = await callFunction<{ steps: PathStep[] }>('generate-path', { profile: nextProfile, resume: intake, role: nextRole, why, motivation, mission: selected, roadmap: nextRoadmap, companyResearch: nextIntel, github, jobSource })
        if (result.steps?.length && result.steps.every((step) => step.phase && step.completionMode && step.resources)) nextPath = result.steps
      } catch { notify('Using the built-in path builder.') }
    }
    setPath(nextPath)
    setPlanBusy(false)
  }

  const matchedMissions = useMemo(() => matchedIds.map((id) => ranked.find((mission) => mission.id === id)).filter((mission): mission is Mission => Boolean(mission)), [matchedIds, ranked])

  return <div className="app-shell">
    {step !== 'welcome' && <Header step={step} onHome={() => go('welcome')} tab={missionTab} onTab={setMissionTab} />}
    <AnimatePresence mode="wait">
      {step === 'welcome' && <Welcome key="welcome" onStart={() => go('interests')} />}
      {step === 'interests' && <InterestsStep key="interests" profile={profile} onComplete={(interests) => { setProfile({ ...profile, interests }); go('profile') }} />}
      {step === 'profile' && <ProfileStep key="profile" profile={profile} onComplete={(details) => { setProfile({ ...profile, ...details }); go('motivation') }} />}
      {step === 'motivation' && <MotivationStep key="motivation" value={motivation} busy={false} onComplete={(value) => { setMotivation(value); go('signals') }} />}
      {step === 'signals' && <SignalsStep key="signals" resume={resume} github={github} busy={discovering} onComplete={discoverCompanies} notify={notify} />}
      {step === 'missions' && <MissionDeck key={`mission-${deckIndex}`} missions={ranked} index={deckIndex} matches={matchedMissions} reason={recommendationReasons[ranked[deckIndex]?.id]} onVote={voteMission} />}
      {step === 'problem' && <ProblemStep key="problem" missions={matchedMissions} insights={matchInsights} busy={commitmentBusy} onSelect={(mission) => { setSelected(mission); go('why') }} />}
      {step === 'why' && <WhyStep key="why" mission={selected} value={why} onComplete={finishWhy} />}
      {step === 'confirm' && <PlanConfirmation key="confirm" mission={selected} profile={profile} role={role} resume={resume} onBack={() => go('why')} onGenerate={generatePlan} />}
      {step === 'match' && (!roadmap ? <MatchLoading key="loading" mission={selected} /> : <MatchReveal key="match" mission={selected} roadmap={roadmap} intel={intel} enhancing={planBusy} onBack={() => go('problem')} onStart={() => go('mission')} />)}
      {step === 'mission' && roadmap && <MissionControl key="mission-control" tab={missionTab} profile={profile} why={why} motivation={motivation} resume={resume} setResume={setResume} setPath={setPath} setGithub={setGithub} mission={selected} roadmap={roadmap} intel={intel} path={path} records={records} setRecords={setRecords} github={github} progress={progress} setProgress={setProgress} onEmployer={() => go('employer')} notify={notify} />}
      {step === 'employer' && roadmap && <EmployerView key="employer" profile={profile} mission={selected} roadmap={roadmap} why={why} motivation={motivation} resume={resume} github={github} progress={progress} path={path} records={records} onBack={() => go('mission')} />}
    </AnimatePresence>
    <AnimatePresence>{toast && <motion.div className="toast" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 18 }}>{toast}</motion.div>}</AnimatePresence>
  </div>
}

function Brand() { return <span className="brand"><span className="brand-mark">✦</span> northstar</span> }
type MissionTab = 'roadmap' | 'people' | 'information' | 'feed'
const missionTabs: { id: MissionTab; label: string; icon: React.ReactNode }[] = [
  { id: 'roadmap', label: 'Roadmap', icon: <Target size={16} /> }, { id: 'people', label: 'People worth learning from', icon: <UsersRound size={16} /> },
  { id: 'information', label: 'Relevant information', icon: <Radar size={16} /> }, { id: 'feed', label: 'Company feed', icon: <Newspaper size={16} /> },
]
function Header({ step, onHome, tab, onTab }: { step: AppStep; onHome: () => void; tab: MissionTab; onTab: (tab: MissionTab) => void }) {
  const index = flow.indexOf(step)
  const tabbed = step === 'mission'
  return <header className={`site-header${tabbed ? ' has-tabs' : ''}`}><button className="brand-button" onClick={onHome}><Brand /></button>{tabbed ? <nav className="header-tabs" aria-label="Mission plan sections">{missionTabs.map((item) => <button className={tab === item.id ? 'active' : ''} onClick={() => onTab(item.id)} key={item.id}>{item.icon} {item.label}</button>)}</nav> : <div className="journey-progress"><i style={{ width: `${(index / (flow.length - 1)) * 100}%` }} /></div>}<span className="step-count">{String(index).padStart(2, '0')} / {String(flow.length - 1).padStart(2, '0')}</span></header>
}
function Page({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <motion.main className={`page ${className}`} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: .28 }}>{children}</motion.main>
}
const sparkles = [
  { x: -250, y: 30, size: 14, delay: 0 }, { x: 240, y: 50, size: 12, delay: .6 }, { x: -150, y: -30, size: 9, delay: 1.1 },
  { x: 170, y: -20, size: 10, delay: .3 }, { x: -320, y: 110, size: 8, delay: .9 }, { x: 330, y: 120, size: 9, delay: 1.4 },
  { x: -80, y: 150, size: 7, delay: 1.7 }, { x: 95, y: 160, size: 8, delay: .2 },
]
function DestinationHero({ mission, role }: { mission: Mission; role: string }) {
  const rise = typeof window === 'undefined' ? 800 : window.innerHeight
  const land = 2.8
  return <div className="destination-hero" aria-label={`${mission.company}, ${role}`}>
    <motion.div className="destination-rays" aria-hidden="true" initial={{ opacity: 0, scale: .4 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: land - .2, duration: 1.6, ease: 'easeOut' }} />
    <motion.div className="destination-glow" aria-hidden="true" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: land - .4, duration: 1.4 }} />
    {sparkles.map((sparkle, index) => <motion.span className="destination-sparkle" aria-hidden="true" key={index} style={{ left: `calc(50% + ${sparkle.x}px)`, top: `calc(50% + ${sparkle.y - 40}px)`, fontSize: sparkle.size }} initial={{ opacity: 0, scale: 0 }} animate={{ opacity: [0, 1, .25, 1, 0], scale: [0, 1.2, .8, 1.1, 0] }} transition={{ delay: land + sparkle.delay, duration: 3.2, repeat: Infinity, repeatDelay: .4 }}>✦</motion.span>)}
    <motion.div className="destination-ship" initial={{ y: rise, scale: .45, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} transition={{ duration: land, ease: [.5, .02, .2, 1], opacity: { duration: .6 } }}>
      <motion.i className="destination-trail" aria-hidden="true" initial={{ scaleY: 1, opacity: .9 }} animate={{ scaleY: 0, opacity: 0 }} transition={{ duration: land + .4, ease: 'easeOut' }} />
      <motion.i className="destination-ring" aria-hidden="true" initial={{ scale: .6, opacity: 0 }} animate={{ scale: [0.6, 2.6], opacity: [.8, 0] }} transition={{ delay: land - .1, duration: 1.3, ease: 'easeOut' }} />
      <motion.div className="destination-logo" animate={{ y: [0, -7, 0] }} transition={{ delay: land + .6, duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}><CompanyLogo mission={mission} /></motion.div>
    </motion.div>
    <motion.div className="destination-name" initial={{ opacity: 0, y: 14, letterSpacing: '.3em' }} animate={{ opacity: 1, y: 0, letterSpacing: '-.04em' }} transition={{ delay: land + .1, duration: 1.1, ease: 'easeOut' }}>
      <strong>{mission.company}</strong><span><Target size={15} /> {role}</span>
    </motion.div>
  </div>
}
function CompanyLogo({ mission, className = '' }: { mission: Mission; className?: string }) {
  return mission.logoUrl ? <img className={`company-logo ${className}`} src={mission.logoUrl} alt={`${mission.company} logo`} /> : <span className={`company-monogram ${className}`}>{mission.company.slice(0, 2).toUpperCase()}</span>
}

function Welcome({ onStart }: { onStart: () => void }) {
  return <main className="welcome"><div className="orbit" aria-hidden="true"><i /><i /><i /></div><span className="welcome-star" aria-hidden="true">✦</span><nav><Brand /></nav><motion.section initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: .1 } } }}><motion.p className="kicker" variants={{ hidden:{opacity:0,y:12},show:{opacity:1,y:0} }}>Mission-first career discovery</motion.p><motion.h1 variants={{ hidden:{opacity:0,y:24},show:{opacity:1,y:0} }}>Build toward work<br /><em>you actually care about.</em></motion.h1><motion.p className="hero-copy" variants={{ hidden:{opacity:0,y:18},show:{opacity:1,y:0} }}>Discover a company mission, understand why you fit, and follow a plan that produces proof.</motion.p><motion.button className="primary" onClick={onStart} variants={{ hidden:{opacity:0,y:15},show:{opacity:1,y:0} }}>Find my north star <ArrowRight size={18} /></motion.button></motion.section></main>
}

function InterestsStep({ profile, onComplete }: { profile: StudentProfile; onComplete: (interests: string[]) => void }) {
  const [selected, setSelected] = useState(profile.interests)
  const [custom, setCustom] = useState('')
  function toggle(value: string) { setSelected((items) => items.includes(value) ? items.filter((item) => item !== value) : [...items, value]) }
  function addCustom() { const value = custom.trim(); if (value && !selected.includes(value)) setSelected((items) => [...items, value]); setCustom('') }
  return <Page className="interest-page"><section><p className="eyebrow">01 · Direction</p><h1>What kinds of problems pull you in?</h1><p>Choose as many as you want. The next companies will be filtered against these signals.</p></section><div className="interest-workspace"><div className="interest-grid">{interestOptions.map((interest) => <button className={selected.includes(interest) ? 'selected' : ''} onClick={() => toggle(interest)} key={interest}><span>{interest}</span>{selected.includes(interest) ? <Check size={17} /> : <Plus size={17} />}</button>)}</div><div className="custom-interest"><label htmlFor="custom-interest">Something else?</label><div><input id="custom-interest" value={custom} onChange={(event) => setCustom(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addCustom() } }} placeholder="Urban mobility, food systems, creator tools…" /><button onClick={addCustom} disabled={!custom.trim()}>Add</button></div></div>{selected.length > 0 && <div className="selected-tags">{selected.map((interest) => <button onClick={() => toggle(interest)} key={interest}>{interest}<X size={13} /></button>)}</div>}<button className="primary continue" disabled={!selected.length} onClick={() => onComplete(selected)}>Continue <ArrowRight size={18} /></button></div></Page>
}

function ProfileStep({ profile, onComplete }: { profile: StudentProfile; onComplete: (details: Pick<StudentProfile, 'name'|'email'|'linkedinUrl'|'major'|'university'>) => void }) {
  const [name, setName] = useState(profile.name ?? '')
  const [email, setEmail] = useState(profile.email ?? '')
  const [linkedinUrl, setLinkedinUrl] = useState(profile.linkedinUrl ?? '')
  const [major, setMajor] = useState(profile.major)
  const [university, setUniversity] = useState(profile.university)
  return <Page className="profile-page"><section><p className="eyebrow">02 · Starting point</p><h1>Where are you starting from?</h1><p>This becomes the candidate profile an employer can review. You can update it any time.</p></section><form onSubmit={(event) => { event.preventDefault(); onComplete({ name: name.trim(), email: email.trim(), linkedinUrl: linkedinUrl.trim(), major: major.trim(), university: university.trim() }) }}><div className="profile-contact-grid"><label><span>Your name</span><input autoFocus required value={name} onChange={(event) => setName(event.target.value)} placeholder="Jordan Lee" /></label><label><span><Mail size={18} /> Email</span><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="jordan@school.edu" /></label></div><label><span><Linkedin size={18} /> LinkedIn profile <small>(optional)</small></span><input type="url" value={linkedinUrl} onChange={(event) => setLinkedinUrl(event.target.value)} placeholder="https://linkedin.com/in/jordanlee" /></label><label><span><BriefcaseBusiness size={18} /> What are you studying, or what do you do?</span><input required value={major} onChange={(event) => setMajor(event.target.value)} placeholder="Computer science student, product designer, economics major…" /></label><label><span><GraduationCap size={18} /> What college are you at or did you attend?</span><input required value={university} onChange={(event) => setUniversity(event.target.value)} placeholder="University, bootcamp, or self-taught" /></label><button className="primary" disabled={!name.trim() || !email.trim() || !major.trim() || !university.trim()} type="submit">Continue <ArrowRight size={18} /></button></form></Page>
}

function MotivationStep({ value, busy, onComplete }: { value: string; busy: boolean; onComplete: (value: string) => void }) {
  const [selected, setSelected] = useState(value)
  return <Page className="motivation-page"><p className="eyebrow">03 · Motivation</p><h1>What excites you most?</h1><div className="answer-list">{motivationOptions.map((option) => <button className={selected === option.label ? 'selected' : ''} onClick={() => setSelected(option.label)} key={option.label}><span><strong>{option.label}</strong><small>{option.detail}</small></span><ArrowRight /></button>)}</div><button className="primary next-button" disabled={!selected || busy} onClick={() => onComplete(selected)}>{busy ? <><LoaderCircle className="spin" /> Finding relevant companies</> : <>Show me relevant missions <Radar size={18} /></>}</button></Page>
}

function SignalsStep({ resume, github, busy, onComplete, notify }: { resume: ResumeIntake | null; github: GithubProfile | null; busy: boolean; onComplete: (resume: ResumeIntake | null, github: GithubProfile | null) => void; notify: (message: string) => void }) {
  const [text, setText] = useState(resume?.text ?? '')
  const [fileName, setFileName] = useState(resume?.fileName)
  const [username, setUsername] = useState(github?.login ?? '')
  const [connected, setConnected] = useState<GithubProfile | null>(github)
  const [reading, setReading] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState('')
  async function pick(file?: File) {
    if (!file) return
    setReading(true); setError('')
    try {
      const extracted = (await extractFileText(file)).trim()
      if (extracted.length < 40) throw new Error('We could not find enough text in that file.')
      setText(extracted); setFileName(file.name)
    } catch (problem) { setError(problem instanceof Error ? problem.message : 'Could not read that file.') } finally { setReading(false) }
  }
  async function connect() {
    const clean = username.trim().replace(/^@/, '')
    if (!clean) return
    setConnecting(true); setError('')
    try {
      const result = isDemoMode ? await new Promise<GithubProfile>((resolve) => window.setTimeout(() => resolve(demoGithub(clean)), 500)) : await callFunction<GithubProfile>('github-profile', { username: clean })
      setConnected(result); notify(`Connected @${result.login}`)
    } catch (problem) { setError(problem instanceof Error ? problem.message : 'Could not connect GitHub.') } finally { setConnecting(false) }
  }
  function continueFlow() {
    const skills = [...new Set([...(resume?.skills ?? []), ...detectSkills(text), ...(connected?.topLanguages ?? [])])]
    const intake = text.trim() || skills.length ? buildIntake(text, fileName, skills) : null
    onComplete(intake, connected)
  }
  return <Page className="signals-page"><div className="signals-intro"><p className="eyebrow">04 · Your signal</p><h1>Give the match more to work with.</h1><p>Your work and public code help separate a company that sounds interesting from one where you can contribute.</p></div><div className="signals-grid"><label className="signal-pane resume-drop"><Upload /><span><strong>{fileName ?? 'Upload your resume'}</strong><small>PDF, Word, or text · used only to personalize your match</small></span><input type="file" accept=".pdf,.docx,.txt,.md,application/pdf" onChange={(event) => pick(event.target.files?.[0])} /></label><div className="signal-pane github-inline"><Github /><div><strong>{connected ? `@${connected.login} connected` : 'Connect your GitHub'}</strong><small>{connected ? `${connected.publicRepos} public repositories · ${connected.topLanguages.slice(0, 3).join(', ')}` : 'We send only a trimmed public profile into matching.'}</small></div><div className="github-entry"><span>github.com/</span><input value={username} onChange={(event) => { setUsername(event.target.value); setConnected(null) }} placeholder="username" aria-label="GitHub username" /><button onClick={connect} disabled={!username.trim() || connecting}>{connecting ? <LoaderCircle className="spin" /> : connected ? <Check /> : <ArrowRight />}</button></div></div></div>{reading && <p className="signal-status"><LoaderCircle className="spin" /> Reading your resume</p>}{error && <p className="form-error"><AlertCircle size={15} />{error}</p>}<button className="primary signals-continue" disabled={busy || reading || connecting} onClick={continueFlow}>{busy ? <><LoaderCircle className="spin" /> Finding your companies</> : <>Find my companies <Radar size={18} /></>}</button></Page>
}

function MissionDeck({ missions, index, matches, reason, onVote }: { missions: Mission[]; index: number; matches: Mission[]; reason?: string; onVote: (save: boolean) => void }) {
  const mission = missions[index]
  return <Page className="mission-page"><div className="mission-heading"><div><p className="eyebrow">04 · Relevant missions</p><h1>Choose three worth exploring.</h1></div><div className="match-slots">{[0,1,2].map((slot) => <span className={matches[slot] ? 'filled' : ''} key={slot}>{matches[slot] ? <CompanyLogo mission={matches[slot]} /> : slot + 1}</span>)}</div></div><p className="deck-context">Filtered from your interests · {index + 1} of {missions.length}</p><div className="deck-wrap"><motion.article className="mission-card" drag="x" dragConstraints={{ left:0,right:0 }} onDragEnd={(_, info) => Math.abs(info.offset.x) > 90 && onVote(info.offset.x > 0)} initial={{ opacity:0,scale:.96,rotate:1 }} animate={{ opacity:1,scale:1,rotate:0 }} exit={{ opacity:0,x:120 }}><div className="mission-company"><CompanyLogo mission={mission} /><strong>{mission.company}</strong></div><blockquote>“{mission.mission}”</blockquote><div className="mission-foot"><p>{reason || `${mission.themes.slice(0,2).join(' and ')} connect directly to the interests you selected.`}</p><div>{mission.themes.map((theme) => <span key={theme}>{theme}</span>)}</div></div></motion.article></div><div className="deck-actions"><button className="round-button" onClick={() => onVote(false)} aria-label="Skip company"><X /></button><span>{matches.length} / 3 matched</span><button className="round-button save" onClick={() => onVote(true)} aria-label={`Match with ${mission.company}`}><Heart /></button></div></Page>
}

function ProblemStep({ missions, insights, busy, onSelect }: { missions: Mission[]; insights: MatchInsight[]; busy: boolean; onSelect: (mission: Mission) => void }) {
  const [index, setIndex] = useState(0)
  const mission = missions[index]
  const insight = insights.find((item) => item.missionId === mission?.id)
  if (busy || !mission) return <Page className="commitment-loading"><LoaderCircle className="spin" /><p className="eyebrow">05 · Commitment</p><h1>Looking deeper at your three.</h1><p>Reading founder stories and the problem each company is actually trying to solve.</p></Page>
  return <Page className="problem-page"><div className="commitment-head"><div><p className="eyebrow">05 · Commitment</p><h1>Which problem stays with you?</h1></div><span>{index + 1} / {missions.length}</span></div><AnimatePresence mode="wait"><motion.article className="commitment-card" key={mission.id} initial={{ opacity: 0, x: 35 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -35 }}><div className="commitment-company"><CompanyLogo mission={mission} /><div><strong>{mission.company}</strong><small>{mission.locations?.slice(0, 2).join(' · ')}</small></div></div><blockquote>“{mission.mission}”</blockquote><div className="commitment-detail"><section><span>The problem</span><p>{insight?.problem ?? mission.projectSeeds[0]}</p></section><section><span>Why the founders started</span><p>{insight?.founderReason ?? mission.founderStory}</p>{insight?.sourceUrl && <a href={insight.sourceUrl} target="_blank" rel="noreferrer">Source <ExternalLink size={13} /></a>}</section><section><span>Why it fits you</span><p>{insight?.whyYou ?? `${mission.themes.slice(0, 2).join(' and ')} match the direction you chose.`}</p></section></div><button className="primary" onClick={() => onSelect(mission)}>Choose {mission.company} <ArrowRight size={18} /></button></motion.article></AnimatePresence><div className="commitment-nav"><button aria-label="Previous company" onClick={() => setIndex((index - 1 + missions.length) % missions.length)}><ArrowLeft /></button>{missions.map((item, itemIndex) => <button className={itemIndex === index ? 'active' : ''} aria-label={`View ${item.company}`} onClick={() => setIndex(itemIndex)} key={item.id}><CompanyLogo mission={item} /></button>)}<button aria-label="Next company" onClick={() => setIndex((index + 1) % missions.length)}><ArrowRight /></button></div></Page>
}

function WhyStep({ mission, value, onComplete }: { mission: Mission; value: string; onComplete: (value: string) => void }) {
  const [why, setWhy] = useState(value)
  return <Page className="why-page"><div className="why-context"><CompanyLogo mission={mission} /><span><strong>{mission.company}</strong><small>{mission.projectSeeds[0]}</small></span></div><section><div><p className="eyebrow">06 · Conviction</p><h1>Why does this matter to you?</h1><p>Specific beats impressive. Tell us what you have seen, experienced, or cannot stop thinking about.</p></div><div className="why-input"><textarea autoFocus maxLength={900} value={why} onChange={(event) => setWhy(event.target.value)} placeholder="A person, moment, or problem that made this real for you…" /><span>{why.trim().split(/\s+/).filter(Boolean).length} words</span><button className="primary" disabled={!why.trim()} onClick={() => onComplete(why.trim())}>Build my mission brief <Sparkles size={18} /></button></div></section></Page>
}

function PlanConfirmation({ mission, profile, role, resume, onBack, onGenerate }: { mission: Mission; profile: StudentProfile; role: string; resume: ResumeIntake | null; onBack: () => void; onGenerate: (role: string, profile: StudentProfile, resume: ResumeIntake | null, jobSource?: string) => void }) {
  const [targetRole, setTargetRole] = useState(role)
  const [month, setMonth] = useState(profile.graduationMonth ?? '')
  const [year, setYear] = useState(profile.graduationYear ?? '')
  const [skillsText, setSkillsText] = useState(profile.skills.filter((skill) => !/computer science|^cs$/i.test(skill)).join(', '))
  const [jobSource, setJobSource] = useState('')
  const skills = skillsText.split(',').map((skill) => skill.trim()).filter((skill) => skill && !/computer science|^cs$/i.test(skill))
  const ready = targetRole.trim() && month && /^20\d{2}$/.test(year) && skills.length > 0
  return <Page className="confirmation-page"><section><button className="back-inline" onClick={onBack}><ArrowLeft size={16}/> Back</button><p className="eyebrow">Confirm your target</p><h1>Build the plan around the real job.</h1><p>Check the target and the skills you can actually use. Your major stays education context—it is never counted as a skill.</p></section><form onSubmit={(event) => { event.preventDefault(); if (ready) onGenerate(targetRole.trim(), { ...profile, skills, graduationMonth: month, graduationYear: year }, resume, jobSource.trim() || undefined) }}><div className="confirm-grid"><label><span>Company</span><input value={mission.company} readOnly aria-readonly="true" /></label><label><span>Technical role</span><input autoFocus value={targetRole} onChange={(event) => setTargetRole(event.target.value)} placeholder="Healthcare Data Engineer" /></label><label><span>Graduation month</span><select value={month} onChange={(event) => setMonth(event.target.value)}><option value="">Choose month</option>{['January','May','August','December'].map((value) => <option key={value}>{value}</option>)}</select></label><label><span>Graduation year</span><input inputMode="numeric" value={year} onChange={(event) => setYear(event.target.value.replace(/\D/g,'').slice(0,4))} placeholder="2027" /></label></div><label><span>Actual skills <small>comma separated</small></span><input value={skillsText} onChange={(event) => setSkillsText(event.target.value)} placeholder="Python, SQL, React" /></label><label><span>Official job URL or pasted description <small>optional</small></span><textarea rows={4} value={jobSource} onChange={(event) => setJobSource(event.target.value)} placeholder="https://company.com/careers/… or paste the description" /></label><div className="confirm-note"><ShieldCheck size={18}/><span>{jobSource.trim() ? 'We’ll treat this as the supplied job source and preserve it with the plan.' : 'No exact description supplied. The plan will clearly label its role profile as inferred.'}</span></div><button className="primary" type="submit" disabled={!ready}>Generate roadmap <ArrowRight size={18}/></button></form></Page>
}

function MatchLoading({ mission }: { mission: Mission }) {
  return <main className="match-loading"><CompanyLogo mission={mission} /><LoaderCircle className="spin" /><h1>Loading your mission</h1><p>Checking role fit and current openings.</p></main>
}

function MatchReveal({ mission, roadmap, intel, enhancing, onBack, onStart }: { mission: Mission; roadmap: Roadmap; intel: CompanyIntel; enhancing: boolean; onBack: () => void; onStart: () => void }) {
  const shortFit = roadmap.fitSummary.split(/(?<=[.!?])\s+/)[0]
  return <main className="match-reveal brief-reveal"><div className="match-top"><Brand /><button onClick={onBack}><ArrowLeft size={16} /> Try another match</button></div><section className="brief-hero northstar-stage"><div className="northstar-mark" aria-hidden="true"><i /><i /><i /><span>✦</span></div><motion.div className="match-logo" initial={{ opacity: 0, scale: .35, rotate: -8 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 125, damping: 16, delay: .08 }}><CompanyLogo mission={mission} /></motion.div><motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: .09, delayChildren: .28 } } }}><motion.p className="eyebrow" variants={{ hidden:{opacity:0,y:10},show:{opacity:1,y:0} }}>Your north star</motion.p><motion.h1 variants={{ hidden:{opacity:0,y:22},show:{opacity:1,y:0} }}>{mission.company}</motion.h1><motion.div className="matched-role" variants={{ hidden:{opacity:0,y:10},show:{opacity:1,y:0} }}><Target size={17} /> {roadmap.role}</motion.div><motion.p variants={{ hidden:{opacity:0,y:10},show:{opacity:1,y:0} }}>{shortFit}</motion.p>{enhancing && <motion.small className="plan-enhancing" initial={{opacity:0}} animate={{opacity:1}}><Sparkles size={13}/> Personalizing the deeper roadmap in the background</motion.small>}</motion.div></section><motion.section className="brief-jobs" initial={{opacity:0,y:18}} animate={{opacity:1,y:0}} transition={{delay:.5,duration:.4}}><div><p className="eyebrow">Target profile</p><h2>{roadmap.targetJob?.status === 'sourced' ? 'Grounded in your source.' : 'Clearly marked as inferred.'}</h2></div><div className="brief-job-list">{intel.jobs.length ? intel.jobs.slice(0, 3).map((job) => <a href={job.sourceUrl} target="_blank" rel="noreferrer" key={job.sourceUrl}><span><strong>{job.title}</strong><small>{job.location}</small></span><span><b>{job.totalComp || 'Not published'}</b><ExternalLink size={15} /></span></a>) : <p>No verified opening matched this role today. The roadmap uses an inferred early-career role profile and does not present it as a sourced company requirement.</p>}</div></motion.section><section className="brief-action"><button className="secondary" onClick={onBack}><ArrowLeft size={17} /> Choose another</button><button className="primary" onClick={onStart}>Open roadmap <Target size={18} /></button></section></main>
}

function GithubConnect({ github, setGithub, setProgress, close, notify }: { github: GithubProfile | null; setGithub: (profile: GithubProfile) => void; setProgress: React.Dispatch<React.SetStateAction<ProgressEvent[]>>; close: () => void; notify: (message: string) => void }) {
  const [username, setUsername] = useState(github?.login ?? '')
  const [busy, setBusy] = useState(false)
  async function connect() {
    const clean = username.trim().replace(/^@/,''); if (!clean) return; setBusy(true)
    try {
      const result = isDemoMode ? await new Promise<GithubProfile>((resolve) => window.setTimeout(() => resolve(demoGithub(clean)),650)) : await callFunction<GithubProfile>('github-profile',{username:clean})
      setGithub(result)
      setProgress((events) => [{ id:'github-connect',type:'project_milestone',label:`Connected @${result.login}`,points:50,verified:result.verified,occurredAt:new Date().toISOString() },...(result.recentCommitCount?[{id:'github-commits',type:'github_commit' as const,label:`${result.recentCommitCount} recent commits`,points:Math.min(result.recentCommitCount,5)*10,verified:result.verified,occurredAt:new Date().toISOString()}]:[]),...events.filter((event)=>!['github-connect','github-commits'].includes(event.id))])
      notify(`GitHub connected · +${50+Math.min(result.recentCommitCount,5)*10} XP`); close()
    } catch(error) { notify(error instanceof Error?error.message:'Could not connect GitHub.') } finally { setBusy(false) }
  }
  return <div className="github-modal-backdrop" role="presentation"><motion.section className="github-modal" role="dialog" aria-modal="true" aria-labelledby="github-title" initial={{ opacity:0,scale:.96,y:20 }} animate={{ opacity:1,scale:1,y:0 }}><button className="modal-close" onClick={close} aria-label="Close GitHub connection"><X /></button><Github className="modal-icon" /><p className="eyebrow">Make progress verifiable</p><h2 id="github-title">Connect GitHub</h2><p>Northstar checks public work through a server-held token. The AI sees only a trimmed profile—never your credentials or raw GitHub response.</p><div className="modal-field"><span>github.com/</span><input autoFocus value={username} onChange={(event)=>setUsername(event.target.value)} placeholder="octocat" aria-label="GitHub username" /></div><button className="primary" disabled={!username.trim()||busy} onClick={connect}>{busy?<><LoaderCircle className="spin"/>Checking public work</>:<>Connect and verify <ArrowRight size={18}/></>}</button><button className="skip-link" onClick={close}>I’ll do this later</button></motion.section></div>
}

type SetState<T> = React.Dispatch<React.SetStateAction<T>>
const isStepEvent = (event: ProgressEvent) => !['github-connect', 'github-commits'].includes(event.id)

function MissionControl({ tab, mission, profile, why, motivation, resume, setResume, setPath, setGithub, roadmap, intel, path, records, setRecords, github, progress, setProgress, onEmployer, notify }: { mission: Mission; profile: StudentProfile; why: string; motivation: string; resume: ResumeIntake | null; setResume: SetState<ResumeIntake | null>; setPath: SetState<PathStep[]>; setGithub: (profile: GithubProfile) => void; roadmap: Roadmap; intel: CompanyIntel; path: PathStep[]; records: Record<string, StepRecord>; setRecords: SetState<Record<string, StepRecord>>; github: GithubProfile | null; progress: ProgressEvent[]; setProgress: SetState<ProgressEvent[]>; onEmployer: () => void; notify: (message: string) => void; tab: MissionTab }) {
  const [busyId, setBusyId] = useState<string | null>(null)
  const [showGithub, setShowGithub] = useState(false)
  const [building, setBuilding] = useState(false)
  const [showIntake, setShowIntake] = useState(false)
  const surveyPath = useMemo(() => buildJobGroundedPath(profile, { text: '', skills: profile.skills, experience: [] }, mission, roadmap.role), [profile, mission, roadmap.role])
  const visiblePath = path.length ? path : surveyPath
  const xp = progress.reduce((sum, event) => sum + event.points, 0)
  const level = Math.max(1, Math.floor(xp / 100) + 1)
  const levelNames = ['Curious', 'Committed', 'Builder', 'Proven', 'Mission-ready']
  const verifiedCount = visiblePath.filter((step) => records[step.id]?.status === 'verified').length

  async function buildPath(intake: ResumeIntake) {
    setBuilding(true); setResume(intake)
    let steps = buildJobGroundedPath(profile, intake, mission, roadmap.role)
    if (!isDemoMode) {
      try {
        const result = await callFunction<{ steps: PathStep[] }>('generate-path', {
          profile, resume: intake, role: roadmap.role, why, motivation,
          mission: { id: mission.id, company: mission.company, mission: mission.mission, themes: mission.themes, projectSeeds: mission.projectSeeds }, roadmap, companyResearch: intel,
          github: github ? { topLanguages: github.topLanguages, repositories: github.repositories.map(({ name, description, language }) => ({ name, description, language })) } : null,
        })
        if (result.steps?.length && result.steps.every((step) => step.phase && step.completionMode && step.resources)) steps = result.steps
      } catch { notify('Using the built-in path builder.') }
    } else await new Promise((resolve) => window.setTimeout(resolve, 700))
    setPath(steps); setRecords({}); setProgress((events) => events.filter((event) => !isStepEvent(event))); setShowIntake(false); setBuilding(false)
  }

  async function submitProof(step: PathStep, proof: ProofInput) {
    if (!path.length) setPath(surveyPath)
    setBusyId(step.id)
    let record: StepRecord
    if (step.completionMode === 'self') {
      record = { stepId: step.id, status: 'verified', proof: { kind: 'text', value: 'Self-completed' }, feedback: 'Marked complete.', checks: step.checks.map((criterion) => ({ criterion, met: true, note: 'Self-completed' })), method: 'local', reviewState: 'self-completed', checkedAt: new Date().toISOString() }
      setRecords((current) => ({ ...current, [step.id]: record }))
      setProgress((events) => [{ id: step.id, type: 'course_completed', label: step.title, points: step.points, verified: false, occurredAt: record.checkedAt }, ...events.filter((event) => event.id !== step.id)])
      notify(`Complete · +${step.points} XP`); setBusyId(null); return
    }
    try {
      if (isDemoMode) record = await verifyLocally(step, proof)
      else {
        const result = await callFunction<{ verdict: StepRecord['status']; feedback: string; checks: StepRecord['checks'] }>('verify-proof', {
          step, role: roadmap.role, mission: { company: mission.company, mission: mission.mission },
          proof: { kind: proof.kind, value: proof.value, fileName: proof.fileName, imageData: proof.imageData },
        })
        record = { stepId: step.id, status: result.verdict, feedback: result.feedback, checks: result.checks, method: proof.kind === 'link' && /github\.com/.test(proof.value) ? 'github' : 'ai', checkedAt: new Date().toISOString(), proof: { kind: proof.kind, value: proof.value, fileName: proof.fileName } }
      }
    } catch { notify('The proof checker could not be reached. Try again in a moment.'); setBusyId(null); return }
    setRecords((current) => ({ ...current, [step.id]: record }))
    if (record.status === 'verified') {
      setProgress((events) => [{ id: step.id, type: 'project_milestone', label: step.title, points: step.points, verified: true, occurredAt: record.checkedAt }, ...events.filter((event) => event.id !== step.id)])
      notify(`Verified · +${step.points} XP`)
    }
    setBusyId(null)
  }

  function restart() {
    if (verifiedCount > 0 && !window.confirm('Rebuilding your path clears the proof you have verified so far. Continue?')) return
    setPath([]); setRecords({}); setProgress((events) => events.filter((event) => !isStepEvent(event))); setShowIntake(true)
  }

  return <Page className="mission-control">{showGithub && <GithubConnect github={github} setGithub={setGithub} setProgress={setProgress} close={() => setShowGithub(false)} notify={notify} />}
    <aside className="floating-progress" aria-label="Career progress"><div className="floating-level"><span>Level {level}</span><strong>{levelNames[Math.min(level - 1, 4)]}</strong><small>{xp} XP · {verifiedCount}/{visiblePath.length} steps</small></div><div className="floating-xp" role="progressbar" aria-label="Progress to next level" aria-valuenow={xp % 100} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${xp % 100}%` }} /></div><small>{100 - (xp % 100)} XP to level {level + 1}</small><button onClick={() => setShowGithub(true)}><Github size={14} />{github ? 'View GitHub' : 'Connect GitHub'}</button></aside>
    <DestinationHero mission={mission} role={roadmap.role} />
    {tab === 'roadmap' && <section className="quest-section">
      <div className="roadmap-caption"><p className="eyebrow">Your path to {mission.company}</p><h1>One step closer.</h1><p>Learn, build, practice. Tap a node to see your next move.</p></div>
      {showIntake ? <ResumeIntakeForm mission={mission} role={roadmap.role} busy={building} initial={resume} onSubmit={buildPath} /> : <><PathView steps={visiblePath} projects={roadmap.projects} recruiterSignals={roadmap.recruiterSignals} records={records} busyId={busyId} onSubmit={submitProof} /><div className="path-actions"><button className="secondary" onClick={() => setShowIntake(true)}>Personalize with my resume</button><button className="skip-link path-reset" onClick={restart}>Rebuild my path</button></div></>}
    </section>}
    {tab !== 'roadmap' && <ResearchSection mission={mission} intel={intel} tab={tab} />}
    <section className="employer-cta"><div><Eye /><p className="eyebrow">The other side of the signal</p><h2>See what the employer sees.</h2></div><button className="primary" onClick={onEmployer}>Flip the view <ArrowRight size={18} /></button></section></Page>
}

function CompanySnapshot({ dossier }: { dossier: CompanyDossier }) {
  return <div className="research-block company-snapshot">
    <h3><Building2 /> Company snapshot</h3>
    <dl>{dossier.snapshot.map((row) => <div key={row.label}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}</dl>
    <div className="byu-callout"><strong>BYU connection</strong><p>{dossier.byu.headline}</p><ul>{dossier.byu.points.map((point) => <li key={point}>{point}</li>)}</ul><a href={dossier.byu.sourceUrl} target="_blank" rel="noreferrer">Source <ExternalLink size={13} /></a></div>
  </div>
}

function ResearchSection({ mission, intel: liveIntel, tab }: { mission: Mission; intel: CompanyIntel; tab: 'people' | 'information' | 'feed' }) {
  const dossier = companyDossiers[mission.id]
  const intel = useMemo(() => withDossier(mission.id, liveIntel), [mission.id, liveIntel])
  const uniqueBySource = <T extends { sourceUrl: string }>(items: T[]) =>
    items.filter((item, index) => items.findIndex((candidate) => candidate.sourceUrl === item.sourceUrl) === index)
  const people = uniqueBySource(intel.people)
  const jobs = uniqueBySource(intel.jobs)
  const events = uniqueBySource(intel.events)
  const feed = uniqueBySource(intel.feed)

  const title = tab === 'people' ? `People worth learning from` : tab === 'information' ? `Relevant information for ${mission.company}` : `${mission.company} company feed`
  const intro = tab === 'people' ? 'Find people with a path you can learn from. Match school, major, role, and mission before sending outreach.' : tab === 'information' ? 'Read the role signals, then choose where to show up. Every item is sourced so you can act on it.' : 'Follow the company’s current moves so your projects and outreach stay timely.'
  return <section className="research-section">
    <div className="section-title"><div><p className="eyebrow">Live company signal</p><h2>{title}</h2></div><p>{intel.live ? `Researched ${new Date(intel.researchedAt).toLocaleDateString()}. Every item links to its source.` : intro}</p></div>
    {tab === 'people' && (people.length ? <div className="research-list">{people.map((person) => <a href={person.sourceUrl} target="_blank" rel="noreferrer" key={person.sourceUrl}><span><strong>{person.name}</strong><small>{person.title}</small><p>{person.reason}</p></span><ExternalLink /></a>)}</div> : <ResearchEmpty mission={mission} icon={<UsersRound />} body="Connect live research to surface sourced people by school, major, role, and company proximity." />)}
    {tab === 'information' && <>{dossier && <CompanySnapshot dossier={dossier} />}{jobs.length ? <div className="research-block"><h3><BriefcaseBusiness /> Relevant open roles</h3><div className="research-list">{jobs.map((job) => <a href={job.sourceUrl} target="_blank" rel="noreferrer" key={job.sourceUrl}><span><strong>{job.title}</strong><small>{job.location}</small><p>{job.summary}</p></span><ExternalLink /></a>)}</div></div> : <ResearchEmpty mission={mission} icon={<BriefcaseBusiness />} body="Connect live research to pull current job descriptions and turn their recurring skills into roadmap steps." />}{events.length ? <div className="research-block"><h3><Radar /> Where to show up</h3><div className="research-list">{events.map((event) => <a href={event.sourceUrl} target="_blank" rel="noreferrer" key={event.sourceUrl}><time>{event.date}</time><span><strong>{event.title}</strong><p>{event.location}</p></span><ExternalLink /></a>)}</div></div> : <ResearchEmpty mission={mission} icon={<Radar />} body="Upcoming meetups, campus events, and professional gatherings will appear here when sourced." />}</>}
    {tab === 'feed' && (feed.length ? <div className="research-list">{feed.map((item) => <a href={item.sourceUrl} target="_blank" rel="noreferrer" key={item.sourceUrl}><time>{item.date}</time><span><strong>{item.title}</strong><p>{item.summary}</p></span><ExternalLink /></a>)}</div> : <ResearchEmpty mission={mission} icon={<Newspaper />} body="Connect live research to follow sourced company news, launches, and hiring-relevant updates." />)}
    <p className="source-note">Sources are external and can change. Confirm role availability before applying.</p>
  </section>
}

function ResearchEmpty({ mission, icon, body }: { mission: Mission; icon: React.ReactNode; body: string }) {
  return <div className="research-empty">{icon}<div><strong>Research for {mission.company} is ready to turn on.</strong><p>{body}</p></div></div>
}

function EmployerView({ profile, mission, roadmap, why, motivation, resume, github, progress, path, records, onBack }: { profile: StudentProfile; mission: Mission; roadmap: Roadmap; why: string; motivation: string; resume: ResumeIntake|null; github: GithubProfile|null; progress: ProgressEvent[]; path: PathStep[]; records: Record<string, StepRecord>; onBack:()=>void }) {
  const verifiedSteps=path.filter((step)=>records[step.id]?.status==='verified')
  const completed=verifiedSteps.length
  void progress
  const fallback: MissionAlignment={score:Math.min(94,68+Math.min(completed,3)*6+(github?6:0)),headline:`Building credible proof for ${mission.company}`,summary:roadmap.fitSummary,strengths:roadmap.fitReasons.slice(0,3).map((reason)=>({title:reason.signal,evidence:reason.explanation})),nextStep:path.find((step)=>!records[step.id])?.title??'Start a conversation with the team',generatedBy:'curated'}
  const [alignment,setAlignment]=useState<MissionAlignment>(fallback)
  const [analyzing,setAnalyzing]=useState(!isDemoMode)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(()=>{let active=true;if(isDemoMode)return;setAnalyzing(true);callFunction<MissionAlignment>('analyze-mission-alignment',{profile,mission,why,motivation,roadmap,resume:resume?{skills:resume.skills,experience:resume.experience}:null,github:github?{login:github.login,bio:github.bio,topLanguages:github.topLanguages,repositories:github.repositories.slice(0,6)}:null,verifiedWork:verifiedSteps.map((step)=>({title:step.title,summary:step.summary,feedback:records[step.id]?.feedback}))}).then((result)=>{if(active)setAlignment(result)}).catch(()=>{if(active)setAlignment(fallback)}).finally(()=>{if(active)setAnalyzing(false)});return()=>{active=false}},[])
  const activeSteps=path.filter((step)=>records[step.id]?.status!=='verified').slice(0,3)
  const candidateName=profile.name||github?.name||'Candidate profile'
  return <main className="employer-view"><nav><Brand/><button className="back-to-student" onClick={onBack}><ArrowLeft size={17}/> Back to student view</button></nav><motion.div className="employer-dashboard" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{duration:.35}}><header className="employer-titlebar"><div><p className="eyebrow">Candidate intelligence · {mission.company}</p><h1>{candidateName}</h1><p>{profile.university} · {profile.major} · Aspiring {roadmap.role}</p></div><div className="employer-company"><CompanyLogo mission={mission}/><span><small>Aligned company</small><strong>{mission.company}</strong></span></div></header><div className="employer-layout"><section className="candidate-main"><div className="dashboard-section mission-analysis"><div className="section-heading"><div><p className="eyebrow">OpenAI mission analysis</p><h2>{alignment.headline}</h2></div><div className="score-ring" style={{'--score':`${alignment.score*3.6}deg`} as React.CSSProperties}><span><strong>{alignment.score}</strong><small>/ 100</small></span></div></div><p className="analysis-summary">{alignment.summary}</p>{analyzing&&<p className="analysis-loading"><LoaderCircle className="spin" size={15}/> Generating a fresh alignment analysis…</p>}<div className="alignment-strengths">{alignment.strengths.map((strength,index)=><article key={strength.title}><span>0{index+1}</span><div><strong>{strength.title}</strong><p>{strength.evidence}</p></div></article>)}</div><p className="ai-label"><Sparkles size={14}/>{alignment.generatedBy==='ai'?'Generated from the candidate’s evidence with OpenAI':'Preview analysis — connect OpenAI for a live assessment'}</p></div><div className="dashboard-section"><div className="section-heading compact"><div><p className="eyebrow">Candidate motivation</p><h2>Why {mission.company}</h2></div></div><blockquote className="candidate-statement">“{why}”</blockquote></div><div className="dashboard-section"><div className="section-heading compact"><div><p className="eyebrow">Current work</p><h2>What {candidateName.split(' ')[0]} is doing now</h2></div><span className="section-count">{completed}/{path.length} verified</span></div><div className="work-list">{verifiedSteps.slice(0,3).map((step)=><article key={step.id}><span className="work-status verified"><ShieldCheck size={17}/></span><div><small>Verified work</small><strong>{step.title}</strong><p>{records[step.id]?.feedback||step.summary}</p></div></article>)}{activeSteps.map((step,index)=><article key={step.id}><span className="work-status"><Activity size={17}/></span><div><small>{index===0?'In progress':'Up next'}</small><strong>{step.title}</strong><p>{step.summary}</p></div></article>)}</div></div></section><aside className="candidate-sidebar"><section><p className="eyebrow">Contact</p><h3>Candidate details</h3><div className="contact-list">{profile.email?<a href={`mailto:${profile.email}`}><Mail size={17}/><span><small>Email</small>{profile.email}</span></a>:<div><Mail size={17}/><span><small>Email</small>Not provided</span></div>}{profile.linkedinUrl?<a href={profile.linkedinUrl} target="_blank" rel="noreferrer"><Linkedin size={17}/><span><small>LinkedIn</small>View profile</span><ExternalLink size={14}/></a>:<div><Linkedin size={17}/><span><small>LinkedIn</small>Not provided</span></div>}{github?<a href={github.profileUrl} target="_blank" rel="noreferrer"><Github size={17}/><span><small>GitHub</small>@{github.login}</span><ExternalLink size={14}/></a>:<div><Github size={17}/><span><small>GitHub</small>Not connected</span></div>}</div></section><section><p className="eyebrow">Evidence snapshot</p><h3>Proof of progress</h3><dl className="evidence-stats"><div><dt>Verified steps</dt><dd>{completed}</dd></div><div><dt>Recent commits</dt><dd>{github?.recentCommitCount??0}</dd></div><div><dt>Public repos</dt><dd>{github?.publicRepos??0}</dd></div><div><dt>Skills</dt><dd>{new Set([...profile.skills,...(resume?.skills??[])]).size}</dd></div></dl></section><section><p className="eyebrow">Recommended next step</p><h3>{alignment.nextStep}</h3><p className="sidebar-copy">The strongest next signal this candidate can create for {mission.company}.</p></section>{github?.repositories?.length?<section><p className="eyebrow">Recent GitHub work</p><div className="repo-list">{github.repositories.slice(0,3).map((repo)=><a href={repo.url} target="_blank" rel="noreferrer" key={repo.url}><FolderGit2 size={16}/><span><strong>{repo.name}</strong><small>{repo.language||'Repository'} · {repo.stars} stars</small></span></a>)}</div></section>:null}</aside></div></motion.div></main>
}
