export interface StudentProfile {
  id: string
  name?: string
  email?: string
  linkedinUrl?: string
  university: string
  major: string
  skills: string[]
  interests: string[]
  graduationMonth?: string
  graduationYear?: string
}

export interface MissionAlignment {
  score: number
  headline: string
  summary: string
  strengths: Array<{ title: string; evidence: string }>
  nextStep: string
  generatedBy: 'ai' | 'curated'
}

export interface Mission {
  id: string
  company: string
  domain: string
  mission: string
  founderStory: string
  themes: string[]
  accent: string
  logoUrl: string
  roleArchetypes: string[]
  projectSeeds: string[]
  locations?: string[]
}

export interface RoadmapProject {
  id?: string
  title: string
  brief: string
  proof: string
  weeks?: number
  tags: string[]
  level?: 'focused' | 'system' | 'flagship'
  outcome?: string
  requirementIds?: string[]
  preview?: { kind: 'pipeline' | 'system' | 'simulation'; eyebrow: string; metrics: Array<{ label: string; value: string }>; flow: string[] }
  milestones?: string[]
  deliverables?: string[]
  acceptanceCriteria?: string[]
}

export interface JobRequirement { id: string; label: string; excerpt: string; category: 'skill' | 'experience' | 'responsibility'; source: 'official' | 'inferred' }
export interface JobTarget { title: string; company: string; sourceUrl?: string; retrievedAt: string; status: 'sourced' | 'inferred'; description?: string }
export interface LearningResource { label?: string; title?: string; provider?: string; url: string; skill?: string; kind: 'video' | 'reading' | 'exercise' }

export interface Roadmap {
  missionId: string
  role: string
  thesis: string
  fitSummary: string
  fitReasons: Array<{ signal: string; explanation: string }>
  roleRationale: string
  projects: RoadmapProject[]
  credentials: string[]
  courses: { title: string; provider: string; outcome: string }[]
  peopleStrategy: string[]
  generatedBy: 'ai' | 'curated'
  version?: 2
  targetJob?: JobTarget
  requirements?: JobRequirement[]
}

export interface GithubProfile {
  login: string
  name: string | null
  bio: string | null
  avatarUrl: string
  profileUrl: string
  publicRepos: number
  followers: number
  topLanguages: string[]
  recentCommitCount: number
  repositories: Array<{
    name: string
    description: string | null
    url: string
    stars: number
    language: string | null
    topics: string[]
    pushedAt: string
  }>
  verified: boolean
}

export interface CompanyIntel {
  people: Array<{ name: string; title: string; reason: string; sourceUrl: string }>
  jobs: Array<{ title: string; location: string; totalComp: string; summary: string; sourceUrl: string }>
  events: Array<{ title: string; date: string; location: string; sourceUrl: string }>
  feed: Array<{ title: string; summary: string; date: string; sourceUrl: string }>
  researchedAt: string
  live: boolean
}

export interface ProgressEvent {
  id: string
  type: 'github_commit' | 'course_completed' | 'outreach' | 'project_milestone'
  label: string
  points: number
  verified: boolean
  occurredAt: string
}

export interface CompanyRecommendation {
  missionIds: string[]
  reasons: Record<string, string>
  generatedBy: 'ai' | 'curated'
}

export interface MatchInsight {
  missionId: string
  problem: string
  founderReason: string
  whyYou: string
  sourceUrl: string
}

export type AppStep = 'welcome' | 'interests' | 'profile' | 'motivation' | 'signals' | 'missions' | 'problem' | 'why' | 'confirm' | 'match' | 'mission' | 'employer'

export interface ResumeIntake {
  text: string
  fileName?: string
  skills: string[]
  experience: string[]
}

export type ProofKind = 'link' | 'file' | 'text'

export interface PathStep {
  kind?: 'lesson' | 'project' | 'leetcode' | 'reading' | 'interview' | 'networking' | 'reflection'
  resources?: LearningResource[]
  phase?: string
  requirementIds?: string[]
  completionMode?: 'self' | 'evidence'
  projectId?: string
  id: string
  project: string
  title: string
  summary: string
  actions: string[]
  proofAsk: string
  proofKinds: ProofKind[]
  checks: string[]
  minCommits?: number
  points: number
}

export interface ProofCheck { criterion: string; met: boolean; note: string }

export interface StepRecord {
  stepId: string
  status: 'verified' | 'needs_work'
  proof: { kind: ProofKind; value: string; fileName?: string }
  feedback: string
  checks: ProofCheck[]
  method: 'ai' | 'github' | 'local'
  checkedAt: string
  reviewState?: 'self-completed' | 'reviewed-evidence'
}
