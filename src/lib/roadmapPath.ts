import type { Mission, PathStep, ResumeIntake, StudentProfile } from './types'

const resourcesFor = (role: string, mission: Mission) => {
  const context = `${role} ${mission.themes.join(' ')}`
  if (/health|claim|data engineer|analyst/i.test(context)) return [
    { title: 'CMS Blue Button 2.0 API documentation', provider: 'Centers for Medicare & Medicaid Services', url: 'https://bluebutton.cms.gov/developers/', skill: 'Healthcare data', kind: 'reading' as const },
    { title: 'PostgreSQL tutorial: window functions', provider: 'PostgreSQL', url: 'https://www.postgresql.org/docs/current/tutorial-window.html', skill: 'SQL', kind: 'reading' as const },
    { title: 'Pandas group by: split-apply-combine', provider: 'pandas', url: 'https://pandas.pydata.org/docs/user_guide/groupby.html', skill: 'Python', kind: 'reading' as const },
  ]
  if (/robot|autonom|perception/i.test(context)) return [
    { title: 'ROS 2 Tutorials', provider: 'Open Robotics', url: 'https://docs.ros.org/en/jazzy/Tutorials.html', skill: 'ROS 2', kind: 'reading' as const },
    { title: 'A* Search Algorithm', provider: 'Red Blob Games', url: 'https://www.redblobgames.com/pathfinding/a-star/introduction.html', skill: 'Path planning', kind: 'reading' as const },
    { title: 'Kalman Filter in one dimension', provider: 'KalmanFilter.net', url: 'https://www.kalmanfilter.net/kalman1d.html', skill: 'Sensor fusion', kind: 'reading' as const },
  ]
  if (/flight|space|aerospace|embedded/i.test(context)) return [
    { title: 'Core Flight System documentation', provider: 'NASA', url: 'https://cfs-documents.github.io/', skill: 'Flight software', kind: 'reading' as const },
    { title: 'Protocol Buffers overview', provider: 'Google for Developers', url: 'https://protobuf.dev/overview/', skill: 'Telemetry schemas', kind: 'reading' as const },
    { title: 'State Machine Design in C', provider: 'Barr Group', url: 'https://barrgroup.com/blog/how-code-state-machine-c-or-c', skill: 'State machines', kind: 'reading' as const },
  ]
  return [
    { title: 'GitHub Actions quickstart', provider: 'GitHub Docs', url: 'https://docs.github.com/en/actions/writing-workflows/quickstart', skill: 'CI', kind: 'reading' as const },
    { title: 'Docker workshop', provider: 'Docker Docs', url: 'https://docs.docker.com/get-started/workshop/', skill: 'Containers', kind: 'reading' as const },
    { title: 'SQL joins', provider: 'SQLBolt', url: 'https://sqlbolt.com/lesson/select_queries_with_joins', skill: 'SQL', kind: 'exercise' as const },
  ]
}

