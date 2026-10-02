import type { CompanyIntel } from './types'

// Researched 2026-10-02 from public sources (company career pages, press releases, BYU Marriott, Built In).
// Only facts found in those sources are recorded. Roles marked `status: 'closed'` were removed from the board
// but are kept because they show the entry-level bar the company has hired against.

export interface CompanyJob {
  title: string
  location: string
  team: string
  level: 'intern' | 'entry' | 'mid' | 'senior' | 'leadership'
  status: 'open' | 'closed'
  summary: string
  sourceUrl: string
  stack?: string[]
}

export interface CompanyPerson {
  name: string
  title: string
  reason: string
  sourceUrl: string
  byu?: boolean
}

export interface CompanyDossier {
  missionId: string
  researchedAt: string
  snapshot: Array<{ label: string; value: string }>
  byu: { headline: string; points: string[]; sourceUrl: string }
  jobs: CompanyJob[]
  people: CompanyPerson[]
  feed: Array<{ title: string; summary: string; date: string; sourceUrl: string }>
  eventsAndPipelines: Array<{ title: string; detail: string; sourceUrl: string }>
}

const researchedAt = '2026-10-02'
const li = (keywords: string) => `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(keywords)}`

export const companyDossiers: Record<string, CompanyDossier> = {
  neighbor: {
    missionId: 'neighbor',
    researchedAt,
    snapshot: [
      { label: 'What it is', value: 'Online marketplace for peer-to-peer and traditional self storage' },
      { label: 'Founded', value: 'March 2017 (originally "Neiybor"); founders Preston Alder, Colton Gardner, Joseph Woodbury' },
      { label: 'Office', value: 'Lehi, UT (all open roles are on-site)' },
      { label: 'Funding', value: 'Reported $75M+ raised; Andreessen Horowitz was its first Utah investment; seed from Album VC and Pelion' },
      { label: 'Engineering stack', value: 'TypeScript, React, Swift, Kotlin, Ruby, Golang, AWS, Kubernetes, Terraform; data on dbt, Dagster, Redshift, Athena, Superset' },
    ],
    byu: {
      headline: 'Neighbor was started by two BYU Marriott grads and was incubated through BYU entrepreneurship programs.',
      points: [
        'CEO Joseph Woodbury: BYU BS in economics (2017). Co-founder Preston Alder: BYU strategy, 2017.',
        'Won $15,000 in the Miller New Venture Competition run by the BYU Rollins Center for Entrepreneurship & Technology; founders credit BYU professors and alumni as early mentors and customers.',
        'Hires interns in Lehi, 25 minutes from campus: Software Engineer Intern 2027 is open now.',
      ],
      sourceUrl: 'https://marriott.byu.edu/stories/alumni-spotlight/unexpected-entrepreneurs',
    },
    jobs: [
      { title: 'Software Engineer Intern 2027', location: 'Lehi, UT', team: 'Engineering', level: 'intern', status: 'open', summary: 'In-office 12-week internship; strong coding ability or a software-related degree, with possible full-time conversion within 12 months. The earlier cohort listing named TypeScript, React, Swift, Kotlin, Ruby, Golang, AWS, Kubernetes, Terraform.', sourceUrl: 'https://jobs.lever.co/neighbor/7d66629f-3f4b-41ee-a324-fe0154e13c46', stack: ['TypeScript', 'React', 'Swift', 'Kotlin', 'Golang', 'AWS'] },
      { title: 'Software Engineer', location: 'Lehi, UT', team: 'Engineering', level: 'mid', status: 'open', summary: 'General software engineering role on the marketplace product.', sourceUrl: 'https://jobs.lever.co/neighbor/3c27afec-628f-4305-9519-9b525035e3f0' },
      { title: 'Senior Software Engineer', location: 'Lehi, UT', team: 'Engineering', level: 'senior', status: 'open', summary: 'Senior engineering role; third-party boards list a $115K to $151.6K/yr range.', sourceUrl: 'https://jobs.lever.co/neighbor/2c5542bf-90a1-4d22-93df-5c989b2da4f7' },
      { title: 'Software Engineer, Data', location: 'Lehi, UT', team: 'Finance & Data', level: 'senior', status: 'open', summary: 'Build pipelines and a semantic layer. Wants 5+ years as an engineer (3+ in data) and expert SQL.', sourceUrl: 'https://jobs.lever.co/neighbor/282d287f-4564-4fbd-a394-7df9301235b6', stack: ['dbt', 'Dagster', 'Redshift', 'Athena', 'Superset', 'SQL'] },
      { title: 'Data Science Internship (current PhD), Summer 2027', location: 'Lehi, UT', team: 'Finance & Data', level: 'intern', status: 'open', summary: 'Summer 2027 data science internship for current PhD students.', sourceUrl: 'https://jobs.lever.co/neighbor/b5f73774-1d5a-4edc-a184-d1734731cd9c' },
      { title: 'Product Manager (Mid-Senior)', location: 'Lehi, UT', team: 'Product & Design', level: 'mid', status: 'open', summary: 'Product management for the marketplace.', sourceUrl: 'https://jobs.lever.co/neighbor/aa8a58c7-9a82-4127-b060-28d168bcd3fc' },
      { title: 'Trust & Safety Specialist', location: 'Lehi, UT', team: 'Customer Experience', level: 'entry', status: 'open', summary: 'Keeps the marketplace trustworthy; relevant to trust-scoring projects.', sourceUrl: 'https://jobs.lever.co/neighbor/c134acae-0b8d-4197-886c-5e9d4ff53a17' },
      { title: 'Sales Development Representative', location: 'Lehi, UT', team: 'Sales', level: 'entry', status: 'open', summary: 'Typical entry point for non-engineering grads.', sourceUrl: 'https://jobs.lever.co/neighbor/9063c828-e4f9-46eb-850f-3a0d33282bd5' },
      { title: 'Marketing Operations Intern (part time)', location: 'Lehi, UT', team: 'Marketing', level: 'intern', status: 'open', summary: 'Part-time internship; good for students still in classes.', sourceUrl: 'https://jobs.lever.co/neighbor/303c50a4-5f32-4d4c-86fc-2baeb9d9a3ac' },
      { title: 'Host Success Agent', location: 'Lehi, UT', team: 'Marketing', level: 'entry', status: 'open', summary: 'Supports hosts who list space on the marketplace.', sourceUrl: 'https://jobs.lever.co/neighbor/15a42f32-fb39-4a26-8bc7-4ced3b96adec' },
      { title: 'Head of Local Growth', location: 'Lehi, UT', team: 'Marketing', level: 'leadership', status: 'open', summary: 'Leadership role.', sourceUrl: 'https://jobs.lever.co/neighbor/1ed392c8-1233-4978-a08e-e380e2a016ba' },
      { title: 'Head of Partnerships', location: 'Lehi, UT', team: 'Marketing', level: 'leadership', status: 'open', summary: 'Leadership role.', sourceUrl: 'https://jobs.lever.co/neighbor/10926f1a-2cdf-403e-8a80-ea48acbf63cc' },
      { title: 'Performance Creative Lead', location: 'Lehi, UT', team: 'Marketing', level: 'senior', status: 'open', summary: 'Paid creative lead.', sourceUrl: 'https://jobs.lever.co/neighbor/d0206094-46e7-4a2f-992a-7de354194dea' },
    ],
    people: [
      { name: 'Joseph Woodbury', title: 'Co-founder and CEO', reason: 'BYU economics grad (2017) who joined while taking a strategy minor class. The clearest BYU-to-Neighbor path.', sourceUrl: 'https://marriott.byu.edu/stories/alumni-spotlight/unexpected-entrepreneurs', byu: true },
      { name: 'Preston Alder', title: 'Co-founder', reason: 'BYU strategy grad (2017). Started Neighbor after struggling to afford storage for a Peru internship.', sourceUrl: 'https://marriott.byu.edu/stories/alumni-spotlight/unexpected-entrepreneurs', byu: true },
      { name: 'Colton Gardner', title: 'Co-founder', reason: 'University of Utah grad (2016); the product and engineering side of the founding trio.', sourceUrl: 'https://en.wikipedia.org/wiki/Neighbor_(company)' },
      { name: 'Find BYU alumni engineers at Neighbor', title: 'LinkedIn search', reason: 'Recent-hire and junior engineer profiles are not publicly indexed. This search shows BYU people currently at Neighbor to message.', sourceUrl: li('Neighbor Lehi software engineer Brigham Young University'), byu: true },
    ],
    feed: [
      { title: 'Neighbor raises $53M Series B', summary: 'Series B in 2021 following the Andreessen Horowitz-led Series A.', date: '2021', sourceUrl: 'https://www.techbuzznews.com/neighbor-raises-53-million-series-b/' },
      { title: 'Data Engineer role posted', summary: 'Data Engineer opening in Lehi, posted Feb 10, 2026 per job boards.', date: '2026-02-10', sourceUrl: 'https://jobs.fifthwall.com/companies/neighbor/jobs/67307611-data-engineer' },
      { title: 'How Joseph Woodbury co-founded Neighbor', summary: 'Founder story, including the BYU class that led to joining.', date: '2021-12-02', sourceUrl: 'https://www.utahbusiness.com/entrepreneurship/2021/12/02/how-joseph-woodbury-co-founded-neighbor' },
    ],
    eventsAndPipelines: [
      { title: 'BYU Rollins Center for Entrepreneurship & Technology', detail: 'Neighbor won the Miller New Venture Competition here; a natural place to meet its alumni network.', sourceUrl: 'https://marriott.byu.edu/stories/alumni-spotlight/unexpected-entrepreneurs' },
      { title: 'BYU STEM Career Fair', detail: 'Annual fair where Utah tech employers recruit interns; check the exhibitor list each term.', sourceUrl: 'https://engineering.byu.edu/news/stem-career-fair-at-byu' },
    ],
  },

  redo: {
    missionId: 'redo',
    researchedAt,
    snapshot: [
      { label: 'What it is', value: 'Post-purchase platform: returns, exchanges, order tracking, package protection, fulfillment, support tools, marketing and AI agents' },
      { label: 'Founded', value: '2022, by Tay Brown and Sterling Snow (CEO)' },
      { label: 'Office', value: 'Draper, UT; all roles are full-time and on-site 5 days a week' },
      { label: 'Funding', value: '$81M Series B (June 24, 2026) at a $1.25B valuation, led by Smash Capital with Pelion and Cervin' },
      { label: 'Scale', value: '4,100+ brands, 1,750+ using multiple products; Utah incentive filing projects 682 jobs over 5 years; acquired ReturnBear' },
      { label: 'Stack', value: 'TypeScript, Node.js, React, AWS; data on Snowflake, SQL, PostgreSQL, Amplitude. Shopify and Stripe experience preferred' },
    ],
    byu: {
      headline: 'No public BYU-specific program found, but Redo hires in Utah County\'s backyard and its roles fit BYU CS, IS and Marriott majors.',
      points: [
        'Draper is about 30 minutes from Provo; roles are on-site, so BYU students can commute or relocate easily.',
        'Roles that fit BYU programs: Product Analyst (IS, stats), Growth Marketer, Account Executive and Account Manager (Marriott), Senior Product Designer.',
        'Redo\'s hiring is currently senior-heavy; the Product Analyst, Product Operations and IT Specialist roles are the most accessible entry points.',
        'Redo lists no BYU recruiting events publicly. Ask via BYU Handshake or alumni outreach rather than assuming a pipeline exists.',
      ],
      sourceUrl: 'https://redo.hirehive.com',
    },
    jobs: [
      { title: 'Senior/Staff Software Engineer', location: 'Draper, UT', team: 'Engineering', level: 'senior', status: 'open', summary: 'Full-stack web apps and API integrations. 4+ years; TypeScript, Node, React or AWS preferred; Shopify/Stripe familiarity a plus. Mentors junior engineers.', sourceUrl: 'https://redo.hirehive.com/seniorstaff-software-engineer-draper-E5QiHM', stack: ['TypeScript', 'Node.js', 'React', 'AWS'] },
      { title: 'Senior/Staff Backend Engineer, Security', location: 'Draper, UT', team: 'Engineering', level: 'senior', status: 'open', summary: 'Security-focused backend engineering.', sourceUrl: 'https://redo.hirehive.com/seniorstaff-backend-engineer-security-draper-3vIqKk' },
      { title: 'Senior DevOps Engineer, CI/CD and Developer Infrastructure', location: 'Draper, UT', team: 'Engineering', level: 'senior', status: 'open', summary: 'Owns developer infrastructure and pipelines.', sourceUrl: 'https://redo.hirehive.com/senior-devops-engineer-ci-cd-and-developer-infrastructure-draper-60vm2W' },
      { title: 'Senior Data Engineer', location: 'Draper, UT', team: 'Data', level: 'senior', status: 'open', summary: 'Data platform work on Snowflake, SQL, PostgreSQL and Amplitude.', sourceUrl: 'https://redo.hirehive.com/senior-data-engineer-draper-HslvYV', stack: ['Snowflake', 'SQL', 'PostgreSQL', 'Amplitude'] },
      { title: 'Product Analyst', location: 'Draper, UT', team: 'Product', level: 'entry', status: 'open', summary: 'Product analytics role; the best-matched entry point for IS, stats and econ students.', sourceUrl: 'https://redo.hirehive.com/product-analyst-draper-Jr5HUI' },
      { title: 'Product Operations, Reverse Logistics', location: 'Draper, UT', team: 'Product', level: 'entry', status: 'open', summary: 'Operations role tied to the returns and reverse-logistics product.', sourceUrl: 'https://redo.hirehive.com/product-operations-reverse-logistics-draper-cAzqJo' },
      { title: 'Senior Product Designer', location: 'Draper, UT', team: 'Design', level: 'senior', status: 'open', summary: 'Product design for merchant and shopper experiences.', sourceUrl: 'https://redo.hirehive.com/senior-product-designer-draper-9BGsqB' },
      { title: 'Solutions Architect', location: 'Draper, UT', team: 'Solutions', level: 'mid', status: 'open', summary: 'Technical customer-facing role.', sourceUrl: 'https://redo.hirehive.com/solutions-architect-draper-6bin2W' },
      { title: 'GRC Program Manager', location: 'Draper, UT', team: 'Security', level: 'mid', status: 'open', summary: 'Governance, risk and compliance program.', sourceUrl: 'https://redo.hirehive.com/grc-program-manager-draper-3wDHKk' },
      { title: 'IT Specialist', location: 'Draper, UT', team: 'IT', level: 'entry', status: 'open', summary: 'Internal IT support.', sourceUrl: 'https://redo.hirehive.com/it-specialist-draper-c1WxJo' },
      { title: 'Growth Marketer (B2C)', location: 'Draper, UT', team: 'Marketing', level: 'mid', status: 'open', summary: 'Consumer growth marketing.', sourceUrl: 'https://redo.hirehive.com/growth-marketer-b2c-draper-4F19G4' },
      { title: 'Account Executive (Conversions, Marketing Cloud, OMS)', location: 'Draper, UT', team: 'Sales', level: 'mid', status: 'open', summary: 'Sales for the conversion, marketing and order management products.', sourceUrl: 'https://redo.hirehive.com/account-executive-conversions-marketing-cloud-oms-draper-CsDSXe' },
      { title: 'Account Executive (Growth; Reverse Logistics)', location: 'Draper, UT', team: 'Sales', level: 'mid', status: 'open', summary: 'Sales for reverse logistics.', sourceUrl: 'https://redo.hirehive.com/account-executive-growth-reverse-logistics-draper-yOLPd5' },
      { title: 'Account Manager', location: 'Draper, UT', team: 'Customer Success', level: 'mid', status: 'open', summary: 'Manages merchant relationships.', sourceUrl: 'https://redo.hirehive.com/account-manager-draper-hDKT6K' },
      { title: 'Talent Architect', location: 'Draper, UT', team: 'People', level: 'mid', status: 'open', summary: 'Recruiting; the person who would read your outreach.', sourceUrl: 'https://redo.hirehive.com/talent-architect-draper-4K6TG4' },
    ],
    people: [
      { name: 'Sterling Snow', title: 'Co-founder and CEO', reason: 'Leads the company through its Series B and AI push; quoted in funding coverage.', sourceUrl: 'https://www.utahbusiness.com/press-releases/2026/06/24/redo-announces-81-million-series-b-support-commerce-technology-expansion/' },
      { name: 'Tay Brown', title: 'Co-founder', reason: 'Co-founded Redo in 2022.', sourceUrl: 'https://raising.fi/news/redo-series-b-june-2026' },
      { name: 'Aaron Evett', title: 'Chief Commerce Officer', reason: 'Named in the Series B announcement as an executive leading the commerce product.', sourceUrl: 'https://www.utahbusiness.com/press-releases/2026/06/24/redo-announces-81-million-series-b-support-commerce-technology-expansion/' },
      { name: 'Find BYU alumni at Redo', title: 'LinkedIn search', reason: 'Recent-hire and junior engineer profiles are not publicly indexed. This search lists BYU people currently at Redo.', sourceUrl: li('Redo Draper Brigham Young University'), byu: true },
      { name: 'Find Redo engineers', title: 'LinkedIn search', reason: 'Look for engineers at Redo with under 2 years tenure, and ask about the on-site, fast-growth culture.', sourceUrl: li('Redo Draper software engineer'), byu: false },
    ],
    feed: [
      { title: 'Redo raises $81M Series B at a $1.25B valuation', summary: 'Led by Smash Capital with Pelion and Cervin. Funds product, AI and international expansion.', date: '2026-06-24', sourceUrl: 'https://www.utahbusiness.com/press-releases/2026/06/24/redo-announces-81-million-series-b-support-commerce-technology-expansion/' },
      { title: 'Redo reaches unicorn status and acquires ReturnBear', summary: 'ReturnBear adds international returns coverage in 100+ countries.', date: '2026-08-06', sourceUrl: 'https://www.utahbusiness.com/deal-dispatch/2026/08/06/redo-unicorn-status-databento-epitel-domo-aquisition-utah-business/' },
      { title: 'Redo to expand in Salt Lake County, 682 jobs over 5 years', summary: 'Utah economic development filing projects a $3.3M investment and 682 new jobs.', date: 'n/d', sourceUrl: 'https://www.tradeandindustrydev.com/region/utah/news/ut-tech-company-redo-expand-salt-lake-county-34713' },
      { title: 'Redo raises $24M Series A', summary: 'Earlier round that scaled the post-purchase platform.', date: '2024-08-20', sourceUrl: 'https://techbuzznews.com/redo-raises-24-million-series-a/' },
    ],
    eventsAndPipelines: [
      { title: 'Redo careers board (HireHive)', detail: 'All 14 roles live as of Oct 2, 2026; check back, because new postings follow the Series B hiring push.', sourceUrl: 'https://redo.hirehive.com' },
      { title: 'BYU STEM Career Fair', detail: 'Annual fair where Utah tech employers recruit; check the exhibitor list each term.', sourceUrl: 'https://engineering.byu.edu/news/stem-career-fair-at-byu' },
    ],
  },

  waystar: {
    missionId: 'waystar',
    researchedAt,
    snapshot: [
      { label: 'What it is', value: 'Cloud healthcare payments platform used by 450,000+ providers and 750 health systems' },
      { label: 'Public company', value: 'Nasdaq: WAY (IPO 2024); previously acquired by EQT and CPP Investments in 2019' },
      { label: 'Offices', value: 'Lehi, UT and Louisville, KY; the Utah office opened in 2020 with up to 70 planned jobs' },
      { label: 'Leadership', value: 'CEO Matt Hawkins; Amit Khanna joining as Chief Product and Technology Officer (Aug 2026)' },
      { label: 'Stack', value: 'C#/.NET and SQL for application engineering; Waystar also lists a Machine Learning Platform Engineer and Data Scientist in Lehi' },
    ],
    byu: {
      headline: 'Waystar\'s Lehi office is the closest big healthcare-tech engineering team to BYU, and the entry-level bar is 1-3 years.',
      points: [
        'Lehi is about 25 minutes from Provo; roles are in-office.',
        'The Application Engineer role (since removed, Dec 2025) wanted 1-3 years, a bachelor\'s or equivalent, basic programming plus C#/.NET and SQL; a good template for a BYU new-grad profile.',
        'Business Intelligence Analyst and SDET/QA roles in Lehi suit BYU IS, stats and CS grads.',
        'No Waystar-specific BYU career fair was found. Marriott lists a Business in Healthcare career fair; ask the Business Career Center (msbcareerfair@byu.edu) whether Waystar attends.',
      ],
      sourceUrl: 'https://marriott.byu.edu/recruiting/events/career-fairs',
    },
    jobs: [
      { title: 'Sr. Software Engineer I', location: 'Lehi, UT', team: 'Engineering', level: 'senior', status: 'open', summary: 'Design, build, test and deploy scalable software; mentor junior engineers. Posted about a month before Oct 2, 2026.', sourceUrl: 'https://www.builtincolorado.com/job/sr-software-engineer-i/10838760' },
      { title: 'Sr. Software Engineer II', location: 'Lehi, UT', team: 'Engineering', level: 'senior', status: 'open', summary: 'Web and core processing applications; production troubleshooting; SQL schemas and stored procedures.', sourceUrl: 'https://builtin.com/company/waystar/jobs' },
      { title: 'Sr. Specialist Application Engineer', location: 'Lehi, UT', team: 'Engineering', level: 'senior', status: 'open', summary: 'Designs and implements web and process applications; mentors peers.', sourceUrl: 'https://builtin.com/job/sr-specialist-application-engineer/7588384' },
      { title: 'Specialist Application Engineer', location: 'Lehi, UT', team: 'Engineering', level: 'mid', status: 'open', summary: 'Scalable systems, performance optimization and high reliability.', sourceUrl: 'https://builtin.com/job/specialist-application-engineer/3425170' },
      { title: 'Application Engineer (entry level)', location: 'Lehi, UT', team: 'Engineering', level: 'entry', status: 'closed', summary: '1-3 years, bachelor\'s or equivalent. C#/.NET and SQL preferred, with infrastructure basics (servers, networking, load balancers, MQ) and curiosity about AI tools. Removed Dec 18, 2025; similar roles recur.', sourceUrl: 'https://builtin.com/job/application-engineer/6986572', stack: ['C#', '.NET', 'SQL'] },
      { title: 'Software Engineer II, Full Stack', location: 'Lehi, UT', team: 'Engineering', level: 'mid', status: 'open', summary: 'Reported by job aggregators; confirm on the Waystar board.', sourceUrl: 'https://www.devjobsscanner.com/company/waystar/' },
      { title: 'Machine Learning Platform Engineer, Backend Services', location: 'Lehi, UT', team: 'AI/ML', level: 'senior', status: 'open', summary: 'Backend services for ML; relevant to the applied-AI archetype.', sourceUrl: 'https://builtin.com/company/waystar/jobs' },
      { title: 'Data Scientist', location: 'Lehi, UT', team: 'Data', level: 'mid', status: 'open', summary: 'Reported by job aggregators; confirm on the Waystar board.', sourceUrl: 'https://www.devjobsscanner.com/company/waystar/' },
      { title: 'Advanced QA Engineer / SDET', location: 'Lehi, UT', team: 'Quality', level: 'mid', status: 'open', summary: 'QA and test automation in Lehi.', sourceUrl: 'https://nationalmssociety.dejobs.org/advanced-qa-engineer/jobs-in/utah/usa/jobs/waystar/careers' },
      { title: 'Business Intelligence Analyst', location: 'Lehi, UT', team: 'Data', level: 'entry', status: 'open', summary: 'Reported in Lehi listings; suits IS and stats majors.', sourceUrl: 'https://builtin.com/company/waystar/jobs' },
      { title: 'Market Development Representative', location: 'Louisville, KY', team: 'Sales', level: 'entry', status: 'open', summary: 'Explicit entry-level program for recent graduates, starting in client support. Located in Louisville, not Utah.', sourceUrl: 'https://builtin.com/job/market-development-representative/11279997' },
    ],
    people: [
      { name: 'Matt Hawkins', title: 'Chief Executive Officer', reason: 'Led Waystar since its 2017 founding through the EQT acquisition and 2024 IPO; Utah Business named him a CEO of the Year.', sourceUrl: 'https://waystarholdings.gcs-web.com/management/matt-hawkins' },
      { name: 'Amit Khanna', title: 'Chief Product and Technology Officer', reason: 'New technology leader (25+ years, previously led healthcare at Salesforce); shapes the engineering and AI roadmap.', sourceUrl: 'https://finviz.com/news/385511/waystar-expands-executive-leadership-to-accelerate-innovation-and-growth' },
      { name: 'Todd Woods', title: 'Chief Commercial Officer', reason: '24-year Waystar veteran named to lead commercial strategy.', sourceUrl: 'https://finviz.com/news/385511/waystar-expands-executive-leadership-to-accelerate-innovation-and-growth' },
      { name: 'Find BYU alumni at Waystar', title: 'LinkedIn search', reason: 'Recent-hire and junior engineer profiles are not publicly indexed. This search lists BYU people currently at Waystar.', sourceUrl: li('Waystar Lehi Brigham Young University'), byu: true },
      { name: 'Find Waystar Lehi engineers', title: 'LinkedIn search', reason: 'Look for Application Engineers and Software Engineers in Lehi with under 3 years of tenure.', sourceUrl: li('Waystar Lehi application engineer'), byu: false },
    ],
    feed: [
      { title: 'Waystar expands executive leadership', summary: 'Adds Amit Khanna as Chief Product and Technology Officer and elevates Todd Woods to Chief Commercial Officer.', date: '2026-08-26', sourceUrl: 'https://finviz.com/news/385511/waystar-expands-executive-leadership-to-accelerate-innovation-and-growth' },
      { title: 'Waystar appoints Aashima Gupta and Michael Roman to its board', summary: 'Board additions with healthcare AI and operating experience.', date: 'n/d', sourceUrl: 'https://seekingalpha.com/pr/20138087-waystar-appoints-aashima-gupta-and-michael-roman-to-board-of-directors' },
      { title: 'Waystar opens Utah office, up to 70 jobs', summary: 'Operations center in Utah announced in 2020.', date: '2020-08-17', sourceUrl: 'https://www.tradeandindustrydev.com/region/utah/news/ut-waystar-coming-utah-creating-70-new-jobs-16940' },
    ],
    eventsAndPipelines: [
      { title: 'BYU Marriott career fairs', detail: 'Includes a Business in Healthcare fair; ask whether Waystar exhibits.', sourceUrl: 'https://marriott.byu.edu/recruiting/events/career-fairs' },
      { title: 'BYU AIA internships', detail: 'BYU lists software and AI/ML internships in Provo and Lehi; useful adjacent leads near Waystar.', sourceUrl: 'https://aia.byu.edu/internship-job-opportunities' },
    ],
  },
}

const keep = <T extends { sourceUrl: string }>(items: T[]) => items.filter((item, index) => items.findIndex((c) => c.sourceUrl === item.sourceUrl) === index)

/** Layers curated research for Neighbor, Redo and Waystar under whatever the live research function returned. */
export function withDossier(missionId: string, intel: CompanyIntel): CompanyIntel {
  const dossier = companyDossiers[missionId]
  if (!dossier) return intel
  const jobs = dossier.jobs.filter((job) => job.status === 'open' || job.level === 'entry').map((job) => ({
    title: job.status === 'closed' ? `${job.title} (closed, reference)` : job.title,
    location: `${job.location} · ${job.team} · ${job.level}`,
    totalComp: '',
    summary: job.summary,
    sourceUrl: job.sourceUrl,
  }))
  return {
    ...intel,
    people: keep([...intel.people, ...dossier.people]),
    jobs: keep([...intel.jobs, ...jobs]),
    events: keep([...intel.events, ...dossier.eventsAndPipelines.map((e) => ({ title: e.title, date: '', location: e.detail, sourceUrl: e.sourceUrl }))]),
    feed: keep([...intel.feed, ...dossier.feed]),
  }
}
