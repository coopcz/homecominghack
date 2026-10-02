import type { Mission, Roadmap, StudentProfile } from './types'

const normalized = (value: string) => value.toLowerCase().replace(/[^a-z0-9 ]/g, '')

export function rankMissions(profile: StudentProfile, allMissions: Mission[]): Mission[] {
  const signals = [...profile.interests, ...profile.skills, ...profile.targetCompanies, profile.major].map(normalized)
  return [...allMissions].sort((a, b) => score(b) - score(a))

  function score(mission: Mission) {
    const corpus = normalized([mission.company, mission.mission, ...mission.themes].join(' '))
    return signals.reduce((total, signal) => {
      if (!signal) return total
      if (normalized(mission.company).includes(signal) || signal.includes(normalized(mission.company))) return total + 12
      const words = signal.split(' ').filter((word) => word.length > 2)
      return total + words.reduce((sum, word) => sum + (corpus.includes(word) ? 2 : 0), 0)
    }, 0)
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
  const skill = profile.skills[0] || (role.includes('Design') ? 'product design' : role.includes('Data') ? 'data analysis' : 'software development')
  const [seedA, seedB, seedC] = mission.projectSeeds

  return {
    missionId: mission.id,
    role,
    generatedBy: 'curated',
    thesis: `Build visible proof that you can use ${skill} to advance ${mission.company}’s mission—grounded in your belief in ${personalThread}.`,
    projects: [
      {
        title: `${mission.company} mission teardown`,
        brief: `Interview 5 potential users, map the current journey around ${seedA}, and publish a sharp product memo with one testable improvement.`,
        proof: 'Public research memo, journey map, interview notes, and a prioritized experiment.',
        weeks: 2,
        tags: ['customer evidence', 'product judgment'],
      },
      {
        title: `${seedB.charAt(0).toUpperCase() + seedB.slice(1)} prototype`,
        brief: `Build a working, mobile-first prototype that uses realistic data to improve ${seedB}. Instrument one outcome that matters to the mission.`,
        proof: 'Deployed demo, GitHub repository, 90-second walkthrough, and measured result.',
        weeks: 3,
        tags: [skill, 'shipped work'],
      },
      {
        title: `${seedC.charAt(0).toUpperCase() + seedC.slice(1)} field experiment`,
        brief: `Partner with one real organization or user, run a small experiment around ${seedC}, and document what changed after feedback.`,
        proof: 'Before/after evidence, decision log, and a concise case study with honest limitations.',
        weeks: 4,
        tags: ['real users', 'measured impact'],
      },
    ],
    credentials: [
      `A portfolio case study tying decisions to ${mission.mission.toLowerCase()}`,
      `A clean public GitHub trail showing weekly progress in ${skill}`,
      'Five customer or domain-expert conversations summarized into actionable insights',
    ],
    courses: [
      { title: 'Build the domain foundation', provider: 'Official industry documentation', outcome: `Create a glossary and system map for ${mission.themes.slice(0, 2).join(' + ')}.` },
      { title: `Applied ${skill}`, provider: 'A project-based university or recognized MOOC course', outcome: 'Ship the second roadmap project as the capstone.' },
      { title: 'Communicating technical work', provider: 'Your university career center', outcome: 'Turn the work into a crisp demo and evidence-led story.' },
    ],
    peopleStrategy: [
      `Find 2 ${role}s at ${mission.company}; ask one specific question about how they measure impact.`,
      `Attend one public ${mission.themes[0]} event and share your prototype with a practitioner—not a generic “can I pick your brain?” message.`,
      `After project two, send a 90-second demo to a ${mission.company} team member and ask for one piece of product criticism.`,
    ],
  }
}
