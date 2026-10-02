import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft, ArrowRight, BriefcaseBusiness, Check, Circle,
  ExternalLink, Eye, Github, GraduationCap, Heart, LoaderCircle,
  LockKeyhole, Newspaper, Plus, Radar, Rocket, Sparkles, Target, UsersRound, X,
} from 'lucide-react'
import { fallbackIntel, missions as companyCatalog } from './lib/data'
import { buildCuratedRoadmap, inferRole, rankMissions } from './lib/matching'
import { buildCuratedPath, verifyLocally, type ProofInput } from './lib/path'
import { PathView, ResumeIntakeForm } from './components/Path'
import { callFunction, isDemoMode } from './lib/supabase'
import type { AppStep, CompanyIntel, CompanyRecommendation, GithubProfile, Mission, PathStep, ProgressEvent, ResumeIntake, Roadmap, StepRecord, StudentProfile } from './lib/types'

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
const flow: AppStep[] = ['welcome', 'interests', 'profile', 'motivation', 'missions', 'problem', 'why', 'match', 'mission', 'employer']
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
  const [discovering, setDiscovering] = useState(false)
  const [planBusy, setPlanBusy] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

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

  function go(next: AppStep) { setStep(next); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  function notify(message: string) { setToast(message); window.setTimeout(() => setToast(null), 2800) }

  async function finishMotivation(value: string) {
    setMotivation(value); setDiscovering(true)
    const localRanked = rankMissions({ ...profile, skills: [...profile.skills, value] }, companyCatalog).slice(0, 10)
    let nextRanked = localRanked
    let reasons: Record<string, string> = {}
    if (!isDemoMode) {
      try {
        const result = await callFunction<CompanyRecommendation>('recommend-companies', {
          profile, motivation: value,
          catalog: companyCatalog.map(({ id, company, mission, themes, projectSeeds }) => ({ id, company, mission, themes, projectSeeds })),
        })
        const fromAI = result.missionIds.map((id) => companyCatalog.find((mission) => mission.id === id)).filter((mission): mission is Mission => Boolean(mission))
        nextRanked = [...fromAI, ...localRanked.filter((mission) => !result.missionIds.includes(mission.id))].slice(0, 10)
        reasons = result.reasons
      } catch { notify('Using the relevance model built into the demo.') }
    } else await new Promise((resolve) => window.setTimeout(resolve, 480))
    setRanked(nextRanked); setRecommendationReasons(reasons); setDeckIndex(0); setMatchedIds([]); setDiscovering(false); go('missions')
  }

  function voteMission(save: boolean) {
    const current = ranked[deckIndex]
    const nextMatches = save && !matchedIds.includes(current.id) ? [...matchedIds, current.id] : matchedIds
    if (save) setMatchedIds(nextMatches)
    if (nextMatches.length === 3) { go('problem'); return }
    setDeckIndex((index) => (index + 1) % ranked.length)
  }

  async function finishWhy(value: string) {
    setWhy(value); setPlanBusy(true); setRoadmap(null); setPath([]); setRecords({}); setProgress((events) => events.filter((event) => ['github-connect', 'github-commits'].includes(event.id))); go('match')
    const nextRole = inferRole(profile, [motivation, value], selected)
    setRole(nextRole)
    const curated = buildCuratedRoadmap(profile, selected, nextRole, value)
    let nextIntel = fallbackIntel
    let nextRoadmap = curated
    if (!isDemoMode) {
      try {
        nextIntel = await callFunction<CompanyIntel>('company-intel', { company: selected.company, domain: selected.domain, mission: selected.mission, role: nextRole, profile })
      } catch { notify('Live research is unavailable; the mission plan still works.') }
      try {
        nextRoadmap = await callFunction<Roadmap>('generate-roadmap', { profile, mission: selected, why: value, motivation, chosenProblem: selected.projectSeeds[0], role: nextRole, companyResearch: nextIntel })
      } catch { notify('Using the evidence-led curated plan.') }
    } else await new Promise((resolve) => window.setTimeout(resolve, 850))
    setIntel(nextIntel); setRoadmap(nextRoadmap); setPlanBusy(false)
  }

  const matchedMissions = useMemo(() => matchedIds.map((id) => ranked.find((mission) => mission.id === id)).filter((mission): mission is Mission => Boolean(mission)), [matchedIds, ranked])

  return <div className="app-shell">
    {step !== 'welcome' && <Header step={step} onHome={() => go('welcome')} />}
    <AnimatePresence mode="wait">
      {step === 'welcome' && <Welcome key="welcome" onStart={() => go('interests')} />}
      {step === 'interests' && <InterestsStep key="interests" profile={profile} onComplete={(interests) => { setProfile({ ...profile, interests }); go('profile') }} />}
      {step === 'profile' && <ProfileStep key="profile" profile={profile} onComplete={(major, university) => { setProfile({ ...profile, major, university, skills: [major] }); go('motivation') }} />}
      {step === 'motivation' && <MotivationStep key="motivation" value={motivation} busy={discovering} onComplete={finishMotivation} />}
      {step === 'missions' && <MissionDeck key={`mission-${deckIndex}`} missions={ranked} index={deckIndex} matches={matchedMissions} reason={recommendationReasons[ranked[deckIndex]?.id]} onVote={voteMission} />}
      {step === 'problem' && <ProblemStep key="problem" missions={matchedMissions} onSelect={(mission) => { setSelected(mission); go('why') }} />}
      {step === 'why' && <WhyStep key="why" mission={selected} value={why} onComplete={finishWhy} />}
      {step === 'match' && (planBusy || !roadmap ? <MatchLoading key="loading" mission={selected} /> : <MatchReveal key="match" profile={profile} mission={selected} roadmap={roadmap} onStart={() => go('mission')} />)}
      {step === 'mission' && roadmap && <MissionControl key="mission-control" mission={selected} profile={profile} why={why} motivation={motivation} roadmap={roadmap} intel={intel} resume={resume} setResume={setResume} path={path} setPath={setPath} records={records} setRecords={setRecords} github={github} setGithub={setGithub} progress={progress} setProgress={setProgress} onEmployer={() => go('employer')} notify={notify} />}
      {step === 'employer' && roadmap && <EmployerView key="employer" profile={profile} mission={selected} roadmap={roadmap} why={why} github={github} progress={progress} path={path} records={records} onBack={() => go('mission')} />}
    </AnimatePresence>
    <AnimatePresence>{toast && <motion.div className="toast" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 18 }}>{toast}</motion.div>}</AnimatePresence>
  </div>
}

