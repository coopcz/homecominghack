import type { Mission, PathStep, ProofCheck, ProofKind, ResumeIntake, StepRecord, StudentProfile } from './types'

const roleNeeds = (role: string): string[] => {
  if (/data|analyst/i.test(role)) return ['SQL', 'Python', 'Data analysis']
  if (/design/i.test(role)) return ['Figma', 'UX research']
  if (/product manager|growth/i.test(role)) return ['Product management', 'UX research', 'Data analysis']
  return ['TypeScript', 'APIs & backend', 'SQL', 'Git']
}

export function skillGaps(role: string, skills: string[]) {
  const have = new Set(skills.map((skill) => skill.toLowerCase()))
  const needs = roleNeeds(role)
  const gaps = needs.filter((need) => !have.has(need.toLowerCase()) && !(need === 'TypeScript' && have.has('javascript')))
  return { needs, gaps, strengths: needs.filter((need) => !gaps.includes(need)) }
}

export function buildCuratedPath(profile: StudentProfile, intake: ResumeIntake, mission: Mission, role: string): PathStep[] {
  const [seedA, seedB, seedC] = mission.projectSeeds
  const { gaps, strengths } = skillGaps(role, intake.skills)
  const lead = strengths[0] ?? intake.skills[0] ?? profile.major ?? 'your strongest skill'
  const gap = gaps[0]
  const steps: PathStep[] = [
    {
      id: 'p1-problem', project: `1 · Understand the problem`, title: `Write the problem statement for ${seedA}`,
      summary: `Turn "${seedA}" into one specific problem a real person has.`,
      actions: [`Pick one person who struggles with ${seedA} (for example a customer, researcher, student or operator).`, 'Write what they are trying to do, what gets in the way, and what it costs them.', 'Add two sentences on why you personally care about this problem.'],
      proofAsk: 'Paste your problem statement (80+ words).', proofKinds: ['text'], points: 20,
      checks: ['Names a specific kind of person, not "users"', 'Describes a concrete obstacle and its cost', `Connects to ${mission.company}'s mission`],
    },
    {
      id: 'p1-interviews', project: `1 · Understand the problem`, title: 'Talk to 5 people who have this problem',
      summary: 'Collect real evidence before building anything.',
      actions: ['Message 8 people in your network or a relevant community; aim for 5 conversations of 15 minutes.', 'Ask: "Tell me about the last time this happened", "What did you try?", "What was frustrating?"', 'Write notes straight after each call and highlight the quotes that surprised you.'],
      proofAsk: 'Upload or link your interview notes (names can be anonymised).', proofKinds: ['file', 'link', 'text'], points: 30,
      checks: ['Shows 5 separate conversations', 'Includes direct quotes or specific stories', 'States at least one thing that surprised you'],
    },
    {
      id: 'p1-memo', project: `1 · Understand the problem`, title: 'Publish a one-page teardown',
      summary: 'Turn the interviews into a clear point of view you can show people.',
      actions: ['Summarise the problem, the evidence, and the top 3 patterns you saw.', 'Propose one improvement that you could test in a few weeks.', 'Publish it somewhere public (GitHub README, Notion, Google Doc with link access).'],
      proofAsk: 'Link to the published teardown.', proofKinds: ['link'], points: 30,
      checks: ['Publicly readable', 'Cites evidence from the interviews', 'Ends with one testable improvement'],
    },
  ]
  if (gap) steps.push({
    id: 'p2-gap', project: `2 · Build a working prototype`, title: `Learn ${gap} by building a tiny version`,
    summary: `${role} work at ${mission.company} needs ${gap}, and your resume doesn't show it yet.`,
    actions: [`Pick a short, current ${gap} tutorial or official guide and follow it for one evening.`, `Rebuild the core of it using data or content from your teardown instead of the tutorial's.`, 'Commit it to a public GitHub repo with a README that says what you learned.'],
    proofAsk: 'Link to the GitHub repo.', proofKinds: ['link'], minCommits: 2, points: 30,
    checks: [`Repo shows real ${gap} work`, 'README explains what you built and learned', 'At least 2 commits'],
  })
  steps.push(
    {
      id: 'p2-spec', project: `2 · Build a working prototype`, title: `Define the smallest useful version of ${seedB}`,
      summary: `Decide what to build and how you will know it worked, using ${lead}.`,
      actions: ['List the single job your prototype must do for the person in your teardown.', 'Cut everything else. Write 3 features at most.', 'Pick one number that proves it works (time saved, errors avoided, tasks completed).'],
      proofAsk: 'Paste your one-page spec (60+ words) or link to it.', proofKinds: ['text', 'link'], points: 20,
      checks: ['One clear job for one clear user', 'Three or fewer features', 'A measurable success number'],
    },
    {
      id: 'p2-build', project: `2 · Build a working prototype`, title: 'Build the first working version',
      summary: 'Ship something real in a public repo, with realistic data.',
      actions: [`Build the core flow with ${lead}; use public or realistic sample data, never private data.`, 'Commit small and often so the history shows how you worked.', 'Make it work on a phone screen.'],
      proofAsk: 'Link to the GitHub repository.', proofKinds: ['link'], minCommits: 5, points: 40,
      checks: ['Public repo with working code', 'At least 5 commits over time', 'README with setup steps and a screenshot'],
    },
    {
      id: 'p2-demo', project: `2 · Build a working prototype`, title: 'Deploy it and record a 90-second demo',
      summary: 'Make it something anyone can open and understand in a minute and a half.',
      actions: ['Deploy to Vercel, Netlify, GitHub Pages or similar.', 'Record a 90-second screen recording: problem, demo, result.', 'Put both links at the top of your README.'],
      proofAsk: 'Link to the live demo.', proofKinds: ['link'], points: 30,
      checks: ['Live URL loads', 'Demonstrates the core flow', 'Demo video linked'],
    },
    {
      id: 'p3-users', project: `3 · Test it in the real world`, title: `Put it in front of 3 real users in ${seedC}`,
      summary: 'Watch real people use it and write down what happens.',
      actions: ['Find 3 people close to the problem, not friends being polite.', 'Give them one task and watch without helping.', 'Record what worked, what confused them, and your success number for each.'],
      proofAsk: 'Upload a photo/screenshot of your notes or paste a summary (80+ words).', proofKinds: ['file', 'text'], points: 30,
      checks: ['Three separate sessions', 'Observed behaviour, not just opinions', 'Success number recorded'],
    },
    {
      id: 'p3-iterate', project: `3 · Test it in the real world`, title: 'Ship one change based on what you saw',
      summary: 'Show you can learn from users and improve the product.',
      actions: ['Pick the biggest problem from your user sessions.', 'Fix it and commit with a message that references the feedback.', 'Retest with at least one of the same users.'],
      proofAsk: 'Link to the GitHub repository (or commit) with the change.', proofKinds: ['link'], minCommits: 6, points: 30,
      checks: ['New commit that addresses user feedback', 'Retest result noted'],
    },
    {
      id: 'p3-case', project: `3 · Test it in the real world`, title: `Write the case study you would send to ${mission.company}`,
      summary: 'Package everything into one story a hiring manager can read in 3 minutes.',
      actions: ['Structure: problem, evidence, what you built, results, what you would do next.', 'Include the demo, repo and teardown links.', `Add why ${mission.company}'s mission matters to you.`],
      proofAsk: 'Link to the published case study.', proofKinds: ['link'], points: 40,
      checks: ['Covers problem, evidence, build, results, next steps', 'Links to demo and repo', 'Honest about limitations'],
    },
  )
  const guides: Record<string, { label: string; url: string }> = {
    TypeScript: { label: 'TypeScript Handbook', url: 'https://www.typescriptlang.org/docs/handbook/intro.html' },
    'APIs & backend': { label: 'MDN: HTTP overview', url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Overview' },
    SQL: { label: 'PostgreSQL SQL tutorial', url: 'https://www.postgresql.org/docs/current/tutorial-sql.html' },
    Git: { label: 'Git: getting started', url: 'https://git-scm.com/book/en/v2/Getting-Started-About-Version-Control' },
    Python: { label: 'The Python tutorial', url: 'https://docs.python.org/3/tutorial/' },
  }
  const learning: PathStep[] = gaps.map((skill, index) => ({
    id: `learn-${index}`, kind: 'lesson', project: 'Foundations · Learn the tools',
    title: `Learn ${skill}`, summary: `Build the ${skill} foundation for ${role} work.`,
    actions: [`Follow a ${skill} lesson and write down the core concepts.`, `Build a small example connected to ${seedA}.`, 'Explain what you built, what failed, and what you learned.'],
    resources: [
      { label: `${skill} tutorials on YouTube`, url: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${skill} beginner tutorial`)}`, kind: 'video' },
      ...(guides[skill] ? [{ ...guides[skill], kind: 'reading' as const }] : []),
    ],
    proofAsk: 'Write a learning reflection with the example you built (80+ words).', proofKinds: ['text'], points: 20,
    checks: [`Explains core ${skill} concepts`, 'Describes a working example', 'Identifies one limitation or lesson'],
  }))
  const technical = /engineer|data|analyst/i.test(role)
  const practice: PathStep[] = technical ? [{
    id: 'practice-patterns', kind: 'leetcode', project: 'Practice · Problem solving', title: /data|analyst/i.test(role) ? 'Practice SQL joins' : 'Practice arrays and hash maps',
    summary: 'Solve one focused exercise, then explain your approach and tradeoffs.',
    resources: [{ label: /data|analyst/i.test(role) ? 'LeetCode: Combine Two Tables' : 'LeetCode: Two Sum', url: /data|analyst/i.test(role) ? 'https://leetcode.com/problems/combine-two-tables/' : 'https://leetcode.com/problems/two-sum/', kind: 'exercise' }],
    actions: ['Attempt the exercise before opening a solution.', 'Explain your approach, complexity, and edge cases.', 'Retry it without notes the next day.'], proofAsk: 'Paste your solution and explain your reasoning (80+ words).', proofKinds: ['text'], points: 25,
    checks: ['Includes a solution', 'Explains the approach and tradeoffs', 'Discusses edge cases'],
  }] : []
  const interview: PathStep = {
    id: 'practice-interview', kind: 'interview', project: 'Interview · Tell your story', title: 'Practice your project interview',
    summary: `Explain why your work prepares you to contribute at ${mission.company}.`,
    actions: ['Answer: What problem did you choose and why?', 'Explain one technical or design decision and an alternative you rejected.', 'Describe the result, a limitation, and what you would improve next.'],
    proofAsk: 'Write your interview answers (120+ words).', proofKinds: ['text'], points: 30,
    checks: ['Describes the problem and evidence', 'Explains a decision and tradeoff', 'Connects the outcome to the target company'],
  }
  return [...learning, ...steps.slice(0, 3), ...practice, ...steps.slice(3), interview]
}

export const totalStepPoints = (steps: PathStep[]) => steps.reduce((sum, step) => sum + step.points, 0)

/** Index of the first step that is not yet verified. */
export const currentStepIndex = (steps: PathStep[], records: Record<string, StepRecord>) => {
  const index = steps.findIndex((step) => records[step.id]?.status !== 'verified')
  return index === -1 ? steps.length : index
}

export interface ProofInput { kind: ProofKind; value: string; fileName?: string; mime?: string; imageData?: string }

const wordCount = (value: string) => value.trim().split(/\s+/).filter(Boolean).length

async function githubRepoCheck(url: URL, minCommits: number): Promise<{ ok: boolean; note: string }> {
  const [owner, repo] = url.pathname.split('/').filter(Boolean)
  if (!owner || !repo) return { ok: false, note: 'Link to a specific repository, not a profile page.' }
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo.replace(/\.git$/, '')}/commits?per_page=30`, { headers: { Accept: 'application/vnd.github+json' } })
  if (response.status === 404) return { ok: false, note: 'That repository is private or does not exist. Make it public.' }
  if (!response.ok) return { ok: true, note: 'GitHub could not be reached to count commits; repository link accepted.' }
  const commits = (await response.json()) as unknown[]
  return commits.length >= minCommits
    ? { ok: true, note: `Public repository with ${commits.length}${commits.length === 30 ? '+' : ''} commits.` }
    : { ok: false, note: `Only ${commits.length} commit${commits.length === 1 ? '' : 's'} found; this step needs at least ${minCommits}.` }
}

/** Fallback used when the AI checker is not configured. It is a basic check and is labelled as such. */
export async function verifyLocally(step: PathStep, proof: ProofInput): Promise<StepRecord> {
  const base = { stepId: step.id, proof: { kind: proof.kind, value: proof.value, fileName: proof.fileName }, checkedAt: new Date().toISOString() }
  const miss = (feedback: string, method: StepRecord['method'] = 'local'): StepRecord => ({ ...base, status: 'needs_work', feedback, method, checks: step.checks.map((criterion) => ({ criterion, met: false, note: '' })) })
  const pass = (feedback: string, method: StepRecord['method'], note: string): StepRecord => ({ ...base, status: 'verified', feedback, method, checks: step.checks.map((criterion): ProofCheck => ({ criterion, met: true, note })) })

  if (proof.kind === 'link') {
    let url: URL
    try { url = new URL(proof.value.trim()) } catch { return miss('That does not look like a link. Paste the full URL starting with https://') }
    if (url.protocol !== 'https:') return miss('Use a public https:// link.')
    if (url.hostname === 'github.com' && step.minCommits) {
      try {
        const result = await githubRepoCheck(url, step.minCommits)
        return result.ok ? pass(result.note, 'github', result.note) : miss(result.note, 'github')
      } catch { return miss('Could not reach GitHub. Check your connection and try again.', 'github') }
    }
    if (step.minCommits) return miss('This step needs a public GitHub repository link.')
    return pass('Link format is valid. Basic check only: the AI content review is not enabled in this demo.', 'local', 'Not reviewed')
  }
  if (proof.kind === 'file') {
    if (!proof.fileName) return miss('Choose a file to upload.')
    const text = proof.value
    if (text && wordCount(text) < 40) return miss('That file is too short to be convincing. Add more detail.')
    return pass('File received. Basic check only: the AI content review is not enabled in this demo.', 'local', 'Not reviewed')
  }
  const words = wordCount(proof.value)
  const needed = step.proofAsk.match(/(\d+)\+? words/)?.[1] ? Number(step.proofAsk.match(/(\d+)\+? words/)![1]) : 40
  if (words < needed) return miss(`Add more detail: ${words} of ${needed} words so far.`)
  if (new Set(proof.value.toLowerCase().split(/\s+/)).size / words < 0.4) return miss('This looks repetitive. Write it in your own words.')
  return pass('Length and format look right. Basic check only: the AI content review is not enabled in this demo.', 'local', 'Not reviewed')
}
