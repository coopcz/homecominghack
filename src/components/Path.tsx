import { useEffect, useRef, useState } from 'react'
import { AlertCircle, ArrowRight, BookOpen, Brain, Check, Code2, ExternalLink, FileText, Layers3, Link2, LoaderCircle, Lock, MessageCircleQuestion, Play, Plus, RefreshCw, Type, Upload, X } from 'lucide-react'
import { buildIntake, detectSkills, extractFileText } from '../lib/resume'
import type { ProofInput } from '../lib/path'
import type { Mission, PathStep, ProofKind, ResumeIntake, RoadmapProject, StepRecord } from '../lib/types'

export function ResumeIntakeForm({ mission, role, busy, initial, onSubmit }: { mission: Mission; role: string; busy: boolean; initial: ResumeIntake | null; onSubmit: (intake: ResumeIntake) => void }) {
  const [text, setText] = useState(initial?.text ?? '')
  const [fileName, setFileName] = useState(initial?.fileName)
  const [skills, setSkills] = useState<string[]>(initial?.skills ?? [])
  const [custom, setCustom] = useState('')
  const [reading, setReading] = useState(false)
  const [error, setError] = useState('')
  const input = useRef<HTMLInputElement>(null)

  function changeText(value: string) {
    setText(value)
    const detected = detectSkills(value)
    setSkills((current) => [...new Set([...current, ...detected])])
  }
  async function pick(file?: File) {
    if (!file) return
    setReading(true); setError('')
    try {
      const extracted = (await extractFileText(file)).trim()
      if (extracted.length < 40) throw new Error('We could not read any text in that file. Paste your resume instead.')
      setFileName(file.name); changeText(extracted)
    } catch (problem) { setError(problem instanceof Error ? problem.message : 'Could not read that file.') } finally { setReading(false); if (input.current) input.current.value = '' }
  }
  function addSkill() {
    const value = custom.trim()
    if (value && !skills.some((skill) => skill.toLowerCase() === value.toLowerCase())) setSkills([...skills, value])
    setCustom('')
  }
  const ready = (text.trim().length >= 40 || skills.length > 0) && !reading

  return <section className="intake">
    <p className="eyebrow">Step 1 · Your starting point</p>
    <h2>Show us what you can already do.</h2>
    <p className="intake-lead">We build your {mission.company} path around your resume, so you skip what you know and start where it counts.</p>
    <div className="intake-grid">
      <div className="intake-card">
        <label className="upload-zone" htmlFor="resume-file">
          {reading ? <LoaderCircle className="spin" /> : <Upload />}
          <strong>{fileName ?? 'Upload your resume'}</strong>
          <span>PDF, Word or text</span>
          <input ref={input} id="resume-file" type="file" accept=".pdf,.docx,.txt,.md,application/pdf" onChange={(event) => pick(event.target.files?.[0])} />
        </label>
        <label className="field-label" htmlFor="resume-text">Or paste it</label>
        <textarea id="resume-text" rows={7} value={text} onChange={(event) => { setFileName(undefined); changeText(event.target.value) }} placeholder="Education, projects, work experience, anything you've built…" />
        {error && <p className="form-error" role="alert"><AlertCircle size={15} /> {error}</p>}
      </div>
      <div className="intake-card">
        <span className="field-label">Skills we found <small>(edit freely)</small></span>
        <div className="skill-chips">
          {skills.length === 0 && <p className="muted-small">Nothing yet. Add your skills below.</p>}
          {skills.map((skill) => <button key={skill} onClick={() => setSkills(skills.filter((item) => item !== skill))} aria-label={`Remove ${skill}`}>{skill}<X size={13} /></button>)}
        </div>
        <div className="skill-add">
          <input value={custom} onChange={(event) => setCustom(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addSkill() } }} placeholder="Add a skill, e.g. Figma" aria-label="Add a skill" />
          <button onClick={addSkill} disabled={!custom.trim()} aria-label="Add skill"><Plus size={17} /></button>
        </div>
        <p className="muted-small">Target role: <strong>{role}</strong></p>
      </div>
    </div>
    <button className="primary" disabled={!ready || busy} onClick={() => onSubmit(buildIntake(text, fileName, skills))}>{busy ? <><LoaderCircle className="spin" /> Building your path</> : <>Build my path <ArrowRight size={18} /></>}</button>
  </section>
}

const kindMeta: Record<ProofKind, { label: string; icon: typeof Link2 }> = { link: { label: 'Link', icon: Link2 }, file: { label: 'Upload', icon: FileText }, text: { label: 'Write', icon: Type } }