function Brand() { return <span className="brand"><span className="brand-mark">✦</span> northstar</span> }
function Header({ step, onHome }: { step: AppStep; onHome: () => void }) {
  const index = flow.indexOf(step)
  return <header className="site-header"><button className="brand-button" onClick={onHome}><Brand /></button><div className="journey-progress"><i style={{ width: `${(index / (flow.length - 1)) * 100}%` }} /></div><span className="step-count">{String(index).padStart(2, '0')} / 09</span></header>
}
function Page({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <motion.main className={`page ${className}`} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: .28 }}>{children}</motion.main>
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

function ProfileStep({ profile, onComplete }: { profile: StudentProfile; onComplete: (major: string, university: string) => void }) {
  const [major, setMajor] = useState(profile.major)
  const [university, setUniversity] = useState(profile.university)
  return <Page className="profile-page"><section><p className="eyebrow">02 · Starting point</p><h1>Where are you starting from?</h1><p>This helps us choose a realistic role—not put you in a box.</p></section><form onSubmit={(event) => { event.preventDefault(); onComplete(major.trim(), university.trim()) }}><label><span><BriefcaseBusiness size={18} /> What are you studying, or what do you do?</span><input autoFocus required value={major} onChange={(event) => setMajor(event.target.value)} placeholder="Computer science student, product designer, economics major…" /></label><label><span><GraduationCap size={18} /> What college are you at or did you attend?</span><input required value={university} onChange={(event) => setUniversity(event.target.value)} placeholder="University, bootcamp, or self-taught" /></label><button className="primary" disabled={!major.trim() || !university.trim()} type="submit">Continue <ArrowRight size={18} /></button></form></Page>
}

