import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { AlertCircle, ArrowRight, Check, ChevronDown, FileText, Link2, LoaderCircle, Lock, Plus, Type, Upload, X } from 'lucide-react'
import { buildIntake, detectSkills, extractFileText } from '../lib/resume'
import type { ProofInput } from '../lib/path'
import type { Mission, PathStep, ProofKind, ResumeIntake, StepRecord } from '../lib/types'

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

export function PathView({ steps, records, busyId, onSubmit }: { steps: PathStep[]; records: Record<string, StepRecord>; busyId: string | null; onSubmit: (step: PathStep, proof: ProofInput) => void }) {
  const current = steps.findIndex((step) => records[step.id]?.status !== 'verified')
  const [open, setOpen] = useState<string | null>(null)
  let lastProject = ''
  return <ol className="path-list">
    {steps.map((step, index) => {
      const record = records[step.id]
      const done = record?.status === 'verified'
      const active = index === current
      const locked = current !== -1 && index > current
      const expanded = active || open === step.id
      const header = step.project !== lastProject ? step.project : null
      lastProject = step.project
      return <li key={step.id} className={`${done ? 'done' : ''} ${active ? 'active' : ''} ${locked ? 'locked' : ''}`}>
        {header && <p className="path-project">{header}</p>}
        <div className="step-card">
          <button className="step-head" disabled={locked || active} onClick={() => setOpen(open === step.id ? null : step.id)} aria-expanded={expanded}>
            <span className="step-dot">{done ? <Check size={16} /> : locked ? <Lock size={13} /> : index + 1}</span>
            <span className="step-title"><strong>{step.title}</strong>{!expanded && <small>{done ? `Verified · +${step.points} XP` : step.summary}</small>}</span>
            {done && <ChevronDown className="chev" size={18} />}
          </button>
          {expanded && <motion.div className="step-body" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
            {!done && <p className="step-summary">{step.summary}</p>}
            {!done && <><h4>Do this</h4><ol className="action-list">{step.actions.map((action) => <li key={action}>{action}</li>)}</ol></>}
            {!done && <div className="proof-box"><h4>Proof to submit</h4><p>{step.proofAsk}</p><ul>{step.checks.map((check, i) => { const met = record?.checks.find((c) => c.criterion === check)?.met; const failed = record && !done && met === false; return <li key={check} className={failed ? 'fail' : ''}>{failed ? <X size={14} /> : <Check size={14} />}<span>{check}{failed && record.checks[i]?.note ? <em> — {record.checks[i].note}</em> : null}</span></li> })}</ul></div>}
            {record?.status === 'needs_work' && <p className="feedback bad" role="status"><AlertCircle size={16} />{record.feedback}</p>}
            {!done && <ProofForm key={step.id + (record?.checkedAt ?? '')} step={step} busy={busyId === step.id} previous={record} onSubmit={(proof) => onSubmit(step, proof)} />}
            {done && record && <div className="verified-box"><p className="feedback good"><Check size={16} />{record.feedback}</p><p className="submitted">Submitted: {record.proof.kind === 'link' ? <a href={record.proof.value} target="_blank" rel="noreferrer">{record.proof.value}</a> : record.proof.fileName ?? `${record.proof.value.slice(0, 120)}…`}</p><small>{methodLabel[record.method]} · +{step.points} XP</small></div>}
          </motion.div>}
        </div>
      </li>
    })}
  </ol>
}
