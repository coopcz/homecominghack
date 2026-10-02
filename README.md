# Northstar

Northstar helps anyone choose a company mission they care about, identify a fitting role, and build visible proof that they belong there. It is not limited to a university, region, or company list.

## Run locally

```bash
npm install
cp .env.example .env
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). With `VITE_DEMO_MODE=true`, the complete experience runs without external keys and saves progress in `localStorage`.

## Current journey

1. One-button home screen.
2. University, major, current skills, and interests.
3. Swipe clean, logo-led mission cards.
4. Search a global company catalog or enter another company.
5. Company-logo launch into the student’s “north star” and inferred role.
6. Personal explanation of why the mission matters.
7. Local resume parsing plus server-validated GitHub connection.
8. A level-based dashboard with role-specific projects, people, future events, and a sourced company feed.

There is no signup. Profile, resume text, selection, dashboard, and progress remain in the user’s browser.

## Connect Supabase functions

Add the project URL and publishable key to `.env`, then set `VITE_DEMO_MODE=false`.

```bash
npx supabase link --project-ref lejzqzqiklkcyppgdapc
cp supabase/functions/.env.example supabase/functions/.env
npx supabase secrets set --env-file supabase/functions/.env
npx supabase functions deploy github-profile
npx supabase functions deploy generate-roadmap
npx supabase functions deploy company-intel
```

`github-profile` implements the privacy boundary:

1. The browser sends only a validated username.
2. The Edge Function calls GitHub using the private `GITHUB_TOKEN`.
3. Raw GitHub responses stay server-side.
4. The function returns only name, public bio, avatar/profile URLs, counts, top languages, recent public contribution count, and six trimmed public repositories.
5. Only that trimmed object is sent to roadmap generation.

The resume is parsed in the browser. The raw file is not uploaded. PDF, DOCX, TXT, and Markdown are supported up to 8 MB.

## Company intelligence

`company-intel` uses OpenAI web search to return:

- current employees relevant to the selected role;
- verified events strictly after the current date;
- recent company or field updates;
- a direct public source URL for every item.

The function instructs the model to omit anything it cannot source. Without an OpenAI key, the dashboard shows an explicit research-ready state rather than fabricated names, events, or news.

## Recommendation quality

The roadmap prompt rejects generic portfolio sites, clones, toy CRUD apps, vague “AI-powered” ideas, invented company facts, and unverifiable claims. Projects must:

- solve a concrete sub-problem connected to the mission;
- use the student’s actual skills and resume evidence;
- incorporate only the trimmed GitHub profile;
- produce a working artifact and a 90-second demo;
- include customer or domain evidence;
- progress from research, to a prototype, to a field experiment;
- be feasible in two to eight weeks.

## Logos

Company marks are downloaded into `public/logos` rather than loaded from generic photography. Sources and trademark notes are recorded in `public/logos/SOURCES.md`.

## Verification

```bash
npm run typecheck
npm run lint
npm run build
npm audit --audit-level=high
```

The browser test fixture at `test-fixtures/demo-resume.txt` exercises local resume extraction during end-to-end testing.