function MotivationStep({ value, busy, onComplete }: { value: string; busy: boolean; onComplete: (value: string) => void }) {
  const [selected, setSelected] = useState(value)
  return <Page className="motivation-page"><p className="eyebrow">03 · Motivation</p><h1>What excites you most?</h1><div className="answer-list">{motivationOptions.map((option) => <button className={selected === option.label ? 'selected' : ''} onClick={() => setSelected(option.label)} key={option.label}><span><strong>{option.label}</strong><small>{option.detail}</small></span><ArrowRight /></button>)}</div><button className="primary next-button" disabled={!selected || busy} onClick={() => onComplete(selected)}>{busy ? <><LoaderCircle className="spin" /> Finding relevant companies</> : <>Show me relevant missions <Radar size={18} /></>}</button></Page>
}

function MissionDeck({ missions, index, matches, reason, onVote }: { missions: Mission[]; index: number; matches: Mission[]; reason?: string; onVote: (save: boolean) => void }) {
  const mission = missions[index]
  return <Page className="mission-page"><div className="mission-heading"><div><p className="eyebrow">04 · Relevant missions</p><h1>Choose three worth exploring.</h1></div><div className="match-slots">{[0,1,2].map((slot) => <span className={matches[slot] ? 'filled' : ''} key={slot}>{matches[slot] ? <CompanyLogo mission={matches[slot]} /> : slot + 1}</span>)}</div></div><p className="deck-context">Filtered from your interests · {index + 1} of {missions.length}</p><div className="deck-wrap"><motion.article className="mission-card" drag="x" dragConstraints={{ left:0,right:0 }} onDragEnd={(_, info) => Math.abs(info.offset.x) > 90 && onVote(info.offset.x > 0)} initial={{ opacity:0,scale:.96,rotate:1 }} animate={{ opacity:1,scale:1,rotate:0 }} exit={{ opacity:0,x:120 }}><div className="mission-company"><CompanyLogo mission={mission} /><strong>{mission.company}</strong></div><blockquote>“{mission.mission}”</blockquote><div className="mission-foot"><p>{reason || `${mission.themes.slice(0,2).join(' and ')} connect directly to the interests you selected.`}</p><div>{mission.themes.map((theme) => <span key={theme}>{theme}</span>)}</div></div></motion.article></div><div className="deck-actions"><button className="round-button" onClick={() => onVote(false)} aria-label="Skip company"><X /></button><span>{matches.length} / 3 matched</span><button className="round-button save" onClick={() => onVote(true)} aria-label={`Match with ${mission.company}`}><Heart /></button></div></Page>
}

function ProblemStep({ missions, onSelect }: { missions: Mission[]; onSelect: (mission: Mission) => void }) {
  return <Page className="problem-page"><p className="eyebrow">05 · Commitment</p><h1>Which problem would you keep building—even without the title?</h1><div className="problem-list">{missions.map((mission, index) => <button onClick={() => onSelect(mission)} key={mission.id}><span className="problem-index">0{index + 1}</span><CompanyLogo mission={mission} /><span><strong>{mission.projectSeeds[0]}</strong><small>{mission.company} · {mission.mission}</small></span><ArrowRight /></button>)}</div></Page>
}

function WhyStep({ mission, value, onComplete }: { mission: Mission; value: string; onComplete: (value: string) => void }) {
  const [why, setWhy] = useState(value)
  return <Page className="why-page"><div className="why-context"><CompanyLogo mission={mission} /><span><strong>{mission.company}</strong><small>{mission.projectSeeds[0]}</small></span></div><section><div><p className="eyebrow">06 · Conviction</p><h1>Why does this matter to you?</h1><p>Specific beats impressive. Tell us what you have seen, experienced, or cannot stop thinking about.</p></div><div className="why-input"><textarea autoFocus maxLength={900} value={why} onChange={(event) => setWhy(event.target.value)} placeholder="A person, moment, or problem that made this real for you…" /><span>{why.trim().split(/\s+/).filter(Boolean).length} words</span><button className="primary" disabled={why.trim().length < 35} onClick={() => onComplete(why.trim())}>Build my mission brief <Sparkles size={18} /></button></div></section></Page>
}

