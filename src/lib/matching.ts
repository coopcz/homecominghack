import type { Mission, Roadmap, StudentProfile } from './types'

const normalized = (value: string) => value.toLowerCase().replace(/[^a-z0-9 ]/g, '')

const conceptAliases: Record<string, string[]> = {
  'artificial intelligence': ['ai', 'alignment', 'machine learning', 'developer tools', 'accelerated computing', 'agents'],
  'humanoid robots': ['robotics', 'simulation', 'manufacturing', 'computer vision', 'autonomy', 'hardware'],
  healthcare: ['healthtech', 'patient', 'care', 'payments', 'biotech'],
  biotech: ['healthtech', 'science', 'research', 'patient', 'biology'],
  'e-commerce': ['ecommerce', 'commerce', 'merchant', 'customer experience', 'payments', 'returns'],
  marketplaces: ['marketplace', 'trust', 'real estate', 'travel', 'commerce'],
  climate: ['sustainable', 'energy', 'manufacturing', 'climate'],
  fintech: ['payments', 'fintech', 'internet economy', 'financial'],
  education: ['learning', 'information', 'knowledge', 'accessibility'],
  space: ['space', 'aerospace', 'simulation', 'manufacturing'],
  design: ['design', 'consumer', 'human', 'experience'],
}

export function rankMissions(profile: StudentProfile, allMissions: Mission[]): Mission[] {
  const rawSignals = [...profile.interests, ...profile.skills, profile.major].map(normalized)
  const signals = rawSignals.flatMap((signal) => [signal, ...(conceptAliases[signal] ?? [])])
  return [...allMissions].sort((a, b) => score(b) - score(a))

  function score(mission: Mission) {
    const corpus = normalized([mission.company, mission.mission, ...mission.themes].join(' '))
    const interestScore = signals.reduce((total, signal) => {
      if (!signal) return total
      const words = signal.split(' ').filter((word) => word.length > 2)
      return total + words.reduce((sum, word) => sum + (corpus.includes(word) ? (signal === rawSignals.find((raw) => raw.includes(word)) ? 4 : 2) : 0), 0)
    }, 0)
    const school = normalized(profile.university)
    const nearby = /byu|brigham young|university of utah|utah state|uvu|westminster/.test(school) ? 'utah'
      : /university of washington|uw seattle|seattle university/.test(school) ? 'seattle'
      : /stanford|berkeley|san jose state/.test(school) ? 'bay area'
      : /harvard|mit|northeastern|boston university/.test(school) ? 'boston'
      : /nyu|columbia|new york university/.test(school) ? 'new york'
      : ''
    const locationScore = nearby && mission.locations?.some((location) => normalized(location).includes(nearby)) ? 7 : 0
    return interestScore + locationScore
  }
}

export function inferRole(profile: StudentProfile, answers: string[], mission: Mission): string {
  const corpus = normalized([profile.major, ...profile.skills, ...answers].join(' '))
  if (/data|stat|analytic|pattern|econom|math/.test(corpus)) return mission.roleArchetypes.find((role) => /data|analyst/i.test(role)) ?? 'Product Data Analyst'
  if (/computer|software|engineer|code|react|typescript|python|ship|system/.test(corpus)) return mission.roleArchetypes.find((role) => /engineer/i.test(role)) ?? 'Product Engineer'
  if (/design|\bux\b|visual|research|behavior/.test(corpus)) return mission.roleArchetypes.find((role) => /design/i.test(role)) ?? 'Product Designer'
  if (/business|market|growth|communicat|idea/.test(corpus)) return mission.roleArchetypes.find((role) => /growth|product manager/i.test(role)) ?? 'Product Manager'
  return mission.roleArchetypes.find((role) => /engineer/i.test(role)) ?? mission.roleArchetypes[0]
}

