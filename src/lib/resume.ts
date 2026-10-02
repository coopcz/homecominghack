import type { ResumeIntake } from './types'

export const MAX_RESUME_CHARS = 12000

const skillCatalog: Record<string, RegExp> = {
  TypeScript: /\btypescript\b/i, JavaScript: /\bjavascript\b|\bnode(\.js)?\b/i, React: /\breact(\.js)?\b|\bnext\.?js\b/i,
  Python: /\bpython\b/i, Java: /\bjava\b(?!script)/i, 'C++': /c\+\+/i, SQL: /\bsql\b|\bpostgres(ql)?\b|\bmysql\b/i,
  'Machine learning': /machine learning|\bpytorch\b|\btensorflow\b|\bscikit/i, 'Data analysis': /data analy|\bpandas\b|\btableau\b|\bexcel\b|\bstatistic/i,
  'APIs & backend': /\brest\b|\bapi\b|\bbackend\b|\bflask\b|\bdjango\b|\bexpress\b/i, Figma: /\bfigma\b/i,
  'UX research': /user research|usability|\bux\b|interview/i, 'Product management': /product manage|roadmap|\bprd\b|stakeholder/i,
  Git: /\bgit(hub)?\b/i, Swift: /\bswift\b|\bios\b/i, Robotics: /robot|\bros\b|arduino|embedded/i,
  Writing: /\bwriting\b|copywrit|content strategy/i, Marketing: /marketing|\bseo\b|growth/i,
}

export function detectSkills(text: string): string[] {
  return Object.entries(skillCatalog).filter(([, pattern]) => pattern.test(text)).map(([skill]) => skill)
}

export function detectExperience(text: string): string[] {
  return text.split(/\n+/).map((line) => line.replace(/^[\s•\-*·▪●]+/, '').trim())
    .filter((line) => line.length > 25 && line.length < 220 && /\b(built|led|shipped|designed|developed|created|launched|analy[sz]ed|intern|project|research|founded)\b/i.test(line))
    .slice(0, 6)
}

export function buildIntake(text: string, fileName: string | undefined, skills: string[]): ResumeIntake {
  const clean = text.replace(/\s+\n/g, '\n').trim().slice(0, MAX_RESUME_CHARS)
  return { text: clean, fileName, skills, experience: detectExperience(clean) }
}

export async function extractFileText(file: File): Promise<string> {
  const name = file.name.toLowerCase()
  if (file.size > 8 * 1024 * 1024) throw new Error('That file is over 8 MB. Try a smaller export.')
  if (name.endsWith('.pdf') || file.type === 'application/pdf') {
    const pdfjs = await import('pdfjs-dist')
    const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default
    const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
    const pages: string[] = []
    for (let number = 1; number <= Math.min(pdf.numPages, 6); number++) {
      const content = await (await pdf.getPage(number)).getTextContent()
      pages.push(content.items.map((item) => ('str' in item ? item.str + (item.hasEOL ? '\n' : ' ') : '')).join(''))
    }
    return pages.join('\n')
  }
  if (name.endsWith('.docx')) {
    const mammoth = await import('mammoth/mammoth.browser')
    return (await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value
  }
  if (/\.(txt|md|rtf)$/.test(name) || file.type.startsWith('text/')) return file.text()
  throw new Error('Upload a PDF, Word (.docx) or text file.')
}