function MatchLoading({ mission }: { mission: Mission }) {
  return <main className="match-loading"><CompanyLogo mission={mission} /><LoaderCircle className="spin" /><h1>Building your mission brief</h1><p>Connecting your background, motivation, role, and current company signals.</p></main>
}

function MatchReveal({ profile, mission, roadmap, onStart }: { profile: StudentProfile; mission: Mission; roadmap: Roadmap; onStart: () => void }) {
  return <main className="match-reveal"><div className="match-top"><Brand /><span>Mission brief · 01</span></div><section className="match-hero"><motion.div className="match-logo" initial={{ y:160,scale:.6,opacity:0 }} animate={{ y:0,scale:1,opacity:1 }} transition={{ duration:.85,type:'spring',bounce:.22 }}><CompanyLogo mission={mission} /></motion.div><motion.div initial={{ opacity:0,y:18 }} animate={{ opacity:1,y:0 }} transition={{ delay:.55 }}><p className="eyebrow">Your north star</p><h1>{mission.company}</h1><div className="matched-role"><Target size={17} /> {roadmap.role}</div><p className="fit-summary">{roadmap.fitSummary}</p></motion.div></section><section className="fit-analysis"><div className="fit-title"><p className="eyebrow">Why this fit is credible</p><h2>Not a personality match.<br />A path you can prove.</h2></div><div className="fit-reasons">{roadmap.fitReasons.map((reason,index) => <motion.article initial={{ opacity:0,x:20 }} animate={{ opacity:1,x:0 }} transition={{ delay:.72+index*.12 }} key={reason.signal}><span>0{index+1}</span><div><strong>{reason.signal}</strong><p>{reason.explanation}</p></div></motion.article>)}</div></section><section className="role-bridge"><span>Starting point</span><strong>{profile.major}</strong><i /><span>Best bridge</span><strong>{roadmap.role}</strong><p>{roadmap.roleRationale}</p></section><section className="match-action"><p>{roadmap.thesis}</p><button className="primary" onClick={onStart}>Open my mission plan <Rocket size={18} /></button></section></main>
}