export function buildCuratedRoadmap(
  profile: StudentProfile,
  mission: Mission,
  role: string,
  why: string,
): Roadmap {
  const personalThread = (why.trim() || `making ${mission.themes[0]} products more useful for real people`).replace(/[.!?]+$/, '')
  const skill = profile.skills.find((value) => !/computer science|^cs$|major/i.test(value)) || (role.includes('Design') ? 'product design' : role.includes('Data') ? 'data analysis' : 'software development')
  const [seedA, seedB, seedC] = mission.projectSeeds
  const isRobotics = /robot|autonom|perception/i.test(`${role} ${mission.themes.join(' ')}`)
  const isFlight = /flight|aerospace|space|embedded/i.test(`${role} ${mission.themes.join(' ')}`)
  const isHealthData = /health|claim|data engineer|analyst/i.test(`${role} ${mission.themes.join(' ')} ${seedA}`)
  const requirements = (isRobotics
    ? [['r1','Python or C++','Build reliable robotics software'],['r2','Perception and planning','Work with sensor inputs and motion decisions'],['r3','Testing','Validate behavior across edge cases']]
    : isFlight
      ? [['r1','C++ or systems programming','Develop safety-conscious flight software'],['r2','Telemetry','Work with real-time state and fault signals'],['r3','Verification','Test deterministic behavior and failure modes']]
      : isHealthData
        ? [['r1','SQL and data modeling','Transform healthcare transaction data'],['r2','Python pipelines','Build observable, reproducible processing'],['r3','Data quality','Detect denials, anomalies, and reconciliation issues']]
        : [['r1',skill,`Apply ${skill} to production-shaped work`],['r2','Systems thinking','Design beyond a single happy path'],['r3','Communication','Explain tradeoffs with measurable evidence']]
  ).map(([id,label,excerpt]) => ({ id, label, excerpt, category: 'skill' as const, source: 'inferred' as const }))
  const concepts = isRobotics
    ? [
      ['Sensor Fusion Sandbox','Build a replayable simulator that combines noisy camera and range observations into a tracked world model.','Tracked objects, confidence changes, and dropped-frame behavior','simulation',['sensor stream','fusion','world model']],
      ['Perception-to-Planning System','Connect detection, occupancy mapping, and path planning with inspectable intermediate states.','A route planner that explains why it reroutes','system',['perception','occupancy grid','A* planner']],
      ['Autonomy Evaluation Lab','Create scenario generation, regression metrics, and failure replay for a small autonomous stack.','A flagship evaluation report across adversarial scenarios','simulation',['scenario suite','autonomy stack','evaluation report']],
    ] : isFlight ? [
      ['Flight Telemetry Decoder','Parse a documented packet format and surface vehicle state, missing frames, and sensor drift.','A deterministic decoder with a live sample-output panel','pipeline',['packet stream','decoder','state timeline']],
      ['Fault-Tolerant Command System','Model command validation, state transitions, retry behavior, and audit logs.','A testable command path with explicit failure handling','system',['command queue','state machine','audit log']],
      ['Mission Control Simulation','Simulate telemetry, faults, operator commands, and post-flight analysis in one reproducible environment.','A flagship mission replay with reliability metrics','simulation',['flight simulator','control service','mission replay']],
    ] : isHealthData ? [
      ['Claims Quality Pipeline','Ingest synthetic claims, validate fields, and produce a denial-ready quality report.','A reproducible pipeline with rejected-row explanations','pipeline',['synthetic claims','validation','quality report']],
      ['Denial Intelligence System','Model claim events, denial categories, recovery actions, and operational metrics.','An explainable work queue with measurable recovery signals','system',['claim events','rules + features','operations view']],
      ['Revenue Cycle Simulation','Generate realistic claim lifecycles and evaluate interventions without using patient data.','A flagship scenario report comparing denial-prevention strategies','simulation',['scenario generator','claims system','strategy report']],
    ] : [
      [`${seedA} Signal Explorer`,`Turn realistic public or synthetic data about ${seedA} into a focused diagnostic tool.`,'A clear baseline and one useful decision','pipeline',['sample data','analysis','decision view']],
      [`${seedB} Operating System`,`Design the deeper services, data model, failure states, and observability behind ${seedB}.`,'A system that remains legible under edge cases','system',['inputs','core service','observability']],
      [`${seedC} Evaluation Lab`,`Build a flagship simulation that compares approaches to ${seedC} against explicit metrics.`,'A defensible case study with repeatable results','simulation',['scenario suite','system','evaluation']],
    ]
  const projects = concepts.map(([title,brief,outcome,kind,flow],index) => ({
    id:`project-${index+1}`, title:title as string, brief:brief as string, proof:'Repository, designed output preview, README, and measured acceptance report.',
    user: `A ${mission.themes[0]} operator or end user who needs a reliable decision, not another demo`,
    problem: `${String(brief)} The current risk is that the decision remains slow, opaque, or untested.`,
    scope: `In scope: one reproducible end-to-end workflow using public or synthetic data, explicit failure handling, and measurable evaluation. Out of scope: production deployment, proprietary ${mission.company} data, and a broad feature suite.`,
    recruiterSignal: `Shows a ${mission.company} reviewer that the candidate can turn an ambiguous ${mission.themes[0]} problem into scoped, testable ${role} work and explain the tradeoffs.`,
    tags:index===0?[skill,'data quality']:[skill,index===1?'system design':'evaluation'], level:(['focused','system','flagship'] as const)[index], outcome:outcome as string,
    requirementIds:index===0?['r1']:index===1?['r1','r2']:['r1','r2','r3'], preview:{kind:kind as 'pipeline'|'system'|'simulation',eyebrow:['Focused first build','Deeper system','Ambitious flagship'][index],metrics:[{label:'Primary signal',value:['Valid rows','Handled states','Scenarios passed'][index]},{label:'Evidence',value:['Quality report','Failure log','Evaluation brief'][index]}],flow:flow as string[]},
    milestones:['Define the smallest credible data and behavior contract','Build the core path plus explicit failure states','Document results, tradeoffs, and a concise demo'],
    deliverables:['Public repository and setup guide','Designed sample-output preview','Short architecture and results brief'],
    acceptanceCriteria:['Runs from a clean setup with synthetic or public data','Shows at least three edge cases and their outcomes','Maps results to the linked job requirements'],
  }))

  return {
    missionId: mission.id,
    role,
    generatedBy: 'curated',
    thesis: `Build visible proof that you can use ${skill} to advance ${mission.company}’s mission—grounded in your belief in ${personalThread}.`,
    fitSummary: `${mission.company} is a credible north star because your interest in ${profile.interests.slice(0, 2).join(' and ') || mission.themes[0]} meets a role where ${profile.major || skill} can produce visible evidence—not just enthusiasm.`,
    fitReasons: [
      { signal: 'Problem alignment', explanation: `You selected ${seedA} as work worth doing even without the title.` },
      { signal: 'Useful starting point', explanation: `${profile.major || skill} maps to the core craft of a ${role}.` },
      { signal: 'Personal conviction', explanation: `Your reason—${personalThread}—gives the work a durable motivation beyond the brand name.` },
    ],
    roleRationale: `${role} is the strongest entry point because it turns your current ${skill} foundation into work on ${mission.projectSeeds.slice(0, 2).join(' and ')}.`,
    version: 2,
    targetJob: { title: role, company: mission.company, retrievedAt: new Date().toISOString(), status: 'inferred' },
    requirements,
    recruiterSignals: requirements.map((requirement) => ({ signal: requirement.label, whyItMatters: requirement.excerpt, evidence: `A project artifact, measured result, and interview explanation demonstrating ${requirement.label.toLowerCase()}.`, source: 'inferred' as const })),
    projects,
    credentials: [
      `A portfolio case study tying decisions to ${mission.mission.toLowerCase()}`,
      `A clean public GitHub trail showing weekly progress in ${skill}`,
      'Five customer or domain-expert conversations summarized into actionable insights',
    ],
    courses: [
      { title: 'CS50x: Introduction to Computer Science', provider: 'Harvard / edX', url: 'https://cs50.harvard.edu/x/', skill: 'Problem solving and implementation', format: 'course' as const, outcome: `Use the relevant problem sets to strengthen the implementation discipline behind ${projects[0].title}.` },
      { title: 'Git and GitHub for Beginners', provider: 'freeCodeCamp.org', url: 'https://www.youtube.com/watch?v=RGOj5yH7evk', skill: 'Version control and project communication', format: 'youtube' as const, outcome: 'Publish a legible commit history and reviewer-ready repository.' },
      { title: 'The Missing Semester of Your CS Education', provider: 'MIT', url: 'https://missing.csail.mit.edu/', skill: 'Developer tooling', format: 'interactive' as const, outcome: 'Create a reproducible workflow, test harness, and concise demo.' },
    ],
    peopleStrategy: [
      `Find 2 ${role}s at ${mission.company}; ask one specific question about how they measure impact.`,
      `Attend one public ${mission.themes[0]} event and share your prototype with a practitioner—not a generic “can I pick your brain?” message.`,
      `After project two, send a 90-second demo to a ${mission.company} team member and ask for one piece of product criticism.`,
    ],
  }
}
