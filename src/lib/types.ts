export interface StudentProfile {
  id: string
  university: string
  major: string
  skills: string[]
  interests: string[]
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

export type AppStep = 'welcome' | 'onboarding' | 'missions' | 'search' | 'launch' | 'why' | 'connect' | 'dashboard'