function Companion({ level }: { level: number }) {
  return <motion.div className={`companion level-${Math.min(level,5)}`} animate={{ y:[0,-7,0],rotate:[0,-1.5,0,1.5,0] }} transition={{ duration:3.8,repeat:Infinity }}><span className="companion-star">✦</span><div className="companion-face"><i /><i /><span /></div><div className="companion-feet"><i /><i /></div></motion.div>
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

function MissionControl({ mission, profile, why, motivation, roadmap, intel, resume, setResume, path, setPath, records, setRecords, github, setGithub, progress, setProgress, onEmployer, notify }: { mission: Mission; profile: StudentProfile; why: string; motivation: string; roadmap: Roadmap; intel: CompanyIntel; resume: ResumeIntake | null; setResume: SetState<ResumeIntake | null>; path: PathStep[]; setPath: SetState<PathStep[]>; records: Record<string, StepRecord>; setRecords: SetState<Record<string, StepRecord>>; github: GithubProfile | null; setGithub: (profile: GithubProfile) => void; progress: ProgressEvent[]; setProgress: SetState<ProgressEvent[]>; onEmployer: () => void; notify: (message: string) => void }) {
  const [showGithub, setShowGithub] = useState(false)
  const [building, setBuilding] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const xp = progress.reduce((sum, event) => sum + event.points, 0)
  const level = Math.max(1, Math.floor(xp / 100) + 1)
  const levelNames = ['Curious', 'Committed', 'Builder', 'Proven', 'Mission-ready']
  const verifiedCount = path.filter((step) => records[step.id]?.status === 'verified').length

  async function buildPath(intake: ResumeIntake) {
    setBuilding(true); setResume(intake)
    let steps = buildCuratedPath(profile, intake, mission, roadmap.role)
    if (!isDemoMode) {
      try {
        const result = await callFunction<{ steps: PathStep[] }>('generate-path', {
          profile, resume: intake, role: roadmap.role, why, motivation,
          mission: { id: mission.id, company: mission.company, mission: mission.mission, themes: mission.themes, projectSeeds: mission.projectSeeds },
          github: github ? { topLanguages: github.topLanguages, repositories: github.repositories.map(({ name, description, language }) => ({ name, description, language })) } : null,
        })
        if (result.steps?.length) steps = result.steps
      } catch { notify('Using the built-in path builder.') }
    } else await new Promise((resolve) => window.setTimeout(resolve, 700))
    setPath(steps); setRecords({}); setProgress((events) => events.filter((event) => !isStepEvent(event))); setBuilding(false)
  }

  async function submitProof(step: PathStep, proof: ProofInput) {
    setBusyId(step.id)
    let record: StepRecord
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
    setPath([]); setRecords({}); setProgress((events) => events.filter((event) => !isStepEvent(event)))
  }

  return <Page className="mission-control">{showGithub && <GithubConnect github={github} setGithub={setGithub} setProgress={setProgress} close={() => setShowGithub(false)} notify={notify} />}
    <section className="dashboard-head"><div><div className="mission-lockup"><CompanyLogo mission={mission} /><span>{mission.company}<small>{roadmap.role}</small></span></div><h1>{levelNames[Math.min(level - 1, 4)]}</h1><div className="xp-line"><div><i style={{ width: `${xp % 100}%` }} /></div><strong>{xp} XP</strong><span>{100 - (xp % 100)} to level {level + 1}</span></div></div><div className="pet-stage"><Companion level={level} /><span>Level {level}</span></div></section>
    <section className="proof-strip"><div><span>Steps verified</span><strong>{path.length ? `${verifiedCount} / ${path.length}` : '—'}</strong></div><div><span>Public proof</span><strong>{github ? `${github.recentCommitCount} commits` : 'Not connected'}</strong></div><button onClick={() => setShowGithub(true)}><Github size={17} />{github ? 'View GitHub' : 'Connect GitHub'}</button></section>
    <section className="quest-section">
      {path.length === 0 ? <ResumeIntakeForm mission={mission} role={roadmap.role} busy={building} initial={resume} onSubmit={buildPath} /> : <>
        <div className="section-title"><div><p className="eyebrow">Your path</p><h2>Do these in order.</h2></div><p>A step is done only when your proof is checked.</p></div>
        <PathView steps={path} records={records} busyId={busyId} onSubmit={submitProof} />
        <button className="skip-link path-reset" onClick={restart}>Update my resume and rebuild the path</button>
      </>}
    </section>
    <ResearchSection mission={mission} intel={intel} />
    <section className="employer-cta"><div><Eye /><p className="eyebrow">The other side of the signal</p><h2>See what the employer sees.</h2></div><button className="primary" onClick={onEmployer}>Flip the view <ArrowRight size={18} /></button></section></Page>
}

function ResearchSection({ mission, intel }: { mission: Mission; intel: CompanyIntel }) {
  const uniqueBySource = <T extends { sourceUrl: string }>(items: T[]) =>
    items.filter((item, index) => items.findIndex((candidate) => candidate.sourceUrl === item.sourceUrl) === index)
  const people = uniqueBySource(intel.people)
  const jobs = uniqueBySource(intel.jobs)
  const events = uniqueBySource(intel.events)
  const feed = uniqueBySource(intel.feed)

  return <section className="research-section">
    <div className="section-title"><div><p className="eyebrow">Live company signal</p><h2>What’s changing at {mission.company}.</h2></div><p>{intel.live ? `Researched ${new Date(intel.researchedAt).toLocaleDateString()}. Every item links to its source.` : 'Connect the OpenAI key to research current jobs, people, events, and reporting with direct sources.'}</p></div>
    {people.length > 0 && <div className="research-block"><h3><UsersRound /> People worth learning from</h3><div className="research-list">{people.map((person) => <a href={person.sourceUrl} target="_blank" rel="noreferrer" key={person.sourceUrl}><span><strong>{person.name}</strong><small>{person.title}</small><p>{person.reason}</p></span><ExternalLink /></a>)}</div></div>}
    {jobs.length > 0 && <div className="research-block"><h3><BriefcaseBusiness /> Relevant open roles</h3><div className="research-list">{jobs.map((job) => <a href={job.sourceUrl} target="_blank" rel="noreferrer" key={job.sourceUrl}><span><strong>{job.title}</strong><small>{job.location}</small><p>{job.summary}</p></span><ExternalLink /></a>)}</div></div>}
    {events.length > 0 && <div className="research-block"><h3><Radar /> Where to show up</h3><div className="research-list">{events.map((event) => <a href={event.sourceUrl} target="_blank" rel="noreferrer" key={event.sourceUrl}><time>{event.date}</time><span><strong>{event.title}</strong><p>{event.location}</p></span><ExternalLink /></a>)}</div></div>}
    {feed.length > 0 && <div className="research-block"><h3><Newspaper /> Company feed</h3><div className="research-list">{feed.map((item) => <a href={item.sourceUrl} target="_blank" rel="noreferrer" key={item.sourceUrl}><time>{item.date}</time><span><strong>{item.title}</strong><p>{item.summary}</p></span><ExternalLink /></a>)}</div></div>}
    {!intel.live && <div className="research-empty"><Radar /><div><strong>Live research is ready to turn on.</strong><p>Add `OPENAI_API_KEY`, deploy `company-intel`, and this section fills with exact jobs, news articles, people, and future events—not fabricated placeholders.</p></div></div>}
    <p className="source-note">Sources are external and can change. Confirm role availability before applying.</p>
  </section>
}

function EmployerView({ profile, mission, roadmap, why, github, progress, path, records, onBack }: { profile: StudentProfile; mission: Mission; roadmap: Roadmap; why: string; github: GithubProfile|null; progress: ProgressEvent[]; path: PathStep[]; records: Record<string, StepRecord>; onBack:()=>void }) {
  const xp=progress.reduce((sum,event)=>sum+event.points,0);const verifiedSteps=path.filter((step)=>records[step.id]?.status==='verified');const completed=verifiedSteps.length;const shipped=verifiedSteps.some((step)=>step.minCommits);const alignment=Math.min(96,76+Math.min(completed,3)*5+(github?5:0))
  const evidence=[{label:'Mission conviction',state:'Specific',ready:true},{label:'Public projects',state:shipped?'Verified':'In progress',ready:shipped},{label:'GitHub activity',state:github?`${github.recentCommitCount} recent commits`:'Not connected',ready:Boolean(github)},{label:'Verified steps',state:path.length?`${completed} of ${path.length}`:'Not started',ready:completed>0}]
  return <main className="employer-view"><nav><button onClick={onBack}><ArrowLeft size={17}/> Student view</button><span>Employer preview</span></nav><motion.section initial={{opacity:0,rotateY:-7}} animate={{opacity:1,rotateY:0}}><div className="employer-head"><div><p className="eyebrow">Candidate discovered through mission fit</p><h1>{profile.major}</h1><p>{profile.university} · Aspiring {roadmap.role}</p></div><CompanyLogo mission={mission}/></div><div className="candidate-why"><span>Why {mission.company}</span><blockquote>“{why}”</blockquote></div><div className="alignment"><div><span>Mission alignment</span><strong>{alignment}%</strong></div><div><i style={{width:`${alignment}%`}}/></div></div><div className="evidence-grid">{evidence.map((item)=><div key={item.label}><span className={item.ready?'ready':''}>{item.ready?<Check size={14}/>:<Circle size={14}/>}</span><p>{item.label}</p><strong>{item.state}</strong></div>)}</div><div className="candidate-foot"><div><strong>{xp}</strong><span>proof XP</span></div><p>This candidate is deliberately creating evidence for {mission.company}’s mission—not mass applying.</p><LockKeyhole/></div></motion.section></main>
}