export function buildJobGroundedPath(profile: StudentProfile, intake: ResumeIntake, mission: Mission, role: string): PathStep[] {
  const resources = resourcesFor(role, mission)
  const actualSkills = intake.skills.filter((skill) => !/computer science|^cs$|major/i.test(skill))
  const lead = actualSkills[0] ?? (/data|analyst/i.test(role) ? 'Python and SQL' : 'software engineering')
  const context = `${role} ${mission.themes.join(' ')}`
  const names = /health|claim|data engineer|analyst/i.test(context)
    ? ['Claims Quality Pipeline', 'Denial Intelligence System', 'Revenue Cycle Simulation']
    : /robot|autonom|perception/i.test(context)
      ? ['Sensor Fusion Sandbox', 'Perception-to-Planning System', 'Autonomy Evaluation Lab']
      : /flight|space|aerospace|embedded/i.test(context)
        ? ['Flight Telemetry Decoder', 'Fault-Tolerant Command System', 'Mission Control Simulation']
        : [`${mission.projectSeeds[0]} Signal Explorer`, `${mission.projectSeeds[1]} Operating System`, `${mission.projectSeeds[2]} Evaluation Lab`]
  return [
    { id: 'foundation-role', project: 'Foundations', phase: 'Foundations', kind: 'reading', title: `Map the ${role} evidence`, summary: 'Translate the target into a short, honest evidence checklist.', resources: resources.slice(0, 2), actions: ['Read the linked primary documentation.', 'Write the three strongest role requirements.', 'Mark which are already demonstrated and which need proof.'], proofAsk: 'Mark complete when you have reviewed the resources.', proofKinds: ['text'], checks: ['Reviewed the role evidence'], points: 15, completionMode: 'self', requirementIds: ['r1', 'r2', 'r3'] },
    { id: 'foundation-skill', project: 'Foundations', phase: 'Foundations', kind: 'lesson', title: `Prepare the ${lead} foundation`, summary: `Use a specific guide to establish the foundation the projects need.`, resources: resources.slice(1), actions: ['Work through the relevant sections.', 'Keep one small runnable example.', 'Write down one failure mode you now understand.'], proofAsk: 'Mark complete when the example runs.', proofKinds: ['text'], checks: ['Completed the exact resource'], points: 15, completionMode: 'self', requirementIds: ['r1'] },
    { id: 'project-1', project: 'Build', phase: 'Build', projectId: 'project-1', kind: 'project', title: names[0], summary: `Create a focused first build using ${lead}, realistic data, and explicit quality checks.`, resources, actions: ['Define the input and output contract.', 'Implement the smallest end-to-end path.', 'Add tests for three malformed or missing inputs.'], proofAsk: 'Submit the public repository or artifact link.', proofKinds: ['link'], checks: ['Runs from a clean setup', 'Includes at least three edge cases', 'README shows sample output and maps it to the role'], minCommits: 5, points: 40, completionMode: 'evidence', requirementIds: ['r1'] },
    { id: 'expert-feedback', project: 'Learn from practitioners', phase: 'Expert feedback', kind: 'networking', title: `Ask a ${role} to challenge your first build`, summary: 'Use a concrete artifact to start a useful conversation and turn practitioner feedback into a design decision.', resources: [], actions: [`Find a ${role} or domain practitioner through your university alumni directory, a relevant professional community, or a sourced company profile.`, `Share the README or 90-second walkthrough of ${names[0]} and name the assumption you are least sure about.`, 'Ask: “Which failure case would make this least credible in real work, and what would you test next?”', 'Record the answer, decide what to change, and send a short follow-up showing what you incorporated.'], proofAsk: 'Submit an anonymized outreach message, the feedback received, and the exact change you will make (100+ words total).', proofKinds: ['text', 'file'], checks: ['Outreach shares a useful artifact instead of asking generically for time', 'Question is specific to a project decision', 'Response or attempted outreach is documented', 'Names a concrete change or a reasoned decision not to change'], points: 35, completionMode: 'evidence', requirementIds: ['r2', 'r3'] },
    { id: 'project-2', project: 'Scale', phase: 'Scale', projectId: 'project-2', kind: 'project', title: names[1], summary: 'Design the deeper system: state, interfaces, failures, observability, and tradeoffs.', resources, actions: ['Draw the system boundary and data flow.', 'Implement the core service and failure handling.', 'Add observable metrics and a repeatable test harness.'], proofAsk: 'Submit the repository and architecture note.', proofKinds: ['link'], checks: ['Documents interfaces and failure states', 'Includes repeatable integration tests', 'Reports at least two operational metrics'], minCommits: 8, points: 50, completionMode: 'evidence', requirementIds: ['r1', 'r2'] },
    { id: 'project-3', project: 'Scale', phase: 'Scale', projectId: 'project-3', kind: 'project', title: names[2], summary: 'Turn the work into an ambitious, reproducible evaluation with measurable results.', resources, actions: ['Generate a scenario suite with normal and adversarial cases.', 'Compare at least two approaches or configurations.', 'Publish results, limitations, and a concise demo.'], proofAsk: 'Submit artifact links and the acceptance report.', proofKinds: ['link', 'text'], checks: ['Uses reproducible scenarios', 'Compares explicit metrics', 'Explains limitations and maps evidence to all requirements'], minCommits: 10, points: 60, completionMode: 'evidence', requirementIds: ['r1', 'r2', 'r3'] },
    { id: 'plan-review', project: 'Review and adapt', phase: 'Review', kind: 'reflection', title: 'Choose the strongest evidence and revise the plan', summary: 'Use what you learned from the builds and outside feedback to decide what deserves another iteration.', resources: [], actions: ['Compare each artifact against the target requirements.', 'Name the strongest signal and the weakest unsupported claim.', 'Choose one project to deepen, replace, or stop and explain why.', 'Write the next measurable experiment based on your evidence.'], proofAsk: 'Submit your evidence review and revised next move (150+ words).', proofKinds: ['text'], checks: ['References concrete project evidence', 'Identifies a real weakness or unsupported claim', 'Makes a reasoned keep, change, or stop decision', 'Defines a measurable next experiment'], points: 30, completionMode: 'evidence', requirementIds: ['r1', 'r2', 'r3'] },
    { id: 'interview-story', project: 'Interview / Application', phase: 'Interview / Application', kind: 'interview', title: 'Defend the flagship in an interview', summary: 'Turn the technical evidence into a clear problem, decision, result, and limitation story.', resources: [], actions: ['Explain the problem without company jargon.', 'Defend one tradeoff and an alternative you rejected.', 'State a result, limitation, and next experiment.'], proofAsk: 'Write your interview answer (120+ words).', proofKinds: ['text'], checks: ['Explains a concrete decision', 'Uses measured evidence', 'Names a limitation without hand-waving'], points: 25, completionMode: 'evidence', requirementIds: ['r2', 'r3'] },
  ]
}
