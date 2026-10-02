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
2. Pick interests and say what you study or do.
3. Swipe five clean, logo-led mission cards.
4. Answer three progressively revealing questions about motivation, the problem worth pursuing, and why it matters.
5. Get a cinematic “we found your mission” reveal with a company, role, fit signals, and path.
6. Start a focused 30-day quest: one thing to build, one thing to learn, and one person to meet.
7. Connect GitHub through the server-safe profile boundary and watch commits turn into XP and a growing companion.
8. Flip to the employer view to see mission alignment, public proof, GitHub activity, and progress in one candidate card.

There is no signup. Profile, selection, GitHub’s trimmed response, and progress remain in the user’s browser.

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

The hackathon path is intentionally curated to five companies. It does not scrape LinkedIn, invent employee profiles, or bury the student in a giant feed.

## Recommendation quality

The primary recommendation is deterministic for demo reliability. The selected company’s mission, role archetypes, and domain-specific problem seeds power the match, project, learning step, outreach step, and employer card. Projects must:

- solve a concrete sub-problem connected to the mission;
- use the student’s actual study/work focus and motivation;
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

The complete happy path can be tested without keys by using `octocat` as the GitHub username in demo mode.