function ProofForm({ step, busy, previous, onSubmit }: { step: PathStep; busy: boolean; previous?: StepRecord; onSubmit: (proof: ProofInput) => void }) {
  const [kind, setKind] = useState<ProofKind>(previous?.proof.kind && step.proofKinds.includes(previous.proof.kind) ? previous.proof.kind : step.proofKinds[0])
  const [link, setLink] = useState(previous?.proof.kind === 'link' ? previous.proof.value : '')
  const [text, setText] = useState(previous?.proof.kind === 'text' ? previous.proof.value : '')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [reading, setReading] = useState(false)

  async function submit() {
    setError('')
    if (kind === 'link') return onSubmit({ kind, value: link.trim() })
    if (kind === 'text') return onSubmit({ kind, value: text.trim() })
    if (!file) return
    setReading(true)
    try {
      if (file.type.startsWith('image/')) {
        if (file.size > 4 * 1024 * 1024) throw new Error('Images must be under 4 MB.')
        const imageData = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('Could not read that image.')); reader.readAsDataURL(file) })
        onSubmit({ kind, value: '', fileName: file.name, mime: file.type, imageData })
      } else onSubmit({ kind, value: (await extractFileText(file)).slice(0, 14000), fileName: file.name, mime: file.type })
    } catch (problem) { setError(problem instanceof Error ? problem.message : 'Could not read that file.') } finally { setReading(false) }
  }
  const can = kind === 'link' ? link.trim().length > 8 : kind === 'text' ? text.trim().length > 20 : Boolean(file)
  return <div className="proof-form">
    {step.proofKinds.length > 1 && <div className="proof-tabs" role="tablist">{step.proofKinds.map((option) => { const Icon = kindMeta[option].icon; return <button key={option} role="tab" aria-selected={kind === option} className={kind === option ? 'on' : ''} onClick={() => setKind(option)}><Icon size={15} />{kindMeta[option].label}</button> })}</div>}
    {kind === 'link' && <input type="url" inputMode="url" value={link} onChange={(event) => setLink(event.target.value)} placeholder="https://…" aria-label="Proof link" />}
    {kind === 'text' && <textarea rows={6} value={text} onChange={(event) => setText(event.target.value)} placeholder="Write it here…" aria-label="Proof text" />}
    {kind === 'file' && <label className="file-pick"><Upload size={18} /><span>{file ? file.name : 'Choose a file (PDF, Word, text or image)'}</span><input type="file" accept=".pdf,.docx,.txt,.md,image/png,image/jpeg,image/webp,image/gif" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label>}
    {error && <p className="form-error" role="alert"><AlertCircle size={15} /> {error}</p>}
    <button className="primary" disabled={!can || busy || reading} onClick={submit}>{busy || reading ? <><LoaderCircle className="spin" /> Checking your proof</> : <>Check my proof <ArrowRight size={18} /></>}</button>
  </div>
}

const methodLabel = { ai: 'Reviewed by AI', github: 'Checked on GitHub', local: 'Basic check' } as const

function stepKind(step: PathStep): NonNullable<PathStep['kind']> {
  if (step.kind) return step.kind
  if (/interview|practice.*story/i.test(step.title)) return 'interview'
  if (/leetcode|hash map|algorithm|sql joins/i.test(step.title)) return 'leetcode'
  if (/learn|foundation|tutorial/i.test(step.title)) return 'lesson'
  if (/read|research|problem statement|teardown|memo/i.test(step.title)) return 'reading'
  return 'project'
}

const nodeMeta = {
  lesson: { label: 'Lesson', icon: Play },
  reading: { label: 'Reading', icon: BookOpen },
  project: { label: 'Project', icon: Layers3 },
  leetcode: { label: 'Coding exercise', icon: Code2 },
  interview: { label: 'Interview practice', icon: Brain },
  networking: { label: 'Connect with people', icon: MessageCircleQuestion },
  reflection: { label: 'Feedback checkpoint', icon: RefreshCw },
}

