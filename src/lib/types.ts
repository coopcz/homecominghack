export type AccountType = 'student' | 'employer'

export interface StudentProfile {
  id: string
  email: string
  fullName: string
  university: string
  major: string
  skills: string[]
  interests: string[]
  targetCompanies: string[]
  githubUsername?: string
  accountType: AccountType
}

export interface Mission {
  id: string
  slug: string
  company: string
  headline: string
  mission: string
  founderStory: string
  longDescription: string
  location: string
  website: string
  themes: string[]
  accent: string
  imageUrl: string
  roleArchetypes: string[]
  projectSeeds: string[]
}

export interface FitQuestion {
  id: string
  question: string
  eyebrow: string
  options: string[]
}

export interface RoadmapProject {
  title: string
  brief: string
  proof: string
  weeks: number
  tags: string[]
}

export interface Roadmap {
  missionId: string
  role: string
  thesis: string
  projects: RoadmapProject[]
  credentials: string[]
  courses: { title: string; provider: string; outcome: string }[]
  peopleStrategy: string[]
  generatedBy: 'ai' | 'curated'
}

export interface ProgressEvent {
  id: string
  type: 'github_commit' | 'course_completed' | 'outreach' | 'project_milestone'
  label: string
  points: number
  verified: boolean
  occurredAt: string
}

export type AppStep =
  | 'welcome'
  | 'auth'
  | 'onboarding'
  | 'missions'
  | 'questions'
  | 'why'
  | 'roadmap'
  | 'progress'
  | 'employer'

