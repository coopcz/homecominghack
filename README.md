# Northstar

Northstar helps students find a company mission they genuinely care about, turn that motivation into unusually relevant projects, and show employers verified momentum.

The demo is intentionally resilient: it works end-to-end with local browser storage before any keys are added, then switches to Supabase Auth, Postgres, AI-generated roadmaps, and verified GitHub commits when configured.

## Run the demo

```bash
npm install
cp .env.example .env
npm run dev
```

With `VITE_DEMO_MODE=true`, use **Skip to the demo** or **Continue without an account**. Data stays in that browser. This is the safest way to rehearse the presentation.

## Connect Supabase

The project is prepared for Supabase project `lejzqzqiklkcyppgdapc`.

1. Copy the project URL and publishable key from **Supabase → Project Settings → API** into `.env`.
2. Set `VITE_DEMO_MODE=false`.
3. Link and apply the migration:

   ```bash
   npx supabase link --project-ref lejzqzqiklkcyppgdapc
   npx supabase db push
   ```

4. For frictionless hackathon accounts, open **Authentication → Providers → Email** and turn **Confirm email** off. Email uniqueness is enforced by Supabase Auth and by `public.users.email`.
5. Add either OpenAI or Anthropic plus the optional GitHub token to `supabase/functions/.env` for local work:

   ```bash
   cp .env.example supabase/functions/.env
   ```

   Only keep `OPENAI_API_KEY` **or** `ANTHROPIC_API_KEY`, the matching model name, and `GITHUB_TOKEN` in that function env file. Browser values are not required there.
6. Set production secrets and deploy:

   ```bash
   npx supabase secrets set --env-file supabase/functions/.env
   npx supabase functions deploy generate-roadmap
   npx supabase functions deploy github-sync
   ```

Supabase injects its URL and server-side keys into deployed Edge Functions. Never put a secret/service-role key in a `VITE_` variable.

## What is implemented

- Mobile-first signup and onboarding for university, major, skills, interests, and target companies.
- Swipeable mission deck with curated entries for Neighbor, Redo, Waystar, Weave, and Podium.
- Three adaptive fit questions and role inference.
- Personal mission statement capture.
- AI roadmap generation through an authenticated Edge Function, supporting OpenAI first or Anthropic as a fallback provider.
- A strict roadmap prompt that rejects generic clones and demands customer evidence, a shipped artifact, a field experiment, and direct mission relevance.
- Deterministic curated roadmaps if AI is unconfigured or unavailable.
- GitHub commit verification through a server-side function, cached results for rate limits, and idempotent progress events.
- Pet evolution and manual course/outreach/project progress.
- Employer view showing mission alignment and verified activity.
- RLS-protected schema and indexes for `users`, `missions`, `roles`, `courses`, `people`, `feed_items`, `selections`, `roadmaps`, `progress_events`, and `github_connections`.

Per the brief, the `roles`, `people`, `courses`, and `feed_items` tables are created but empty. The app does not fabricate employees, future events, or job openings. Roadmap course items are learning categories unless an AI provider is confident in a stable provider name; no invented URLs are produced.

## Live demo path

1. Scan QR and choose **Skip to the demo**.
2. Enter a major, skills, and interests.
3. Swipe right on a mission.
4. Answer three questions and add a personal reason (30+ characters).
5. Show the three-project roadmap and its evidence requirements.
6. Open **Progress**, enter a GitHub username/repository, and sync.
7. Use **Employer view** in the header to show the same candidate and momentum signal.

## Verification

```bash
npm run typecheck
npm run lint
npm run build
npx supabase db lint --local
```

The last command requires the local Supabase Docker stack (`npx supabase start`).