function StepModal({ step, record, locked, busy, onClose, onSubmit }: { step: PathStep; record?: StepRecord; locked: boolean; busy: boolean; onClose: () => void; onSubmit: (proof: ProofInput) => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const meta = nodeMeta[stepKind(step)]
  const Icon = meta.icon
  const done = record?.status === 'verified'
  const resources = step.resources ?? []
  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { element?.close(); document.body.style.overflow = previousOverflow }
  }, [])
  return <dialog ref={dialog} className="roadmap-dialog" aria-labelledby="node-modal-title" onCancel={onClose} onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <div className="node-modal-content">
      <button autoFocus className="node-modal-close" onClick={onClose} aria-label="Close node"><X size={20} /></button>
      <div className={`node-modal-icon ${stepKind(step)}`}><Icon size={28} /></div>
      <p className="eyebrow">{meta.label} · {step.points} XP</p>
      <h2 id="node-modal-title">{step.title}</h2>
      <p className="node-modal-summary">{step.summary}</p>
      {locked && <p className="node-preview"><Lock size={15} /> Preview this step. Complete the earlier nodes to submit your proof.</p>}
      <h3>Resources for this step</h3>
      {resources.length ? <div className="node-resources">{resources.map((resource) => <a key={resource.url} href={resource.url} target="_blank" rel="noreferrer">{resource.kind === 'video' ? <Play size={19} /> : resource.kind === 'exercise' ? <Code2 size={19} /> : <BookOpen size={19} />}<span><small>{resource.provider} · {resource.skill}</small>{resource.title}</span><ExternalLink size={16} /></a>)}</div> : <p className="resource-empty">No verified resource is attached to this step yet.</p>}
      <h3>Your next actions</h3><ol className="action-list">{step.actions.map((action) => <li key={action}>{action}</li>)}</ol>
      <div className="proof-box"><h4>What to submit</h4><p>{step.proofAsk}</p><ul>{step.checks.map((criterion) => { const check = record?.checks.find((item) => item.criterion === criterion); return <li key={criterion} className={check?.met === false ? 'fail' : ''}><Check size={14} /><span>{criterion}{check?.met === false && check.note && <em> — {check.note}</em>}</span></li> })}</ul></div>
      {record?.status === 'needs_work' && <p className="feedback bad" role="status"><AlertCircle size={16} />{record.feedback}</p>}
      {done && record ? <div className="verified-box"><p className="feedback good"><Check size={16} />{record.feedback}</p><small>{record.reviewState === 'self-completed' ? 'Self-completed' : methodLabel[record.method]} · +{step.points} XP</small></div> : !locked && (step.completionMode === 'self' ? <button className="primary mark-complete" onClick={() => onSubmit({ kind: 'text', value: 'Self-completed' })}>Mark complete <Check size={17}/></button> : <ProofForm step={step} busy={busy} previous={record} onSubmit={onSubmit} />)}
    </div>
  </dialog>
}

export function PathView({ steps, projects = [], records, busyId, onSubmit }: { steps: PathStep[]; projects?: RoadmapProject[]; records: Record<string, StepRecord>; busyId: string | null; onSubmit: (step: PathStep, proof: ProofInput) => void }) {
  const current = steps.findIndex((step) => records[step.id]?.status !== 'verified')
  const [open, setOpen] = useState<string | null>(null)
  const selectedIndex = steps.findIndex((step) => step.id === open)
  const selected = steps[selectedIndex]
  const offsets = [0, -56, -100, -56, 0, 56, 100, 56]
  let lastProject = ''
  return <div className="learning-roadmap">
    <ol className="learning-nodes">{steps.map((step, index) => {
      const done = records[step.id]?.status === 'verified'
      const active = index === current
      const locked = current !== -1 && index > current
      const meta = nodeMeta[stepKind(step)]
      const Icon = meta.icon
      const project = step.projectId ? projects.find((item) => item.id === step.projectId) : undefined
      const header = step.project !== lastProject ? step.project : null
      lastProject = step.project
      return <li key={step.id} className={`learning-stop ${done ? 'done' : ''} ${active ? 'active' : ''} ${locked ? 'locked' : ''}`}>
        {header && <div className="learning-unit"><small>Career path · Section</small><h3>{header}</h3><BookOpen size={25} /></div>}
        <div className="learning-position" style={{ '--node-offset': `${offsets[index % offsets.length]}px` } as React.CSSProperties}>
          {active && <span className="node-start-label">START HERE</span>}
          {project ? <button className="project-milestone" onClick={() => setOpen(step.id)} aria-label={`Project: ${step.title}`} aria-haspopup="dialog"><span className="project-level">{project.preview?.eyebrow ?? project.level}</span><strong>{project.title}</strong><p>{project.outcome ?? project.brief}</p><div className="project-flow">{(project.preview?.flow ?? ['input','system','evidence']).map((item, flowIndex) => <span key={item}>{item}{flowIndex < 2 && <i>→</i>}</span>)}</div><div className="project-chips">{project.tags.map((tag) => <small key={tag}>{tag}</small>)}{project.requirementIds?.map((id) => <small key={id}>Requirement {id.slice(1)}</small>)}</div>{done && <b><Check size={14}/> Evidence complete</b>}</button> : <button className={`learning-orb ${stepKind(step)}`} onClick={() => setOpen(step.id)} aria-label={`${meta.label}: ${step.title}. ${done ? 'Completed' : locked ? 'Preview upcoming step' : 'Start this step'}`} aria-haspopup="dialog">{done ? <Check size={31} strokeWidth={3.5} /> : <Icon size={30} strokeWidth={2.5} />}{locked && <span className="node-lock"><Lock size={12} /></span>}</button>}
          {!project && <span className="learning-node-title">{step.title}</span>}
          <small className="learning-node-kind">{meta.label} · {step.points} XP</small>
        </div>
      </li>
    })}</ol>
    {selected && <StepModal key={selected.id} step={selected} record={records[selected.id]} locked={current !== -1 && selectedIndex > current} busy={busyId === selected.id} onClose={() => setOpen(null)} onSubmit={(proof) => onSubmit(selected, proof)} />}
  </div>
}
